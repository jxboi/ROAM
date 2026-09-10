import { useEffect, useSyncExternalStore } from 'react';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SOCIAL_IMAGE, absoluteUrl } from './site';

export type PageMeta = {
  /** Page-specific part of the title; omit on the home page. */
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article';
  /** Personal pages hold no shareable content and should stay out of search results. */
  noIndex?: boolean;
};

export const pageTitle = (title?: string) =>
  title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} — ${SITE_TAGLINE}`;

export type CurrentPage = { title: string; path: string };

const EMPTY_PAGE: CurrentPage = { title: '', path: '' };
let currentPage: CurrentPage = EMPTY_PAGE;
const listeners = new Set<() => void>();

function setCurrentPage(next: CurrentPage) {
  if (currentPage.title === next.title && currentPage.path === next.path) return;
  currentPage = next;
  listeners.forEach(listener => listener());
}

/**
 * The page now showing, and the route it belongs to. Routes are code-split, so
 * this only catches up once the destination has mounted; the path lets the
 * shell tell that apart from the page being left, which is still on screen
 * behind the loading state.
 */
export function useRouteAnnouncement(): CurrentPage {
  return useSyncExternalStore(
    listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => currentPage,
    () => EMPTY_PAGE,
  );
}

function upsertMeta(key: 'name' | 'property', value: string, content: string) {
  const selector = `meta[${key}="${value}"]`;
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(key, value);
    document.head.append(tag);
  }
  tag.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.rel = rel;
    document.head.append(tag);
  }
  tag.href = href;
}

/**
 * Keeps the document head in step with the routed page: a shared title and a
 * single Open Graph card for every route made every shared link look identical.
 */
export function useDocumentMeta({ title, description, path, image, type = 'website', noIndex = false }: PageMeta) {
  const resolvedTitle = pageTitle(title);
  const resolvedDescription = description ?? SITE_DESCRIPTION;
  const resolvedPath = path ?? (typeof window === 'undefined' ? '/' : window.location.pathname);
  const resolvedImage = image ?? SOCIAL_IMAGE;

  useEffect(() => {
    document.title = resolvedTitle;
    const url = absoluteUrl(resolvedPath);
    const card = absoluteUrl(resolvedImage);
    upsertMeta('name', 'description', resolvedDescription);
    upsertMeta('name', 'robots', noIndex ? 'noindex, follow' : 'index, follow');
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:title', resolvedTitle);
    upsertMeta('property', 'og:description', resolvedDescription);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', card);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', resolvedTitle);
    upsertMeta('name', 'twitter:description', resolvedDescription);
    upsertMeta('name', 'twitter:image', card);
    upsertLink('canonical', url);
    setCurrentPage({ title: title ?? SITE_NAME, path: resolvedPath });
  }, [resolvedTitle, resolvedDescription, resolvedPath, resolvedImage, type, noIndex, title]);
}

/** Publishes one structured-data block for the current page, replacing any previous one. */
export function useJsonLd(data: object | null) {
  const serialized = data ? JSON.stringify(data) : '';
  useEffect(() => {
    if (!serialized) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.roam = 'structured-data';
    script.textContent = serialized;
    document.head.append(script);
    return () => script.remove();
  }, [serialized]);
}
