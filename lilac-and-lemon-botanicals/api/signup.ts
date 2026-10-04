import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../src/lib/turso.js';
import { EMAIL_RE, clientIp, throttled } from './_lib/util.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (throttled(`signup:${clientIp(req)}`, 5, 10 * 60_000)) {
    return res.status(429).json({ error: 'Too many attempts. Please try again in a few minutes.' });
  }

  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email' });
  }

  try {
    await turso.execute({
      sql: 'INSERT INTO signups (email) VALUES (?)',
      args: [email.toLowerCase()],
    });
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    if (err?.message?.includes('UNIQUE constraint')) {
      return res.status(200).json({ ok: true }); // already signed up
    }
    console.error('Signup insert failed:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
