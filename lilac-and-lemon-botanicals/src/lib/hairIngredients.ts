import type { Ingredient } from './skinIngredients.js';

export type HairType = {
  value: string;
  label: string;
  blurb: string;
  ingredients: Ingredient[];
};

export type HairConcern = {
  value: string;
  label: string;
  ingredients: Ingredient[];
};

export const hairTypes: HairType[] = [
  {
    value: 'straight',
    label: 'Straight',
    blurb: 'Oil travels down the strand easily, so look for gentle cleansing, light hydration, and shine without heavy buildup.',
    ingredients: [
      { name: 'Panthenol', tag: 'panthenol', why: 'Adds light moisture and helps hair look smooth and shiny.' },
      { name: 'Glycerin', tag: 'glycerin', why: 'A lightweight humectant that keeps hair hydrated.' },
      { name: 'Aloe vera', tag: 'aloe-barbadensis-leaf-juice', why: 'Lightweight hydration that will not weigh hair down.' },
      { name: 'Hydrolyzed silk protein', tag: 'hydrolyzed-silk', why: 'Adds smoothness and shine without heaviness.' },
      { name: 'Squalane', tag: 'squalane', why: 'A light, non-greasy oil that seals in shine.' },
      { name: 'Jojoba oil', tag: 'simmondsia-chinensis-seed-oil', why: 'Mimics natural scalp oils and adds light conditioning.' },
      { name: 'Coco-glucoside', tag: 'coco-glucoside', why: 'A gentle cleanser that lifts oil without stripping.' },
      { name: 'Decyl glucoside', tag: 'decyl-glucoside', why: 'A mild cleanser suited to frequent washing.' },
      { name: 'Cetyl alcohol', tag: 'cetyl-alcohol', why: 'A soft conditioning fatty alcohol that smooths the cuticle.' },
    ],
  },
  {
    value: 'wavy',
    label: 'Wavy',
    blurb: 'Waves need moisture and slip to define the pattern without being weighed down.',
    ingredients: [
      { name: 'Glycerin', tag: 'glycerin', why: 'Draws in moisture to support wave definition.' },
      { name: 'Panthenol', tag: 'panthenol', why: 'Hydrates and helps reduce frizz.' },
      { name: 'Aloe vera', tag: 'aloe-barbadensis-leaf-juice', why: 'Light hydration and slip for detangling.' },
      { name: 'Hydrolyzed wheat protein', tag: 'hydrolyzed-wheat-protein', why: 'Adds strength and hold to the wave pattern.' },
      { name: 'Argan oil', tag: 'argania-spinosa-kernel-oil', why: 'Seals the cuticle and tames frizz without heaviness.' },
      { name: 'Behentrimonium chloride', tag: 'behentrimonium-chloride', why: 'A conditioning agent that improves slip and detangling.' },
      { name: 'Cetearyl alcohol', tag: 'cetearyl-alcohol', why: 'A fatty alcohol that softens and conditions.' },
      { name: 'Squalane', tag: 'squalane', why: 'Seals in moisture with a light finish.' },
      { name: 'Coco-glucoside', tag: 'coco-glucoside', why: 'A gentle cleanser that keeps waves from drying out.' },
    ],
  },
  {
    value: 'curly',
    label: 'Curly',
    blurb: 'Curls run drier, so prioritize moisture, sealing, slip, and gentle cleansing.',
    ingredients: [
      { name: 'Glycerin', tag: 'glycerin', why: 'A humectant that pulls moisture into curls.' },
      { name: 'Panthenol', tag: 'panthenol', why: 'Hydrates and improves elasticity.' },
      { name: 'Aloe vera', tag: 'aloe-barbadensis-leaf-juice', why: 'Hydrating, with slip for detangling.' },
      { name: 'Shea butter', tag: 'butyrospermum-parkii-butter', why: 'A rich emollient that softens and seals.' },
      { name: 'Behentrimonium chloride', tag: 'behentrimonium-chloride', why: 'Gives slip that makes detangling easier.' },
      { name: 'Cetearyl alcohol', tag: 'cetearyl-alcohol', why: 'Softens and conditions without drying.' },
      { name: 'Argan oil', tag: 'argania-spinosa-kernel-oil', why: 'Seals the cuticle and reduces frizz.' },
      { name: 'Avocado oil', tag: 'persea-gratissima-oil', why: 'Nourishing oil that softens and adds moisture.' },
      { name: 'Hydrolyzed wheat protein', tag: 'hydrolyzed-wheat-protein', why: 'Strengthens curls and supports definition.' },
      { name: 'Coco-glucoside', tag: 'coco-glucoside', why: 'Cleanses gently without stripping curls.' },
      { name: 'Sodium cocoyl isethionate', tag: 'sodium-cocoyl-isethionate', why: 'A mild, creamy cleanser.' },
    ],
  },
  {
    value: 'coily',
    label: 'Coily / Kinky',
    blurb: 'Coils are the most prone to dryness and breakage, so look for rich moisture, sealing, slip, and very gentle cleansing.',
    ingredients: [
      { name: 'Shea butter', tag: 'butyrospermum-parkii-butter', why: 'A rich butter that seals in moisture.' },
      { name: 'Mango butter', tag: 'mangifera-indica-seed-butter', why: 'Adds softness and conditioning.' },
      { name: 'Glycerin', tag: 'glycerin', why: 'Draws moisture into dry coils.' },
      { name: 'Panthenol', tag: 'panthenol', why: 'Hydrates and helps improve flexibility.' },
      { name: 'Aloe vera', tag: 'aloe-barbadensis-leaf-juice', why: 'Hydrating with slip for detangling.' },
      { name: 'Castor oil', tag: 'ricinus-communis-seed-oil', why: 'A thick oil that seals moisture in.' },
      { name: 'Coconut oil', tag: 'cocos-nucifera-oil', why: 'Penetrates the strand and helps reduce protein loss.' },
      { name: 'Behentrimonium chloride', tag: 'behentrimonium-chloride', why: 'Gives slip that reduces breakage when detangling.' },
      { name: 'Cetearyl alcohol', tag: 'cetearyl-alcohol', why: 'Softens and conditions.' },
      { name: 'Hydrolyzed keratin', tag: 'hydrolyzed-keratin', why: 'Helps strengthen fragile strands.' },
      { name: 'Coco-glucoside', tag: 'coco-glucoside', why: 'A gentle cleanser that will not strip dry coils.' },
    ],
  },
];

