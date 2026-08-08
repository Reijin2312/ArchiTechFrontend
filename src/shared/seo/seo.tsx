import { useEffect } from 'react';
import { useI18n } from '@/shared/i18n/I18nProvider';

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
  const { language } = useI18n();
  const route = props.canonical ? new URL(props.canonical).pathname : undefined;
  const english = language === 'en' && route ? ENGLISH_META[route] : undefined;
  const title = english?.title ?? props.title;
  const description = english?.description ?? props.description;

  useEffect(() => {
    document.title = title;

    if (description) {
      upsert('meta', 'meta[name="description"]', { name: 'description', content: description });
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
    upsert('meta', 'meta[property="og:title"]', { property: 'og:title', content: title });
    if (description) upsert('meta', 'meta[property="og:description"]', { property: 'og:description', content: description });
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
  }, [title, description, props.keywords, props.canonical, props.robots, JSON.stringify(props.og), props.twitterCard, JSON.stringify(props.jsonLd)]);

  return null;
}

const ENGLISH_META: Record<string, { title: string; description: string }> = {
  '/': { title: 'ArchiTech MC — modded Minecraft tech and magic server', description: 'A cozy Minecraft 1.21.1 NeoForge server with Create, Create: Aeronautics, Ars Nouveau, long-running worlds, and free access.' },
  '/wiki': { title: 'ArchiTech MC Wiki — modpack, guides, and commands', description: 'Current ArchiTech MC mod list, getting-started guide, server commands, progression, and performance tips.' },
  '/about': { title: 'About ArchiTech MC — a persistent modded Minecraft world', description: 'Learn about ArchiTech MC, its no-wipe world, tech-and-magic modpack, custom ports, and season history.' },
  '/rules': { title: 'ArchiTech MC server rules', description: 'Rules for fair play, communication, building, automation, trading, and account safety on ArchiTech MC.' },
  '/start': { title: 'How to start playing on ArchiTech MC', description: 'Create a free account, download the official launcher, and join ArchiTech MC without manual server setup.' },
  '/contacts': { title: 'ArchiTech MC contacts and support', description: 'Official ArchiTech MC support contacts, Discord, Telegram, and email.' },
  '/privacy': { title: 'ArchiTech MC Privacy Policy', description: 'How ArchiTech MC collects, uses, stores, and protects personal data.' },
  '/terms': { title: 'ArchiTech MC Terms of Use', description: 'Terms governing use of the ArchiTech MC website, launcher, accounts, and game services.' },
};
