import {
  getHairProfileIngredients,
  hairConcerns,
  type HairConcern,
} from './hairIngredients.js';
import type { CheckProduct, CheckResult } from './ingredientCheck.js';

/* Hair products are scored the same way as skin products: by how well they
 * cover the JOBS a hair profile needs, not by how many names they contain. */

type Role =
  | 'moisture'
  | 'seal'
  | 'slip'
  | 'protein'
  | 'repair'
  | 'gentle-cleanse'
  | 'scalp-soothe';

const ROLE_LABELS: Record<Role, string> = {
  moisture: 'moisture',
  seal: 'sealing and shine',
  slip: 'slip and detangling',
  protein: 'strength',
  repair: 'bond repair',
  'gentle-cleanse': 'gentle cleansing',
  'scalp-soothe': 'scalp comfort',
};

const ROLE_BY_TAG: Record<string, Role[]> = {
  'glycerin': ['moisture'],
  'panthenol': ['moisture', 'scalp-soothe'],
  'aloe-barbadensis-leaf-juice': ['moisture', 'slip', 'scalp-soothe'],
  'sodium-hyaluronate': ['moisture'],
  'sodium-pca': ['moisture'],
  'urea': ['moisture'],

  'squalane': ['seal'],
  'simmondsia-chinensis-seed-oil': ['seal'],
  'argania-spinosa-kernel-oil': ['seal'],
  'persea-gratissima-oil': ['seal'],
  'ricinus-communis-seed-oil': ['seal'],
  'cocos-nucifera-oil': ['seal'],
  'helianthus-annuus-seed-oil': ['seal'],
  'butyrospermum-parkii-butter': ['seal'],
  'mangifera-indica-seed-butter': ['seal'],
  'ceramide-np': ['seal', 'repair'],

  'behentrimonium-chloride': ['slip'],
  'cetearyl-alcohol': ['slip'],
  'cetyl-alcohol': ['slip'],
  'stearyl-alcohol': ['slip'],
  'behentrimonium-methosulfate': ['slip'],

  'hydrolyzed-keratin': ['protein', 'repair'],
  'hydrolyzed-wheat-protein': ['protein'],
  'hydrolyzed-rice-protein': ['protein'],
  'hydrolyzed-silk': ['protein'],
  'hydrolyzed-soy-protein': ['protein'],
  'arginine': ['protein', 'repair'],
  'bis-aminopropyl-diglycol-dimaleate': ['repair'],

  'coco-glucoside': ['gentle-cleanse'],
  'decyl-glucoside': ['gentle-cleanse'],
  'lauryl-glucoside': ['gentle-cleanse'],
  'sodium-cocoyl-isethionate': ['gentle-cleanse'],
  'cocamidopropyl-betaine': ['gentle-cleanse'],
  'disodium-cocoamphodiacetate': ['gentle-cleanse'],
  'sodium-lauroyl-methyl-isethionate': ['gentle-cleanse'],

  'allantoin': ['scalp-soothe'],
  'bisabolol': ['scalp-soothe'],
  'avena-sativa-kernel-flour': ['scalp-soothe'],
};

function coreRoles(hairType: string, sensitiveScalp: boolean): Role[] {
  const base: Record<string, Role[]> = {
    straight: ['gentle-cleanse', 'moisture', 'seal'],
    wavy: ['moisture', 'slip', 'seal'],
    curly: ['moisture', 'seal', 'slip', 'gentle-cleanse'],
    coily: ['moisture', 'seal', 'slip', 'gentle-cleanse'],
  };
  const roles = [...(base[hairType] ?? [])];
  if (sensitiveScalp) roles.push('scalp-soothe');
  return roles;
}

/* ---------------------------------------------------------------------- */

function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const ALIASES: Record<string, string> = {
  'hyaluronic acid': 'sodium hyaluronate',
  'vitamin b5': 'panthenol',
  'pro vitamin b5': 'panthenol',
  'd panthenol': 'panthenol',
  'vitamin e': 'tocopherol',
  'aloe vera': 'aloe barbadensis leaf juice',
  'argan oil': 'argania spinosa kernel oil',
  'shea butter': 'butyrospermum parkii butter',
  'castor oil': 'ricinus communis seed oil',
  'coconut oil': 'cocos nucifera oil',
  'jojoba oil': 'simmondsia chinensis seed oil',
  'avocado oil': 'persea gratissima oil',
  'tea tree oil': 'melaleuca alternifolia leaf oil',
  'keratin': 'hydrolyzed keratin',
  'ceramides': 'ceramide np',
  'ceramide np': 'ceramide np',
  'biotin': 'biotin',
};

