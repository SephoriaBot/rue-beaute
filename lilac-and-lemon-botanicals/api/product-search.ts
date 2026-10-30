import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserId } from './_lib/auth.js';
import { clientIp, throttled } from './_lib/util.js';
import { skinTypes, type Ingredient } from '../src/lib/skinIngredients.js';

export const config = { maxDuration: 60 };

type Product = {
  name: string;
  brand: string;
  url: string;
  imageUrl: string | null;
  source: 'database' | 'web';
  matches: string[]; // names of the good ingredients this product contains
};

function cleanUrl(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

function cleanText(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

// ---------- Open Beauty Facts: one query per ingredient, merged by product ----------
async function searchOpenBeautyFacts(ingredients: Ingredient[]): Promise<Product[]> {
  const byCode = new Map<string, Product>();

  await Promise.allSettled(
    ingredients.map(async (ing) => {
      const params = new URLSearchParams({
        ingredients_tags: `en:${ing.tag}`,
        fields: 'code,product_name,brands,image_front_small_url',
        page_size: '40',
        json: '1',
      });
      const r = await fetch(`https://world.openbeautyfacts.org/api/v2/search?${params}`, {
        headers: { 'User-Agent': 'RueBeaute/1.0 (ingredient finder)' },
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) return;
      const data = (await r.json()) as { products?: Record<string, unknown>[] };

      for (const p of data.products ?? []) {
        const name = cleanText(p.product_name, 150);
        const code = cleanText(p.code, 30);
        if (!name || !/^\d+$/.test(code)) continue;
        const existing = byCode.get(code);
        if (existing) {
          if (!existing.matches.includes(ing.name)) existing.matches.push(ing.name);
        } else {
          byCode.set(code, {
            name,
            brand: cleanText(p.brands, 100).split(',')[0].trim(),
            url: `https://world.openbeautyfacts.org/product/${code}`,
            imageUrl: cleanUrl(p.image_front_small_url),
            source: 'database',
            matches: [ing.name],
          });
        }
      }
    })
  );

  return [...byCode.values()];
}

// ---------- Claude + web search: products with as many of the ingredients as possible ----------
async function searchWeb(ingredients: Ingredient[]): Promise<Product[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return [];

  const names = ingredients.map((i) => i.name);

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }],
      messages: [
        {
          role: 'user',
          content:
            `Find up to 15 real, currently sold skincare products that contain as many of these ingredients as possible: ${names.join(', ')}. ` +
            `Prefer products that contain several of them. Use web search and only include products you found on a real page, with that page's URL. ` +
            `Check the ingredient list on the page when you can. Do not invent products or URLs. ` +
            `Reply with ONLY a JSON array, no other text, in this shape: ` +
            `[{"name":"product name","brand":"brand","url":"https://...","matches":["ingredient names from the list above that this product contains"]}]`,
        },
      ],
    }),
    signal: AbortSignal.timeout(55000),
  });
  if (!r.ok) {
    console.error('Anthropic search failed:', r.status);
    return [];
  }

  const data = (await r.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n');

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const out: Product[] = [];
  for (const item of parsed.slice(0, 20)) {
    const name = cleanText(item?.name, 150);
    const url = cleanUrl(item?.url);
    if (!name || !url) continue;

    // Keep only matches that are really in our list for this skin type.
    const claimed: unknown[] = Array.isArray(item?.matches) ? item.matches : [];
    const matches = names.filter((n) =>
      claimed.some((c) => typeof c === 'string' && c.toLowerCase().trim() === n.toLowerCase())
    );
    if (matches.length === 0) continue;

    out.push({ name, brand: cleanText(item?.brand, 100), url, imageUrl: null, source: 'web', matches });
  }
  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Please log in to search products.' });

  if (throttled(`product-search:${userId}:${clientIp(req)}`, 10, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many searches. Please try again in a few minutes.' });
  }

  const skinTypeValue = (req.body ?? {}).skinType;
  const skinType = skinTypes.find((s) => s.value === skinTypeValue);
  if (!skinType) return res.status(400).json({ error: 'Invalid skin type.' });

  try {
    const [db, web] = await Promise.allSettled([
      searchOpenBeautyFacts(skinType.ingredients),
      searchWeb(skinType.ingredients),
    ]);

    const all = [
      ...(db.status === 'fulfilled' ? db.value : []),
      ...(web.status === 'fulfilled' ? web.value : []),
    ];

    // De-duplicate by brand + name, merging the ingredients they match.
    const merged = new Map<string, Product>();
    for (const p of all) {
      const k = `${p.brand}|${p.name}`.toLowerCase();
      const existing = merged.get(k);
      if (existing) {
        for (const m of p.matches) if (!existing.matches.includes(m)) existing.matches.push(m);
        if (!existing.imageUrl && p.imageUrl) existing.imageUrl = p.imageUrl;
      } else {
        merged.set(k, { ...p, matches: [...p.matches] });
      }
    }

    // Most good ingredients first.
    const products = [...merged.values()]
      .sort((a, b) => b.matches.length - a.matches.length)
      .slice(0, 30);

    return res.status(200).json({ products, total: skinType.ingredients.length });
  } catch (err) {
    console.error('Product search failed:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
