import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../src/lib/turso.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const result = await turso.execute('SELECT * FROM products ORDER BY sort_order');
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Products fetch failed:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
