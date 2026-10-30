import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserId } from './_lib/auth.js';
import { clientIp, throttled } from './_lib/util.js';
import {
  skinTypes,
  skinConcerns,
  sensitiveIngredients,
  type Ingredient,
} from '../src/lib/skinIngredients.js';

export const config = { maxDuration: 60 };

type ProductCategory =
  | 'Cleansers'
  | 'Toners'
  | 'Serums & Treatments'
  | 'Moisturizers'
  | 'Exfoliators'
  | 'Sunscreens'
  | 'Masks'
  | 'Eye Care'
  | 'Other';

type Product = {
  name: string;
  brand: string;
  url: string;
  imageUrl: string | null;
  source: 'database' | 'web';
  matches: string[];
  category: ProductCategory;
  score: number;
  reason: string;
};

function cleanUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function getCategory(value: string): ProductCategory {
  const name = value.toLowerCase();

  if (/sunscreen|sun screen|spf|sun protection/.test(name)) return 'Sunscreens';
  if (/cleanser|cleansing|face wash|facial wash|cleansing oil|cleansing balm/.test(name)) return 'Cleansers';
  if (/toner|essence|mist/.test(name)) return 'Toners';
  if (/exfoliat|peel|scrub|resurfacing/.test(name)) return 'Exfoliators';
  if (/mask|masque/.test(name)) return 'Masks';
  if (/eye cream|eye serum|eye gel|eye treatment/.test(name)) return 'Eye Care';
  if (/serum|treatment|ampoule|retinol|spot corrector/.test(name)) return 'Serums & Treatments';
  if (/moistur|cream|lotion|gel cream|face oil|facial oil|balm/.test(name)) return 'Moisturizers';

  return 'Other';
}

function makeReason(matches: string[]): string {
  if (matches.length >= 4) {
    return `Contains ${matches.length} ingredients selected for your skin profile.`;
  }

  if (matches.length >= 2) {
    return `Contains ${matches.length} ingredients selected for your skin profile.`;
  }

  return 'Contains an ingredient selected for your skin profile.';
}

function getIngredients(
  skinTypeValue: string,
  sensitive: boolean,
  concernValues: string[]
): Ingredient[] {
  const primary = skinTypes.find((s) => s.value === skinTypeValue);
  if (!primary) return [];

  const selectedConcerns = skinConcerns.filter((c) =>
    concernValues.includes(c.value)
  );

  const all = [
    ...primary.ingredients,
    ...(sensitive ? sensitiveIngredients : []),
    ...selectedConcerns.flatMap((c) => c.ingredients),
  ];

  const unique = new Map<string, Ingredient>();

  for (const ingredient of all) {
    if (!unique.has(ingredient.tag)) {
      unique.set(ingredient.tag, ingredient);
    }
  }

  return [...unique.values()];
}

