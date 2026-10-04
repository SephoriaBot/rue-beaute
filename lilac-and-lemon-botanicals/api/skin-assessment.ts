import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../src/lib/turso.js';
import { getUserId } from './_lib/auth.js';
import { boundedJson, safeParse } from './_lib/util.js';

const MAX_JSON_CHARS = 20_000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Identity comes from the verified sign-in token, never from the request.
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Please sign in' });

  if (req.method === 'GET') {
    try {
      const result = await turso.execute({
        sql: 'SELECT answers, result, updated_at FROM skin_assessments WHERE user_id = ?',
        args: [userId],
      });

      const row = result.rows[0];
      if (!row) return res.status(200).json({ assessment: null });

      return res.status(200).json({
        assessment: {
          answers: safeParse(row.answers),
          result: safeParse(row.result),
          updatedAt: row.updated_at,
        },
      });
    } catch (err) {
      console.error('Skin assessment fetch failed:', err);
      return res.status(500).json({ error: 'Something went wrong' });
    }
  }

  const { answers, result } = req.body ?? {};
  if (!answers || !result || typeof answers !== 'object' || typeof result !== 'object') {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const answersJson = boundedJson(answers, MAX_JSON_CHARS);
  const resultJson = boundedJson(result, MAX_JSON_CHARS);
  if (!answersJson || !resultJson) {
    return res.status(400).json({ error: 'Assessment is too large' });
  }

  try {
    await turso.execute({
      sql: `
        INSERT INTO skin_assessments (user_id, answers, result, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
          answers = excluded.answers,
          result = excluded.result,
          updated_at = CURRENT_TIMESTAMP
      `,
      args: [userId, answersJson, resultJson],
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Skin assessment save failed:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
