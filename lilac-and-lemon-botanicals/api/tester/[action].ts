import type { VercelRequest, VercelResponse } from '@vercel/node';
import { del } from '@vercel/blob';
import { handleUpload } from '@vercel/blob/client';
import { turso } from '../../src/lib/turso.js';
import { getUserId } from '../_lib/auth.js';
import { boundedJson, safeParse } from '../_lib/util.js';

// Consolidated tester endpoints. All /api/tester-* routes were merged here
// (api/tester/[action].ts) to stay under Vercel's Hobby-plan function limit.
// Dispatch is by the `action` route param, e.g. /api/tester/checkin
//
// SECURITY: every action identifies the caller from the verified Clerk token.
// A userId sent in the query string or body is never trusted (and not read).

const MAX_PHOTOS_PER_TESTER = 100;
const MAX_NOTES_CHARS = 2000;
const MAX_QUESTIONNAIRE_CHARS = 20_000;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

type Tester = {
  id: number;
  user_id: string;
  name: unknown;
  status: string;
  test_start: unknown;
  test_end: unknown;
  email: unknown;
};

function getWeekNumber(testStart: unknown): number {
  if (!testStart) return 1;
  const start = new Date(String(testStart));
  if (Number.isNaN(start.getTime())) return 1;
  const diffDays = Math.floor((Date.now() - start.getTime()) / 86400000);
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

async function findTester(userId: string): Promise<Tester | null> {
  const result = await turso.execute({
    sql: `SELECT id, user_id, email, name, status, test_start, test_end
          FROM testers WHERE user_id = ? LIMIT 1`,
    args: [userId],
  });
  const row = result.rows[0];
  return row ? ({ ...row } as unknown as Tester) : null;
}

// Signed-in AND enrolled AND active, or an error response has already been sent.
async function requireActiveTester(
  req: VercelRequest,
  res: VercelResponse
): Promise<{ userId: string; tester: Tester } | null> {
  const userId = await getUserId(req);
  if (!userId) {
    res.status(401).json({ error: 'Please sign in' });
    return null;
  }
  const tester = await findTester(userId);
  if (!tester) {
    res.status(403).json({ error: 'Your account is not currently enrolled as a tester.' });
    return null;
  }
  if (tester.status !== 'active') {
    res.status(403).json({ error: 'Your tester enrollment is not currently active.' });
    return null;
  }
  return { userId, tester };
}

function methodNotAllowed(res: VercelResponse, allow: string) {
  res.setHeader('Allow', allow);
  return res.status(405).json({ error: 'Method not allowed' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  const action = typeof req.query.action === 'string' ? req.query.action : '';

  switch (action) {
    case 'profile':
      return handleProfile(req, res);
    case 'checkin':
      return handleCheckin(req, res);
    case 'photo-upload':
      return handlePhotoUpload(req, res);
    case 'photos':
      return handlePhotos(req, res);
    case 'products':
      return handleProducts(req, res);
    case 'stats':
      return handleStats(req, res);
    case 'questionnaire':
      return handleQuestionnaire(req, res);
    default:
      return res.status(404).json({ error: 'Unknown tester endpoint.' });
  }
}

// GET /api/tester/profile
async function handleProfile(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, 'GET');

  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Please sign in' });

  try {
    const result = await turso.execute({
      sql: `SELECT id, user_id, name, status, test_start, test_end
            FROM testers WHERE user_id = ? LIMIT 1`,
      args: [userId],
    });
    return res.status(200).json({ tester: result.rows[0] ?? null });
  } catch (err) {
    console.error('Tester lookup failed:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

// GET/POST /api/tester/checkin
async function handleCheckin(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return methodNotAllowed(res, 'GET, POST');

  try {
    const auth = await requireActiveTester(req, res);
    if (!auth) return;
    const { tester } = auth;

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS tester_checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tester_id INTEGER NOT NULL,
        week_number INTEGER NOT NULL,
        after_use_feel TEXT NOT NULL,
        daytime_feel TEXT NOT NULL,
        hydration INTEGER NOT NULL,
        breakouts INTEGER NOT NULL,
        sensitivity INTEGER NOT NULL,
        notes TEXT,
        submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tester_id, week_number)
      )
    `);

    const weekNumber = getWeekNumber(tester.test_start);

    if (req.method === 'GET') {
      const result = await turso.execute({
        sql: `SELECT id, tester_id, week_number, after_use_feel, daytime_feel,
                     hydration, breakouts, sensitivity, notes, submitted_at
              FROM tester_checkins
              WHERE tester_id = ? AND week_number = ?
              LIMIT 1`,
        args: [tester.id, weekNumber],
      });

      return res.status(200).json({
        tester,
        weekNumber,
        checkin: result.rows[0] ?? null,
      });
    }

    const { afterUseFeel, daytimeFeel, hydration, breakouts, sensitivity, notes } = req.body ?? {};

    const validFeels = ['dry_tight', 'comfortable', 'oily'];
    const validScore = (value: unknown) =>
      typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;

    if (!validFeels.includes(afterUseFeel) || !validFeels.includes(daytimeFeel)) {
      return res.status(400).json({ error: 'Please answer both skin-feel questions.' });
    }

    if (!validScore(hydration) || !validScore(breakouts) || !validScore(sensitivity)) {
      return res.status(400).json({
        error: 'Please rate hydration, breakouts, and sensitivity from 1 to 5.',
      });
    }

    if (notes !== undefined && notes !== null && (typeof notes !== 'string' || notes.length > MAX_NOTES_CHARS)) {
      return res.status(400).json({ error: `Notes must be ${MAX_NOTES_CHARS} characters or fewer.` });
    }

    await turso.execute({
      sql: `
        INSERT INTO tester_checkins
          (tester_id, week_number, after_use_feel, daytime_feel, hydration, breakouts, sensitivity, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(tester_id, week_number) DO UPDATE SET
          after_use_feel = excluded.after_use_feel,
          daytime_feel = excluded.daytime_feel,
          hydration = excluded.hydration,
          breakouts = excluded.breakouts,
          sensitivity = excluded.sensitivity,
          notes = excluded.notes,
          submitted_at = CURRENT_TIMESTAMP
      `,
      args: [
        tester.id,
        weekNumber,
        afterUseFeel,
        daytimeFeel,
        hydration,
        breakouts,
        sensitivity,
        typeof notes === 'string' ? notes.trim() || null : null,
      ],
    });

    return res.status(200).json({ ok: true, weekNumber });
  } catch (err) {
    console.error('Tester check-in failed:', err);
    return res.status(500).json({ error: 'Something went wrong saving your check-in.' });
  }
}

// POST /api/tester/photo-upload (Vercel Blob client upload handshake)
async function handlePhotoUpload(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // Only active, signed-in testers can get an upload token.
        const userId = await getUserId(req);
        if (!userId) throw new Error('Please sign in');

        const tester = await findTester(userId);
        if (!tester || tester.status !== 'active') {
          throw new Error('Your account is not an active tester');
        }

        // Uploads must live under this user's own prefix.
        if (!pathname.startsWith(`tester-photos/${userId}-`)) {
          throw new Error('Invalid upload path');
        }

        const count = await turso.execute({
          sql: 'SELECT COUNT(*) AS n FROM tester_photos WHERE tester_id = ?',
          args: [tester.id],
        });
        if (Number(count.rows[0]?.n ?? 0) >= MAX_PHOTOS_PER_TESTER) {
          throw new Error('Photo limit reached. Please delete some photos first.');
        }

        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Tester photo uploaded:', blob.pathname);
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (err) {
    console.error('Tester photo upload failed:', err);
    // These messages are ones we wrote above, so they're safe to show.
    const message = err instanceof Error ? err.message : '';
    const safe = [
      'Please sign in',
      'Your account is not an active tester',
      'Invalid upload path',
      'Photo limit reached. Please delete some photos first.',
    ];
    return res.status(400).json({ error: safe.includes(message) ? message : 'Could not start the upload.' });
  }
}

// An image URL is only accepted if it is a Vercel Blob URL under THIS user's upload prefix.
function isOwnBlobUrl(imageUrl: string, userId: string): boolean {
  try {
    const u = new URL(imageUrl);
    return (
      u.protocol === 'https:' &&
      u.hostname.endsWith('.public.blob.vercel-storage.com') &&
      u.pathname.startsWith(`/tester-photos/${userId}-`)
    );
  } catch {
    return false;
  }
}

// GET/POST/DELETE /api/tester/photos
async function handlePhotos(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'DELETE') {
    return methodNotAllowed(res, 'GET, POST, DELETE');
  }

  try {
    const auth = await requireActiveTester(req, res);
    if (!auth) return;
    const { userId, tester } = auth;

    // DELETE PHOTO
    if (req.method === 'DELETE') {
      const photoId = Number(req.body?.photoId);
      if (!Number.isInteger(photoId) || photoId <= 0) {
        return res.status(400).json({ error: 'Invalid photo ID.' });
      }

      const photoResult = await turso.execute({
        sql: 'SELECT id, image_url FROM tester_photos WHERE id = ? AND tester_id = ? LIMIT 1',
        args: [photoId, tester.id],
      });
      const photo = photoResult.rows[0];
      if (!photo) return res.status(404).json({ error: 'Photo not found.' });

      // Delete the actual image from Vercel Blob (don't let a missing file block cleanup).
      try {
        await del(String(photo.image_url));
      } catch (err) {
        console.error('Blob delete failed:', err);
      }

      await turso.execute({
        sql: 'DELETE FROM tester_photos WHERE id = ? AND tester_id = ?',
        args: [photoId, tester.id],
      });

      return res.status(200).json({ ok: true });
    }

    // GET PHOTOS
    if (req.method === 'GET') {
      const result = await turso.execute({
        sql: `SELECT id, photo_type, image_url, uploaded_at
              FROM tester_photos WHERE tester_id = ? ORDER BY uploaded_at DESC`,
        args: [tester.id],
      });
      return res.status(200).json({ photos: result.rows });
    }

    // POST PHOTO
    const { photoType, imageUrl } = req.body ?? {};

    if (!['baseline', 'progress'].includes(photoType)) {
      return res.status(400).json({ error: 'Invalid photo type.' });
    }
    if (typeof imageUrl !== 'string' || imageUrl.length > 1000 || !isOwnBlobUrl(imageUrl.trim(), userId)) {
      return res.status(400).json({ error: 'Invalid image URL.' });
    }

    const count = await turso.execute({
      sql: 'SELECT COUNT(*) AS n FROM tester_photos WHERE tester_id = ?',
      args: [tester.id],
    });
    if (Number(count.rows[0]?.n ?? 0) >= MAX_PHOTOS_PER_TESTER) {
      return res.status(429).json({ error: 'Photo limit reached. Please delete some photos first.' });
    }

    const result = await turso.execute({
      sql: 'INSERT INTO tester_photos (tester_id, photo_type, image_url) VALUES (?, ?, ?)',
      args: [tester.id, photoType, imageUrl.trim()],
    });

    return res.status(200).json({ ok: true, id: Number(result.lastInsertRowid) });
  } catch (err) {
    console.error('Tester photos request failed:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// GET /api/tester/products
async function handleProducts(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, 'GET');

  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Please sign in' });

  try {
    const result = await turso.execute({
      sql: `
        SELECT tp.id AS assignment_id, p.id, p.name, p.description, p.swatch_color, p.size_oz, p.price
        FROM tester_products tp
        JOIN testers t ON t.id = tp.tester_id
        JOIN products p ON p.id = tp.product_id
        WHERE t.user_id = ?
        ORDER BY p.sort_order
      `,
      args: [userId],
    });
    return res.status(200).json({ products: result.rows });
  } catch (err) {
    console.error('Tester products lookup failed:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

// GET /api/tester/stats
async function handleStats(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, 'GET');

  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Please sign in' });

  try {
    const result = await turso.execute({
      sql: `
        SELECT
          (SELECT COUNT(*) FROM tester_checkins tc WHERE tc.tester_id = t.id) AS checkins,
          (SELECT COUNT(*) FROM tester_photos tp WHERE tp.tester_id = t.id) AS photos
        FROM testers t
        WHERE t.user_id = ?
        LIMIT 1
      `,
      args: [userId],
    });

    return res.status(200).json({
      checkins: Number(result.rows[0]?.checkins ?? 0),
      photos: Number(result.rows[0]?.photos ?? 0),
    });
  } catch (err) {
    console.error('Tester stats lookup failed:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

// GET/POST /api/tester/questionnaire
async function handleQuestionnaire(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return methodNotAllowed(res, 'GET, POST');

  try {
    const auth = await requireActiveTester(req, res);
    if (!auth) return;
    const { tester } = auth;

    if (req.method === 'GET') {
      const result = await turso.execute({
        sql: `SELECT answers, completed_at, updated_at
              FROM tester_questionnaires WHERE tester_id = ? LIMIT 1`,
        args: [tester.id],
      });

      const row = result.rows[0];
      if (!row) return res.status(200).json({ questionnaire: null });

      return res.status(200).json({
        questionnaire: {
          answers: safeParse(row.answers),
          completedAt: row.completed_at,
          updatedAt: row.updated_at,
        },
      });
    }

    const answers = req.body?.answers;
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      return res.status(400).json({ error: 'Questionnaire answers are required.' });
    }
    const answersJson = boundedJson(answers, MAX_QUESTIONNAIRE_CHARS);
    if (!answersJson) {
      return res.status(400).json({ error: 'Your answers are too long. Please shorten them.' });
    }

    await turso.execute({
      sql: `
        INSERT INTO tester_questionnaires (tester_id, answers, completed_at, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(tester_id) DO UPDATE SET
          answers = excluded.answers,
          updated_at = CURRENT_TIMESTAMP
      `,
      args: [tester.id, answersJson],
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Tester questionnaire request failed:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}
