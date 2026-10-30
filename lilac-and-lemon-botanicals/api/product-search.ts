
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
  source: 'database';
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
  if (/cleanser|cleansing|face wash|facial wash/.test(name)) return 'Cleansers';
  if (/toner|essence|mist/.test(name)) return 'Toners';
  if (/exfoliat|peel|scrub|resurfacing/.test(name)) return 'Exfoliators';
  if (/mask|masque/.test(name)) return 'Masks';
  if (/eye cream|eye serum|eye gel|eye treatment/.test(name)) return 'Eye Care';
  if (/serum|treatment|ampoule|spot corrector/.test(name)) return 'Serums & Treatments';
  if (/moistur|cream|lotion|gel cream|face oil|facial oil|balm/.test(name)) return 'Moisturizers';

  return 'Other';
}

function makeReason(matches: string[]): string {
  return matches.length === 1
    ? 'Contains an ingredient selected for your skin profile.'
    : `Contains ${matches.length} ingredients selected for your skin profile.`;
}

function getIngredients(
  skinTypeValue: string,
  sensitive: boolean,
  concernValues: string[]
): Ingredient[] {
  const primary = skinTypes.find((s) => s.value === skinTypeValue);
  if (!primary) return [];

  const selectedConcerns = skinConcerns.filter((concern) =>
    concernValues.includes(concern.value)
  );

  const all = [
    ...primary.ingredients,
    ...(sensitive ? sensitiveIngredients : []),
    ...selectedConcerns.flatMap((concern) => concern.ingredients),
  ];

  const unique = new Map<string, Ingredient>();

  for (const ingredient of all) {
    if (!unique.has(ingredient.tag)) {
      unique.set(ingredient.tag, ingredient);
    }
  }

  return [...unique.values()];
}

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
  const skinType = skinTypes.find((s) => s.value === body.skinType);
  const sensitive = body.sensitive === true;

  const requestedConcerns: string[] = Array.isArray(body.concerns)
    ? body.concerns.filter(
        (value: unknown): value is string => typeof value === 'string'
      )
    : [];

  if (!skinType) {
    return res.status(400).json({
      error: 'Please select a valid skin type.',
    });
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
    const products = await searchOpenBeautyFacts(ingredients);

    
const ranked = products
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
  // Prioritize the actual number of matches, not just the percentage.
  .sort((a, b) => {
    if (b.matches.length !== a.matches.length) {
      return b.matches.length - a.matches.length;
    }

    return b.score - a.score;
  })
  .slice(0, 60);


    return res.status(200).json({
      products: ranked,
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