function canonical(value: string): string {
  const n = norm(value);
  return ALIASES[n] ?? n;
}

const ROLES_BY_CANONICAL = new Map<string, Role[]>(
  Object.entries(ROLE_BY_TAG).map(([tag, roles]) => [
    canonical(tag.replace(/-/g, ' ')),
    roles,
  ])
);

function extractIngredients(product: CheckProduct): Map<string, number> {
  const found = new Map<string, number>();
  const add = (value: string, weight: number) => {
    if (!value) return;
    if ((found.get(value) ?? 0) < weight) found.set(value, weight);
  };

  for (const tag of product.tags) add(canonical(tag.replace(/-/g, ' ')), 1);

  const text = product.text.replace(/^\s*ingredients?\s*:?/i, '');
  const pieces = text
    .split(/[,;]/)
    .map((piece) => canonical(piece))
    .filter(Boolean);

  pieces.forEach((value, index) => {
    const trace = pieces.length > 15 && index >= 12;
    add(value, trace ? 0.5 : 1);
  });

  return found;
}

/* ---------------------------------------------------------------------- */

type Ctx = { hairType: string; sensitive: boolean; concerns: string[] };

const WATCH: {
  label: string;
  test: (value: string) => boolean;
  // When true, this lowers the rating for the profile.
  matters: (ctx: Ctx) => boolean;
}[] = [
  {
    label: 'Sulfate cleanser',
    test: (s) =>
      s === 'sodium lauryl sulfate' ||
      s === 'sodium laureth sulfate' ||
      s === 'ammonium lauryl sulfate' ||
      s === 'ammonium laureth sulfate',
    matters: (c) =>
      c.hairType === 'curly' ||
      c.hairType === 'coily' ||
      c.sensitive ||
      c.concerns.includes('dry-frizzy') ||
      c.concerns.includes('color-treated') ||
      c.concerns.includes('damaged'),
  },
  {
    label: 'Drying alcohol',
    test: (s) =>
      s === 'alcohol denat' ||
      s === 'sd alcohol' ||
      s === 'isopropyl alcohol' ||
      s === 'alcohol',
    matters: (c) =>
      c.hairType === 'curly' ||
      c.hairType === 'coily' ||
      c.concerns.includes('dry-frizzy') ||
      c.concerns.includes('damaged'),
  },
  {
    label: 'Added fragrance',
    test: (s) => s === 'parfum' || s === 'fragrance' || s === 'aroma',
    matters: (c) => c.sensitive,
  },
  {
    label: 'Essential oils',
    test: (s) =>
      /^(lavandula|mentha|eucalyptus|citrus|cymbopogon|cinnamomum|rosmarinus|pelargonium|cananga)\b/.test(
        s
      ) && /\b(oil|extract)\b/.test(s),
    matters: (c) => c.sensitive,
  },
  {
    label: 'Mineral oil or petrolatum',
    test: (s) =>
      s === 'mineral oil' || s === 'paraffinum liquidum' || s === 'petrolatum',
    matters: (c) =>
      c.concerns.includes('fine-limp') || c.concerns.includes('oily-scalp'),
  },
  {
    label: 'Non-water-soluble silicones',
    test: (s) =>
      s === 'dimethicone' ||
      s === 'amodimethicone' ||
      s === 'cyclopentasiloxane' ||
      s === 'dimethiconol',
    // Informational only: they can build up, but many people like them.
    matters: () => false,
  },
];

