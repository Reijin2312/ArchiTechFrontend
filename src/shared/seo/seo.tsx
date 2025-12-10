import { useEffect } from 'react';

type JsonLd = Record<string, unknown>;
type SeoProps = {
  title: string;
  description?: string;
  keywords?: string | string[];
  canonical?: string;
  robots?: string;
  og?: { url?: string; image?: string; type?: string };
  twitterCard?: 'summary' | 'summary_large_image';
  jsonLd?: readonly JsonLd[];
};

function upsert(name: string, selector: string, attrs: Record<string,string>) {
  let el = document.head.querySelector(selector) as HTMLElement | null;
  if (!el) {
    el = document.createElement(name);
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k,v]) => v ? el!.setAttribute(k, v) : el!.removeAttribute(k));
  return el!;
}

export function Seo(props: SeoProps) {
  useEffect(() => {
    document.title = props.title;

    if (props.description) {
      upsert('meta', 'meta[name="description"]', { name: 'description', content: props.description });
    }

    if (props.keywords && (Array.isArray(props.keywords) ? props.keywords.length : true)) {
      const keywords = Array.isArray(props.keywords) ? props.keywords.join(', ') : props.keywords;
      upsert('meta', 'meta[name="keywords"]', { name: 'keywords', content: keywords });
    }

    if (props.canonical) {
      upsert('link', 'link[rel="canonical"]', { rel: 'canonical', href: props.canonical });
    }

    if (props.robots) {
      upsert('meta', 'meta[name="robots"]', { name: 'robots', content: props.robots });
    }

    const og = props.og || {};
    upsert('meta', 'meta[property="og:title"]', { property: 'og:title', content: props.title });
    if (props.description) upsert('meta', 'meta[property="og:description"]', { property: 'og:description', content: props.description });
    if (og.url) upsert('meta', 'meta[property="og:url"]', { property: 'og:url', content: og.url });
    upsert('meta', 'meta[property="og:type"]', { property: 'og:type', content: og.type || 'website' });
    if (og.image) upsert('meta', 'meta[property="og:image"]', { property: 'og:image', content: og.image });

    upsert('meta', 'meta[name="twitter:card"]', { name: 'twitter:card', content: props.twitterCard || 'summary_large_image' });

    document.head.querySelectorAll('script[data-seo-jsonld]').forEach(n => n.remove());
    (props.jsonLd || []).forEach(block => {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.setAttribute('data-seo-jsonld', '1');
      s.textContent = JSON.stringify(block);
      document.head.appendChild(s);
    });

    return () => {
      
    };
  }, [props.title, props.description, props.keywords, props.canonical, props.robots, JSON.stringify(props.og), props.twitterCard, JSON.stringify(props.jsonLd)]);

  return null;
}
