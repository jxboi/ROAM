/**
 * Destination photography is 1280px wide, and most places it appears are a
 * good deal narrower than that. These helpers hand the browser the widths that
 * exist so it can pick one, rather than always sending the original.
 *
 * Variants are produced by `npm run assets`; the widths here must match the
 * ones in scripts/generate-assets.mjs.
 */
const RIDE_VARIANTS = [400, 560, 800, 1120];
const RIDE_ORIGINAL_WIDTH = 1280;
const HERO_VARIANTS = [480, 800, 1200];
const HERO_ORIGINAL_WIDTH = 1536;
const PANORAMA_VARIANTS = [1200, 1440, 1800];
const PANORAMA_ORIGINAL_WIDTH = 2172;

const entries = (name: string, widths: number[], originalWidth: number) =>
  [...widths.map(width => `/images/${name}-${width}.webp ${width}w`), `/images/${name}.webp ${originalWidth}w`].join(', ');

export const ridePhoto = (name: string) => `/images/${name}.webp`;
export const rideSrcSet = (name: string) => entries(name, RIDE_VARIANTS, RIDE_ORIGINAL_WIDTH);
export const heroSrcSet = () => entries('hero', HERO_VARIANTS, HERO_ORIGINAL_WIDTH);
export const panoramaSrcSet = () => entries('hero-panorama', PANORAMA_VARIANTS, PANORAMA_ORIGINAL_WIDTH);

/**
 * How wide each surface renders a photo, so the browser can choose before it
 * has laid the page out. Keep these in step with the grid breakpoints in
 * styles.css: three cards above 1100px, two above 640px, one below.
 */
export const PHOTO_SIZES = {
  card: '(min-width: 1101px) 400px, (min-width: 641px) 46vw, 92vw',
  detail: '(min-width: 1336px) 1240px, 94vw',
  thumbnail: '(min-width: 641px) 230px, 40vw',
  banner: '(min-width: 1101px) 620px, 92vw',
  season: '(min-width: 1101px) 560px, 92vw',
  full: '100vw',
} as const;