export function checkHairProduct(
  product: CheckProduct,
  hairType: string,
  sensitiveScalp: boolean,
  concerns: string[]
): CheckResult {
  const profile = getHairProfileIngredients(hairType, sensitiveScalp, concerns);
  const have = extractIngredients(product);

  if (have.size === 0) {
    return {
      verdict: 'unknown',
      label: 'No ingredient data',
      hits: [],
      flags: [],
      note: 'This listing has no ingredient list, so it cannot be scored.',
      score: 0,
    };
  }

  const hits = profile.filter((ingredient) =>
    have.has(canonical(ingredient.tag.replace(/-/g, ' ')))
  );

  const ctx: Ctx = { hairType, sensitive: sensitiveScalp, concerns };
  const triggered = WATCH.filter((watch) =>
    [...have.keys()].some(watch.test)
  );
  const flags = triggered.map((watch) => watch.label);
  const penalized = triggered.filter((watch) => watch.matters(ctx));

  const credit = new Map<Role, number>();
  for (const [value, weight] of have) {
    for (const role of ROLES_BY_CANONICAL.get(value) ?? []) {
      credit.set(role, Math.max(credit.get(role) ?? 0, weight));
    }
  }

  const core = coreRoles(hairType, sensitiveScalp);
  const coreCoverage =
    core.length > 0
      ? core.reduce((t, role) => t + (credit.get(role) ?? 0), 0) / core.length
      : 0;

  const selectedConcerns: HairConcern[] = hairConcerns.filter((c) =>
    concerns.includes(c.value)
  );

  const concernCredit = selectedConcerns.map((concern) =>
    concern.ingredients.reduce((best, ingredient) => {
      const weight = have.get(canonical(ingredient.tag.replace(/-/g, ' '))) ?? 0;
      return Math.max(best, weight);
    }, 0)
  );

  const concernCoverage =
    concernCredit.length > 0
      ? concernCredit.reduce((t, v) => t + v, 0) / concernCredit.length
      : 0;

  const parts: { value: number; weight: number }[] = [];
  if (core.length > 0) parts.push({ value: coreCoverage, weight: 0.6 });
  if (selectedConcerns.length > 0) {
    parts.push({ value: concernCoverage, weight: 0.4 });
  }

  const totalWeight = parts.reduce((t, p) => t + p.weight, 0);
  const score =
    totalWeight > 0
      ? (parts.reduce((t, p) => t + p.value * p.weight, 0) / totalWeight) * 100
      : 0;

  let level = score >= 75 ? 3 : score >= 55 ? 2 : score >= 30 ? 1 : 0;
  if (penalized.length > 0) {
    level = Math.max(0, level - (penalized.length >= 2 ? 2 : 1));
  }

  const verdict = (['limited', 'okay', 'good', 'great'] as const)[level];
  const labels = {
    great: 'Strong fit',
    good: 'Good fit',
    okay: 'Partial fit',
    limited: 'Weak fit',
  } as const;

  const noteParts: string[] = [];
  if (core.length === 0 && selectedConcerns.length === 0) {
    noteParts.push('Pick a hair type or concern to see how well this fits');
  }

  const covered = core.filter((r) => (credit.get(r) ?? 0) > 0);
  const missing = core.filter((r) => (credit.get(r) ?? 0) === 0);
  if (covered.length > 0) {
    noteParts.push(`Covers ${covered.map((r) => ROLE_LABELS[r]).join(', ')}`);
  }
  if (missing.length > 0) {
    noteParts.push(`Light on ${missing.map((r) => ROLE_LABELS[r]).join(', ')}`);
  }

  const hitConcerns = selectedConcerns.filter((_, i) => concernCredit[i] > 0);
  const missedConcerns = selectedConcerns.filter((_, i) => concernCredit[i] === 0);
  if (hitConcerns.length > 0) {
    noteParts.push(
      `Targets ${hitConcerns.map((c) => c.label.toLowerCase()).join(', ')}`
    );
  }
  if (missedConcerns.length > 0) {
    noteParts.push(
      `Does not specifically target ${missedConcerns
        .map((c) => c.label.toLowerCase())
        .join(', ')}`
    );
  }
  if (flags.length > 0) {
    noteParts.push(`Contains ${flags.join(', ').toLowerCase()}`);
    if (penalized.length > 0) {
      noteParts.push('This may work against your hair profile');
    }
  }

  return {
    verdict,
    label: labels[verdict],
    hits,
    flags,
    note: noteParts.length > 0 ? `${noteParts.join('. ')}.` : '',
    score: Math.round(score),
  };
}
