import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { pageTitle, useDocumentMeta, useJsonLd } from './meta';
import { SITE_NAME } from './site';

function Page(props: Parameters<typeof useDocumentMeta>[0] & { ld?: object }) {
  useDocumentMeta(props);
  useJsonLd(props.ld ?? null);
  return null;
}
const meta = (key: 'name' | 'property', value: string) =>
  document.head.querySelector<HTMLMetaElement>(`meta[${key}="${value}"]`)?.content;

describe('document metadata', () => {
  it('names the site on the home page and the page elsewhere', () => {
    expect(pageTitle()).toBe(`${SITE_NAME} — Find your next great ride`);
    expect(pageTitle('The Dolomites')).toBe(`The Dolomites · ${SITE_NAME}`);
  });

  it('gives each route its own title, description and share card', () => {
    render(<Page title="The Dolomites" description="Six days of switchbacks." path="/ride/dolomites" image="/social/dolomites.jpg" type="article" />);
    expect(document.title).toBe(`The Dolomites · ${SITE_NAME}`);
    expect(meta('name', 'description')).toBe('Six days of switchbacks.');
    expect(meta('property', 'og:title')).toBe(`The Dolomites · ${SITE_NAME}`);
    expect(meta('property', 'og:type')).toBe('article');
    expect(meta('property', 'og:url')).toBe(`${window.location.origin}/ride/dolomites`);
    expect(meta('property', 'og:image')).toBe(`${window.location.origin}/social/dolomites.jpg`);
    expect(meta('name', 'twitter:card')).toBe('summary_large_image');
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href)
      .toBe(`${window.location.origin}/ride/dolomites`);
  });

  it('reuses one tag per property instead of stacking duplicates', () => {
    render(<Page title="One" path="/one" />);
    render(<Page title="Two" path="/two" />);
    expect(document.head.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(meta('property', 'og:title')).toBe(`Two · ${SITE_NAME}`);
  });

  it('keeps personal pages out of search results', () => {
    render(<Page title="My trips" path="/trips" noIndex />);
    expect(meta('name', 'robots')).toBe('noindex, follow');
    render(<Page title="The Dolomites" path="/ride/dolomites" />);
    expect(meta('name', 'robots')).toBe('index, follow');
  });

  it('publishes structured data only while the page that owns it is mounted', () => {
    const selector = 'script[data-roam="structured-data"]';
    const view = render(<Page title="The Dolomites" path="/ride/dolomites" ld={{ '@type': 'TouristTrip' }} />);
    expect(document.head.querySelector(selector)?.textContent).toContain('TouristTrip');
    view.unmount();
    expect(document.head.querySelector(selector)).toBeNull();
  });
});
