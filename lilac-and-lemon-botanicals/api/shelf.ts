import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../src/lib/turso.js';
import { getUserId } from './_lib/auth.js';
import { boundedJson, safeParse } from './_lib/util.js';

const MAX_BRANDS = 30;
const MAX_PRODUCTS = 50;

function cleanBrand(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, 80) : null;
}

function cleanProduct(v: unknown) {
  if (!v || typeof v !== 'object') return null;
  const p = v as Record<string, unknown>;
  if (typeof p.name !== 'string' || typeof p.brand !== 'string') return null;
  return {
    name: p.name.slice(0, 150),
    brand: p.brand.slice(0, 100),
    imageUrl: typeof p.imageUrl === 'string' ? p.imageUrl.slice(0, 500) : null,
    tags: Array.isArray(p.tags)
      ? p.tags.filter((t): t is string => typeof t === 'string').slice(0, 200)
      : [],
    text: typeof p.text === 'string' ? p.text.slice(0, 1500) : '',
  };
}

function cleanList<T>(v: unknown, clean: (x: unknown) => T | null, max: number): T[] {
  if (!Array.isArray(v)) return [];
  return v.map(clean).filter((x): x is T => x !== null).slice(0, max);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET' && req.method !== 'PUT') {
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Identity comes from the verified sign-in token, never from the request.
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Please sign in' });

  try {
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS user_shelf (
        user_id TEXT PRIMARY KEY,
        brands_json TEXT NOT NULL DEFAULT '[]',
        products_json TEXT NOT NULL DEFAULT '[]',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    if (req.method === 'GET') {
      const result = await turso.execute({
        sql: 'SELECT brands_json, products_json FROM user_shelf WHERE user_id = ?',
        args: [userId],
      });
      const row = result.rows[0];
      if (!row) return res.status(200).json({ saved: false, brands: [], products: [] });
      return res.status(200).json({
        saved: true,
        brands: cleanList(safeParse(row.brands_json), cleanBrand, MAX_BRANDS),
        products: cleanList(safeParse(row.products_json), cleanProduct, MAX_PRODUCTS),
      });
    }

    const b = req.body ?? {};
    const brands = cleanList(b.brands, cleanBrand, MAX_BRANDS);
    const products = cleanList(b.products, cleanProduct, MAX_PRODUCTS);

    const brandsJson = boundedJson(brands, 10_000);
    const productsJson = boundedJson(products, 250_000);
    if (!brandsJson || !productsJson) {
      return res.status(400).json({ error: 'Too much data to save' });
    }

    await turso.execute({
      sql: `
        INSERT INTO user_shelf (user_id, brands_json, products_json, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
          brands_json = excluded.brands_json,
          products_json = excluded.products_json,
          updated_at = CURRENT_TIMESTAMP
      `,
      args: [userId, brandsJson, productsJson],
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Shelf request failed:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
