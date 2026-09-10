export const SITE_NAME = 'ROAM';
export const SITE_TAGLINE = 'Find your next great ride';
export const SITE_DESCRIPTION =
  'Find your next great motorcycle ride. Discover extraordinary routes around the world, compare destinations, and make the trip your own with ROAM.';
/** 1200x630 card generated from the hero panorama by `npm run assets`. */
export const SOCIAL_IMAGE = '/social-card.jpg';

/**
 * Set VITE_SITE_URL for the deployed origin so canonical and Open Graph URLs
 * are absolute. Without it the app falls back to the origin it is served from,
 * which is correct per-deployment but unavailable during a static build.
 */
const configured = (import.meta.env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '');

export function siteOrigin(): string {
  if (configured) return configured;
  return typeof window === 'undefined' ? '' : window.location.origin;
}

export function absoluteUrl(path: string): string {
  const origin = siteOrigin();
  if (!origin) return path;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}