export const sensitiveScalpIngredients: Ingredient[] = [
  { name: 'Allantoin', tag: 'allantoin', why: 'Soothes an irritated scalp.' },
  { name: 'Bisabolol', tag: 'bisabolol', why: 'Calms redness and sensitivity.' },
  { name: 'Colloidal oatmeal', tag: 'avena-sativa-kernel-flour', why: 'Comforts an itchy, reactive scalp.' },
  { name: 'Aloe vera', tag: 'aloe-barbadensis-leaf-juice', why: 'Cooling and soothing for the scalp.' },
  { name: 'Panthenol', tag: 'panthenol', why: 'Supports comfort and the scalp barrier.' },
  { name: 'Coco-glucoside', tag: 'coco-glucoside', why: 'A mild cleanser that is gentle on the scalp.' },
];

export const hairConcerns: HairConcern[] = [
  {
    value: 'dry-frizzy',
    label: 'Dry or frizzy',
    ingredients: [
      { name: 'Glycerin', tag: 'glycerin', why: 'Draws moisture into thirsty hair.' },
      { name: 'Panthenol', tag: 'panthenol', why: 'Hydrates and smooths the cuticle.' },
      { name: 'Argan oil', tag: 'argania-spinosa-kernel-oil', why: 'Tames frizz and adds shine.' },
      { name: 'Shea butter', tag: 'butyrospermum-parkii-butter', why: 'Softens and seals in moisture.' },
      { name: 'Sodium hyaluronate', tag: 'sodium-hyaluronate', why: 'A water-binding humectant.' },
    ],
  },
  {
    value: 'damaged',
    label: 'Damaged or breaking',
    ingredients: [
      { name: 'Bis-aminopropyl diglycol dimaleate', tag: 'bis-aminopropyl-diglycol-dimaleate', why: 'A bond-building ingredient that supports damaged hair.' },
      { name: 'Hydrolyzed keratin', tag: 'hydrolyzed-keratin', why: 'Fills in gaps along damaged strands.' },
      { name: 'Hydrolyzed wheat protein', tag: 'hydrolyzed-wheat-protein', why: 'Adds strength to weak hair.' },
      { name: 'Hydrolyzed rice protein', tag: 'hydrolyzed-rice-protein', why: 'Reinforces the strand and adds body.' },
      { name: 'Amino acids', tag: 'arginine', why: 'Support strength and repair.' },
      { name: 'Ceramides', tag: 'ceramide-np', why: 'Help reinforce the cuticle.' },
    ],
  },
  {
    value: 'color-treated',
    label: 'Color-treated',
    ingredients: [
      { name: 'Vitamin E', tag: 'tocopherol', why: 'An antioxidant that helps protect color and shine.' },
      { name: 'Sunflower seed oil', tag: 'helianthus-annuus-seed-oil', why: 'Conditions and helps lock in vibrancy.' },
      { name: 'Hydrolyzed keratin', tag: 'hydrolyzed-keratin', why: 'Supports strands weakened by coloring.' },
      { name: 'Green tea', tag: 'camellia-sinensis-leaf-extract', why: 'Provides antioxidant support.' },
      { name: 'Citric acid', tag: 'citric-acid', why: 'Helps close the cuticle for shine.' },
    ],
  },
  {
    value: 'oily-scalp',
    label: 'Oily scalp',
    ingredients: [
      { name: 'Salicylic acid', tag: 'salicylic-acid', why: 'Helps clear oil and buildup on the scalp.' },
      { name: 'Niacinamide', tag: 'niacinamide', why: 'Helps balance oil production.' },
      { name: 'Zinc PCA', tag: 'zinc-pca', why: 'Helps control excess oil.' },
      { name: 'Tea tree oil', tag: 'melaleuca-alternifolia-leaf-oil', why: 'Purifying for oily scalps.' },
      { name: 'Coco-glucoside', tag: 'coco-glucoside', why: 'Cleanses without over-stripping.' },
    ],
  },
  {
    value: 'flaky-scalp',
    label: 'Flaky or dandruff',
    ingredients: [
      { name: 'Zinc pyrithione', tag: 'zinc-pyrithione', why: 'An anti-dandruff active.' },
      { name: 'Piroctone olamine', tag: 'piroctone-olamine', why: 'Targets the yeast linked to flaking.' },
      { name: 'Salicylic acid', tag: 'salicylic-acid', why: 'Loosens flakes and buildup.' },
      { name: 'Climbazole', tag: 'climbazole', why: 'An antifungal that helps control dandruff.' },
      { name: 'Selenium sulfide', tag: 'selenium-sulfide', why: 'An anti-dandruff active.' },
    ],
  },
  {
    value: 'thinning',
    label: 'Thinning or shedding',
    ingredients: [
      { name: 'Caffeine', tag: 'caffeine', why: 'Often used in scalp care for thinning-looking hair.' },
      { name: 'Niacinamide', tag: 'niacinamide', why: 'Supports a healthy scalp environment.' },
      { name: 'Biotin', tag: 'biotin', why: 'A common ingredient in hair-strengthening products.' },
      { name: 'Rosemary extract', tag: 'rosmarinus-officinalis-leaf-extract', why: 'A popular botanical in scalp-care products.' },
      { name: 'Panthenol', tag: 'panthenol', why: 'Thickens the look of strands and adds body.' },
    ],
  },
  {
    value: 'fine-limp',
    label: 'Fine or limp',
    ingredients: [
      { name: 'Hydrolyzed rice protein', tag: 'hydrolyzed-rice-protein', why: 'Adds body and lift without weight.' },
      { name: 'Hydrolyzed wheat protein', tag: 'hydrolyzed-wheat-protein', why: 'Adds volume and strength to fine strands.' },
      { name: 'Panthenol', tag: 'panthenol', why: 'Swells the strand slightly for fuller-looking hair.' },
      { name: 'Aloe vera', tag: 'aloe-barbadensis-leaf-juice', why: 'Light moisture that will not weigh hair down.' },
      { name: 'Squalane', tag: 'squalane', why: 'A very light oil that adds shine without heaviness.' },
    ],
  },
];

export const hairCategories = [
  'Shampoos',
  'Conditioners',
  'Masks & Treatments',
  'Leave-ins',
  'Styling',
  'Hair Oils',
  'Scalp Care',
  'Other',
];

export function getHairProfileIngredients(
  hairTypeValue: string,
  sensitiveScalp: boolean,
  concernValues: string[]
): Ingredient[] {
  const primary = hairTypes.find((type) => type.value === hairTypeValue);
  if (!primary) return [];

  const selectedConcerns = hairConcerns.filter((concern) =>
    concernValues.includes(concern.value)
  );

  const all = [
    ...primary.ingredients,
    ...(sensitiveScalp ? sensitiveScalpIngredients : []),
    ...selectedConcerns.flatMap((concern) => concern.ingredients),
  ];

  const unique = new Map<string, Ingredient>();
  for (const ingredient of all) {
    if (!unique.has(ingredient.tag)) unique.set(ingredient.tag, ingredient);
  }

  return [...unique.values()];
}
