// Shared product image maps, keyed by product id.
// Used by ProductGrid (shop) and TesterDashboard (tester portal) so both
// stay in sync with a single source of truth.

// Botanical flat-lay art, used as a soft, faded backdrop on shop cards.
export const backgroundImages: Record<number, string> = {
  101: '/illustrations/1_paquerette.png',
  102: '/illustrations/2_seve_serum.png',
  103: '/illustrations/3_clochette.png',
  104: '/illustrations/4_matinale_cleanser.png',
  105: '/illustrations/5_fleurie_serum.png',
  106: '/illustrations/6_aube_moisturizer.png',
  107: '/illustrations/7_reveuse.png',
  108: '/illustrations/8_rosee.png',
  109: '/illustrations/9_polie_exfoliator.png',
};

// Actual bottle/jar renders.
export const bottleImages: Record<number, string> = {
  101: '/illustrations/01_Paquerette.png',
  102: '/illustrations/03_Seve.png',
  103: '/illustrations/05_Clochette.png',
  104: '/illustrations/02_Matinale.png',
  105: '/illustrations/04_Fleurie.png',
  106: '/illustrations/06_Aube.png',
  107: '/illustrations/07_Reveuse.png',
  108: '/illustrations/08_Rosee.png',
  109: '/illustrations/09_Polie.png',
};

// Individual product labels (transparent PNGs in /public/labels).
// Products without an entry fall back to the plain editorial placard.
export const labelImages: Record<number, string> = {
  101: '/labels/paquerette.png',
  103: '/labels/clochette.png',
  104: '/labels/matinale.png',
  105: '/labels/fleurie.png',
  106: '/labels/aube.png',
  108: '/labels/rosee.png',
  109: '/labels/polie.png',
};