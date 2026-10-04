import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../src/lib/turso.js';
import { getUserId } from './_lib/auth.js';
import { EMAIL_RE, readText, safeParse } from './_lib/util.js';

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
      const [profileResult, skinResult] = await Promise.all([
        turso.execute({
          sql: `SELECT full_name, email, address, city, state, zip,
                       card_brand, card_last4, card_exp_month, card_exp_year, card_holder
                FROM account_profiles WHERE user_id = ?`,
          args: [userId],
        }),
        turso.execute({
          sql: 'SELECT result, updated_at FROM skin_assessments WHERE user_id = ?',
          args: [userId],
        }),
      ]);

      const profileRow = profileResult.rows[0];
      const skinRow = skinResult.rows[0];
      const skin = skinRow ? safeParse(skinRow.result) : null;

      return res.status(200).json({
        profile: profileRow
          ? {
              fullName: profileRow.full_name ?? '',
              email: profileRow.email ?? '',
              address: profileRow.address ?? '',
              city: profileRow.city ?? '',
              state: profileRow.state ?? '',
              zip: profileRow.zip ?? '',
              cardHolder: profileRow.card_holder ?? '',
              cardBrand: profileRow.card_brand ?? '',
              cardLast4: profileRow.card_last4 ?? '',
              cardExpMonth: profileRow.card_exp_month ?? '',
              cardExpYear: profileRow.card_exp_year ?? '',
            }
          : null,
        skinAssessment:
          skinRow && skin && typeof skin === 'object'
            ? { ...(skin as object), updatedAt: skinRow.updated_at }
            : null,
      });
    } catch (err) {
      console.error('Account fetch failed:', err);
      return res.status(500).json({ error: 'Something went wrong' });
    }
  }

  const b = req.body ?? {};
  const fullName = readText(b.fullName, 100);
  const email = readText(b.email, 254);
  const address = readText(b.address, 200);
  const city = readText(b.city, 100);
  const state = readText(b.state, 50);
  const zip = readText(b.zip, 20);
  const cardHolder = readText(b.cardHolder, 100);
  const cardBrand = readText(b.cardBrand, 30);
  const cardLast4 = readText(b.cardLast4, 4);
  const cardExpMonth = readText(b.cardExpMonth, 2);
  const cardExpYear = readText(b.cardExpYear, 4);

  const fields = [fullName, email, address, city, state, zip, cardHolder, cardBrand, cardLast4, cardExpMonth, cardExpYear];
  if (fields.some((f) => f === undefined)) {
    return res.status(400).json({ error: 'One of the fields is too long or invalid' });
  }
  if (email && !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email' });
  }

  // Never persist anything that looks like a full card number or a CVC: only a
  // last-4 digit string, a month, and a year are accepted.
  const safeLast4 = cardLast4 && /^\d{4}$/.test(cardLast4) ? cardLast4 : null;
  const safeMonth = cardExpMonth && /^(0?[1-9]|1[0-2])$/.test(cardExpMonth) ? cardExpMonth : null;
  const safeYear = cardExpYear && /^\d{2}(\d{2})?$/.test(cardExpYear) ? cardExpYear : null;

  try {
    await turso.execute({
      sql: `
        INSERT INTO account_profiles
          (user_id, full_name, email, address, city, state, zip,
           card_holder, card_brand, card_last4, card_exp_month, card_exp_year, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
          full_name = excluded.full_name,
          email = excluded.email,
          address = excluded.address,
          city = excluded.city,
          state = excluded.state,
          zip = excluded.zip,
          card_holder = excluded.card_holder,
          card_brand = excluded.card_brand,
          card_last4 = excluded.card_last4,
          card_exp_month = excluded.card_exp_month,
          card_exp_year = excluded.card_exp_year,
          updated_at = CURRENT_TIMESTAMP
      `,
      args: [
        userId,
        fullName ?? null,
        email ?? null,
        address ?? null,
        city ?? null,
        state ?? null,
        zip ?? null,
        cardHolder ?? null,
        cardBrand ?? null,
        safeLast4,
        safeMonth,
        safeYear,
      ],
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Account save failed:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
