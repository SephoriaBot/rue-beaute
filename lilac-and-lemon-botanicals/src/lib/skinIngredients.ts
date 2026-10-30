export type Ingredient = {
  name: string; // shown to the user
  tag: string; // INCI-style name used for database search
  why: string;
};

export type SkinType = {
  value: string;
  label: string;
  blurb: string;
  ingredients: Ingredient[];
};

export const skinTypes: SkinType[] = [
  {
    value: 'dry',
    label: 'Dry',
    blurb: 'Look for ingredients that replenish moisture and support the barrier.',
    ingredients: [
      { name: 'Squalane', tag: 'squalane', why: 'Lightweight emollient that softens and reduces moisture loss.' },
      { name: 'Ceramides', tag: 'ceramide-np', why: 'Rebuild the skin barrier so water stays in.' },
      { name: 'Hyaluronic acid', tag: 'sodium-hyaluronate', why: 'Draws water into the skin for plumpness.' },
      { name: 'Shea butter', tag: 'butyrospermum-parkii-butter', why: 'Rich emollient for tight, rough areas.' },
      { name: 'Glycerin', tag: 'glycerin', why: 'Reliable humectant that keeps skin hydrated.' },
      { name: 'Panthenol', tag: 'panthenol', why: 'Soothes and supports barrier repair.' },
    ],
  },
  {
    value: 'normal',
    label: 'Normal',
    blurb: 'Keep things balanced with gentle hydration and protection.',
    ingredients: [
      { name: 'Glycerin', tag: 'glycerin', why: 'Steady, gentle hydration for everyday balance.' },
      { name: 'Hyaluronic acid', tag: 'sodium-hyaluronate', why: 'Light moisture without heaviness.' },
      { name: 'Vitamin C', tag: 'ascorbic-acid', why: 'Antioxidant support and brightening.' },
      { name: 'Niacinamide', tag: 'niacinamide', why: 'Supports barrier health and an even-looking tone.' },
      { name: 'Panthenol', tag: 'panthenol', why: 'Calms and keeps skin comfortable.' },
    ],
  },
  {
    value: 'oily',
    label: 'Oily',
    blurb: 'Look for light, balancing ingredients that do not clog pores.',
    ingredients: [
      { name: 'Niacinamide', tag: 'niacinamide', why: 'Helps regulate the look of oil and pore size.' },
      { name: 'Salicylic acid', tag: 'salicylic-acid', why: 'Oil-soluble exfoliant that clears pores.' },
      { name: 'Hyaluronic acid', tag: 'sodium-hyaluronate', why: 'Hydrates without adding oil.' },
      { name: 'Green tea extract', tag: 'camellia-sinensis-leaf-extract', why: 'Antioxidant that helps calm oily, breakout-prone skin.' },
      { name: 'Witch hazel', tag: 'hamamelis-virginiana-water', why: 'Light astringent feel for a fresh, clarified look.' },
      { name: 'Aloe vera', tag: 'aloe-barbadensis-leaf-juice', why: 'Cooling, lightweight hydration.' },
    ],
  },
  {
    value: 'combination',
    label: 'Combination',
    blurb: 'Balance oily zones while keeping dry areas comfortable.',
    ingredients: [
      { name: 'Niacinamide', tag: 'niacinamide', why: 'Balances oil in the T-zone without drying the cheeks.' },
      { name: 'Hyaluronic acid', tag: 'sodium-hyaluronate', why: 'Hydrates all areas evenly.' },
      { name: 'Glycerin', tag: 'glycerin', why: 'Light humectant that suits both zones.' },
      { name: 'Aloe vera', tag: 'aloe-barbadensis-leaf-juice', why: 'Lightweight and soothing.' },
      { name: 'Squalane', tag: 'squalane', why: 'Light enough for oily areas, helpful for dry patches.' },
    ],
  },
  {
    value: 'sensitive',
    label: 'Sensitive',
    blurb: 'Choose soothing, minimal ingredients and avoid fragrance where you can.',
    ingredients: [
      { name: 'Centella asiatica (cica)', tag: 'centella-asiatica-extract', why: 'Well known for calming redness and irritation.' },
      { name: 'Panthenol', tag: 'panthenol', why: 'Soothes and supports a stressed barrier.' },
      { name: 'Ceramides', tag: 'ceramide-np', why: 'Strengthen a reactive barrier.' },
      { name: 'Allantoin', tag: 'allantoin', why: 'Gentle, calming and softening.' },
      { name: 'Oat (colloidal oatmeal)', tag: 'avena-sativa-kernel-flour', why: 'Classic soothing ingredient for itchy, irritated skin.' },
      { name: 'Glycerin', tag: 'glycerin', why: 'Gentle hydration with a low irritation profile.' },
    ],
  },
];
