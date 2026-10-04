import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../src/lib/turso.js';
import { EMAIL_RE, clientIp, readText, throttled } from './_lib/util.js';

const MAX_LINE_ITEMS = 20;
const MAX_QTY = 10;
const MAX_ORDERS_PER_EMAIL_PER_HOUR = 5;
const MAX_ORDERS_PER_HOUR = 300;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (throttled(`order:${clientIp(req)}`, 10, 10 * 60_000)) {
    return res.status(429).json({ error: 'Too many attempts. Please try again in a few minutes.' });
  }

  const b = req.body ?? {};
  const name = readText(b.name, 100);
  const email = readText(b.email, 254);
  const address = readText(b.address, 200);
  const city = readText(b.city, 100);
  const state = readText(b.state, 50);
  const zip = readText(b.zip, 20);
  const notes = readText(b.notes, 1000);

  if (!name || !email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid name and email' });
  }
  if (!address || !city || !state || !zip) {
    return res.status(400).json({ error: 'Please complete the shipping address' });
  }
  if (notes === undefined) {
    return res.status(400).json({ error: 'Notes are too long' });
  }
  if (!Array.isArray(b.items) || b.items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty' });
  }
  if (b.items.length > MAX_LINE_ITEMS) {
    return res.status(400).json({ error: 'Too many items in one order' });
  }

  // Merge duplicate lines and validate quantities.
  const wanted = new Map<number, number>();
  for (const it of b.items) {
    const id = Number(it?.id);
    const qty = Number(it?.quantity);
    if (!Number.isInteger(id) || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      return res.status(400).json({ error: 'Your cart has an invalid item' });
    }
    wanted.set(id, Math.min(MAX_QTY, (wanted.get(id) ?? 0) + qty));
  }

  try {
    // Prices come from OUR products table, never from the browser.
    const ids = [...wanted.keys()];
    const found = await turso.execute({
      sql: `SELECT id, name, price FROM products WHERE id IN (${ids.map(() => '?').join(',')})`,
      args: ids,
    });
    if (found.rows.length !== ids.length) {
      return res.status(400).json({ error: 'One of the items in your cart is no longer available' });
    }

    const items = found.rows.map((row) => {
      const id = Number(row.id);
      return { id, name: String(row.name), price: Number(row.price), quantity: wanted.get(id)! };
    });
    const subtotal = Math.round(items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100;

    // Durable spam limits (these survive server restarts).
    const normalizedEmail = email.toLowerCase();
    const recent = await turso.execute({
      sql: `SELECT
              (SELECT COUNT(*) FROM orders WHERE email = ? AND created_at > datetime('now', '-1 hour')) AS mine,
              (SELECT COUNT(*) FROM orders WHERE created_at > datetime('now', '-1 hour')) AS everyone`,
      args: [normalizedEmail],
    });
    const counts = recent.rows[0];
    if (
      Number(counts?.mine ?? 0) >= MAX_ORDERS_PER_EMAIL_PER_HOUR ||
      Number(counts?.everyone ?? 0) >= MAX_ORDERS_PER_HOUR
    ) {
      return res.status(429).json({ error: 'We are getting a lot of orders right now. Please try again later.' });
    }

    await turso.execute({
      sql: `INSERT INTO orders (name, email, address, city, state, zip, notes, items_json, subtotal, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'reserved')`,
      args: [name, normalizedEmail, address, city, state, zip, notes ?? '', JSON.stringify(items), subtotal],
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Order insert failed:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
