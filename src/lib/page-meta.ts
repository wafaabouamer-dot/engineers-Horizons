import { useEffect } from 'react';

/**
 * A PAGE'S OWN TITLE, for the browser tab, the history list and search engines (Google runs the page and reads what
 * it sets): every page of a site said the same title before (production 2026-10-22, a clinic's and a ticket site's
 * pages all read the home page's). Call it at the top of each page, with the page's own words:
 *
 *   usePageMeta({ title: 'Our dentists · Palmetto Grove Clinic', description: 'Meet …' });
 *
 * It also sets the description, the share title and the canonical address, and `noindex` for a page search engines
 * should skip (the not-found page, private pages). Leaving the page puts back what `index.html` says. A link preview
 * (iMessage, WhatsApp) reads `index.html` itself, which runs no code: its title and description are the site's.
 * A page written out ahead at build time is a flat `dist/<path>.html`, never a folder `dist/<path>/index.html`: the
 * host sends a folder's address to the same address with a slash (`/es` became `/es/`: production 2026-10-22).
 */
export type PageMeta = {
  title: string;
  description?: string;
  /** A picture for shares of this page (`/images/…`). */
  image?: string;
  noindex?: boolean;
};

const site =
  typeof document === 'undefined'
    ? { title: '', description: '' }
    : {
        title: document.title,
        description: document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
      };

function setMeta(attribute: 'name' | 'property', key: string, value: string | undefined) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (value == null) {
    tag?.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.append(tag);
  }
  tag.content = value;
}

function setCanonical(href: string | undefined) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (href == null) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.append(link);
  }
  link.href = href;
}

export function usePageMeta({ title, description, image, noindex }: PageMeta): void {
  useEffect(() => {
    const here = location.origin + location.pathname;
    document.title = title;
    setMeta('name', 'description', description ?? site.description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description ?? site.description);
    setMeta('property', 'og:url', here);
    if (image) setMeta('property', 'og:image', new URL(image, location.origin).href);
    setMeta('name', 'robots', noindex ? 'noindex' : undefined);
    setCanonical(noindex ? undefined : here);
    return () => {
      document.title = site.title;
      setMeta('name', 'description', site.description);
      setMeta('property', 'og:title', undefined);
      setMeta('property', 'og:description', undefined);
      setMeta('property', 'og:url', undefined);
      if (image) setMeta('property', 'og:image', undefined);
      setMeta('name', 'robots', undefined);
      setCanonical(undefined);
    };
  }, [title, description, image, noindex]);
}

/** `usePageMeta` as an element: `<PageMeta title="…" />` at the top of a page. */
export function PageMeta(props: PageMeta): null {
  usePageMeta(props);
  return null;
}
