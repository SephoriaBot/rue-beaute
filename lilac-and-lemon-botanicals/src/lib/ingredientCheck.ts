import { getProfileIngredients, type Ingredient } from './skinIngredients';

export type CheckProduct = {
  name: string;
  brand: string;
  imageUrl: string | null;
  tags: string[];
  text: string;
};

export type Verdict = 'great' | 'good' | 'okay' | 'limited' | 'unknown';

export type CheckResult = {
  verdict: Verdict;
  label: string;
  hits: Ingredient[];
  flags: string[];
  note: string;
};

export const verdictRank: Record<Verdict, number> = {
  great: 4,
  good: 3,
  okay: 2,
  limited: 1,
  unknown: 0,
};

const LABELS: Record<Verdict, string> = {
  great: 'Strong fit',
  good: 'Good fit',
  okay: 'Partial fit',
  limited: 'Weak fit',
  unknown: 'No ingredient data',
};

function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const ALLERGENS = [
  'limonene',
  'linalool',
  'citronellol',
  'geraniol',
  'citral',
  'eugenol',
  'hexyl cinnamal',
  'benzyl salicylate',
  'coumarin',
];

const WATCH: { label: string; test: (s: string) => boolean }[] = [
  { label: 'Fragrance', test: (s) => s === 'parfum' || s === 'fragrance' },
  {
    label: 'Denatured alcohol',
    test: (s) => s === 'alcohol denat' || s === 'alcohol',
  },
  { label: 'Fragrance allergens', test: (s) => ALLERGENS.includes(s) },
  {
    label: 'Essential oils',
    test: (s) =>
      /^(lavandula|mentha|eucalyptus|citrus|cymbopogon|cinnamomum|melaleuca|rosmarinus)\b.*\boil\b/.test(
        s
      ),
  },
  { label: 'Menthol', test: (s) => s === 'menthol' },
  { label: 'Sulfate cleanser', test: (s) => s === 'sodium lauryl sulfate' },
];

export function checkProduct(
  product: CheckProduct,
  skinType: string,
  sensitive: boolean,
  concerns: string[]
): CheckResult {
  const profile = getProfileIngredients(skinType, sensitive, concerns);

  const have = new Set<string>();

  for (const tag of product.tags) have.add(tag.replace(/-/g, ' '));

  const cleanedText = product.text.replace(/^\s*ingredients?\s*:?/i, '');
  for (const piece of cleanedText.split(/[,;]/)) {
    const n = norm(piece);
    if (n) have.add(n);
  }

  if (have.size === 0) {
    return {
      verdict: 'unknown',
      label: LABELS.unknown,
      hits: [],
      flags: [],
      note: 'This listing has no ingredient list, so it can’t be scored.',
    };
  }

  const hits = profile.filter((ingredient) =>
    have.has(ingredient.tag.replace(/-/g, ' '))
  );

  const flags = WATCH.filter((watch) => [...have].some(watch.test)).map(
    (watch) => watch.label
  );

  let level = hits.length >= 5 ? 3 : hits.length >= 3 ? 2 : hits.length >= 1 ? 1 : 0;

  if (sensitive && flags.length > 0) level = Math.max(0, level - 1);

  const verdict = (['limited', 'okay', 'good', 'great'] as const)[level];

  let note = '';
  if (flags.length > 0) {
    note = sensitive
      ? `Contains ${flags.join(', ').toLowerCase()}, which can bother sensitive skin.`
      : `Contains ${flags.join(', ').toLowerCase()}. Fine for many people, but worth knowing.`;
  }

  return { verdict, label: LABELS[verdict], hits, flags, note };
}