// ---------- Open Beauty Facts ----------
async function searchOpenBeautyFacts(
  ingredients: Ingredient[]
): Promise<Product[]> {
  const byCode = new Map<string, Product>();

  await Promise.allSettled(
    ingredients.map(async (ingredient) => {
      const params = new URLSearchParams({
        ingredients_tags: `en:${ingredient.tag}`,
        fields: 'code,product_name,brands,image_front_small_url,categories',
        page_size: '40',
        json: '1',
      });

      const response = await fetch(
        `https://world.openbeautyfacts.org/api/v2/search?${params}`,
        {
          headers: {
            'User-Agent': 'RueBeaute/1.0 (ingredient finder)',
          },
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!response.ok) return;

      const data = (await response.json()) as {
        products?: Record<string, unknown>[];
      };

      for (const product of data.products ?? []) {
        const name = cleanText(product.product_name, 150);
        const code = cleanText(product.code, 30);

        if (!name || !/^\d+$/.test(code)) continue;

        const existing = byCode.get(code);

        if (existing) {
          if (!existing.matches.includes(ingredient.name)) {
            existing.matches.push(ingredient.name);
          }
        } else {
          byCode.set(code, {
            name,
            brand: cleanText(product.brands, 100).split(',')[0].trim(),
            url: `https://world.openbeautyfacts.org/product/${code}`,
            imageUrl: cleanUrl(product.image_front_small_url),
            source: 'database',
            matches: [ingredient.name],
            category: getCategory(
              `${name} ${cleanText(product.categories, 300)}`
            ),
            score: 0,
            reason: '',
          });
        }
      }
    })
  );

  return [...byCode.values()];
}

// ---------- Anthropic web search ----------
async function searchWeb(ingredients: Ingredient[]): Promise<Product[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return [];

  const names = ingredients.map((ingredient) => ingredient.name);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 6,
        },
      ],
      messages: [
        {
          role: 'user',
          content:
            `Find up to 20 real skincare products currently sold online. ` +
            `Look for products containing as many of these ingredients as possible: ${names.join(', ')}. ` +
            `Use web search. Only include products found on real product pages. ` +
            `Check the product ingredient list whenever possible. ` +
            `Do not guess ingredient matches, product names, categories, or URLs. ` +
            `Only list an ingredient in matches if it appears in the product ingredient list. ` +
            `Assign each product one category from this list: Cleansers, Toners, Serums & Treatments, Moisturizers, Exfoliators, Sunscreens, Masks, Eye Care, Other. ` +
            `Reply with ONLY a JSON array in this format: ` +
            `[{"name":"product name","brand":"brand","url":"https://...","category":"Serums & Treatments","matches":["ingredient names from the supplied list"]}]`,
        },
      ],
    }),
    signal: AbortSignal.timeout(55000),
  });

  if (!response.ok) {
    console.error('Anthropic search failed:', response.status);
    return [];
  }

  const data = (await response.json()) as {
    content?: { type: string; text?: string }[];
  };

  const text = (data.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
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

  const validCategories: ProductCategory[] = [
    'Cleansers',
    'Toners',
    'Serums & Treatments',
    'Moisturizers',
    'Exfoliators',
    'Sunscreens',
    'Masks',
    'Eye Care',
    'Other',
  ];

  const output: Product[] = [];

  for (const item of parsed.slice(0, 20)) {
    const name = cleanText(item?.name, 150);
    const url = cleanUrl(item?.url);

    if (!name || !url) continue;

    const claimed: unknown[] = Array.isArray(item?.matches)
      ? item.matches
      : [];

    const matches = names.filter((ingredientName) =>
      claimed.some(
        (value) =>
          typeof value === 'string' &&
          value.toLowerCase().trim() === ingredientName.toLowerCase()
      )
    );

    if (matches.length === 0) continue;

    const suppliedCategory = cleanText(item?.category, 60);
    const category = validCategories.includes(
      suppliedCategory as ProductCategory
    )
      ? (suppliedCategory as ProductCategory)
      : getCategory(name);

    output.push({
      name,
      brand: cleanText(item?.brand, 100),
      url,
      imageUrl: null,
      source: 'web',
      matches,
      category,
      score: 0,
      reason: '',
    });
  }

  return output;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await getUserId(req);

  if (!userId) {
    return res.status(401).json({
      error: 'Please log in to search products.',
    });
  }

  if (
    throttled(
      `product-search:${userId}:${clientIp(req)}`,
      10,
      10 * 60 * 1000
    )
  ) {
    return res.status(429).json({
      error: 'Too many searches. Please try again in a few minutes.',
    });
  }

  const body = req.body ?? {};
  const skinTypeValue = body.skinType;
  const sensitive = body.sensitive === true;
  const requestedConcerns = Array.isArray(body.concerns)
    ? body.concerns.filter((value: unknown): value is string =>
        typeof value === 'string'
      )
    : [];

  const skinType = skinTypes.find((type) => type.value === skinTypeValue);

  if (!skinType) {
    return res.status(400).json({ error: 'Please select a valid skin type.' });
  }

  const validConcerns = skinConcerns
    .filter((concern) => requestedConcerns.includes(concern.value))
    .map((concern) => concern.value);

  const ingredients = getIngredients(
    skinType.value,
    sensitive,
    validConcerns
  );

  if (ingredients.length === 0) {
    return res.status(400).json({
      error: 'No ingredients were found for this skin profile.',
    });
  }

  try {
    const [databaseResult, webResult] = await Promise.allSettled([
      searchOpenBeautyFacts(ingredients),
      searchWeb(ingredients),
    ]);

    const allProducts = [
      ...(databaseResult.status === 'fulfilled'
        ? databaseResult.value
        : []),
      ...(webResult.status === 'fulfilled' ? webResult.value : []),
    ];

    const merged = new Map<string, Product>();

    for (const product of allProducts) {
      const key = `${product.brand}|${product.name}`.toLowerCase();
      const existing = merged.get(key);

      if (existing) {
        for (const ingredient of product.matches) {
          if (!existing.matches.includes(ingredient)) {
            existing.matches.push(ingredient);
          }
        }

        if (!existing.imageUrl && product.imageUrl) {
          existing.imageUrl = product.imageUrl;
        }

        if (existing.category === 'Other' && product.category !== 'Other') {
          existing.category = product.category;
        }

        if (product.source === 'database') {
          existing.source = 'database';
        }
      } else {
        merged.set(key, {
          ...product,
          matches: [...product.matches],
        });
      }
    }

    const products = [...merged.values()]
      .map((product) => {
        const score = Math.round(
          (product.matches.length / ingredients.length) * 100
        );

        return {
          ...product,
          score,
          reason: makeReason(product.matches),
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.matches.length - a.matches.length;
      })
      .slice(0, 60);

    return res.status(200).json({
      products,
      total: ingredients.length,
      profile: {
        skinType: skinType.value,
        sensitive,
        concerns: validConcerns,
      },
    });
  } catch (error) {
    console.error('Product search failed:', error);

    return res.status(500).json({
      error: 'Something went wrong while searching for products.',
    });
  }
}