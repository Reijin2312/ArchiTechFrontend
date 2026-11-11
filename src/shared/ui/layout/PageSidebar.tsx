import { useEffect, useRef, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { useI18n } from '@/shared/i18n/I18nProvider';

export type TocItem = { id: string; title: string; n?: number };

export const sideNavVariants: Variants = {
  hidden: { x: -16 },
  show: {
    x: 0,
    transition: { duration: 0.45, ease: 'easeOut' },
  },
};

export const tocVariants: Variants = {
  hidden: { x: 16 },
  show: {
    x: 0,
    transition: { duration: 0.45, ease: 'easeOut', delay: 0.05 },
  },
};

export const pageVariants: Variants = {
  hidden: { y: 24 },
  show: {
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

export const sectionVariants: Variants = {
  hidden: { y: 14, scale: 0.98 },
  show: {
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
};

type LeftNavProps = {
  items: TocItem[];
  blurIntensity?: 'md' | 'xl';
  bgOpacity?: '40' | '60';
  disableMotion?: boolean;
};

export function LeftNav({ items, blurIntensity = 'md', bgOpacity = '40', disableMotion = false }: LeftNavProps) {
  const { language } = useI18n();
  const blurClass = blurIntensity === 'xl' ? 'backdrop-blur-xl' : 'backdrop-blur-md';
  const bgClass = bgOpacity === '60' ? 'bg-[color:var(--ui-deep)]' : 'bg-[color:var(--ui-deep)]';
  
  return (
    <nav className={`sticky top-20 rounded-2xl border border-[color:var(--ui-line)] ${bgClass} p-4 ${blurClass} backdrop-saturate-150`}>
      <motion.div
        variants={disableMotion ? undefined : sideNavVariants}
        initial={disableMotion ? false : 'hidden'}
        animate={disableMotion ? false : 'show'}
      >
        <h2 className="mb-3 text-[color:var(--ui-accent)] text-sm font-semibold">{language === 'ru' ? 'Разделы' : 'Sections'}</h2>
        <ul className="space-y-2 text-sm">
          {items.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-[color:var(--ui-secondary)] hover:text-[color:var(--ui-nav-hover)]">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </motion.div>
    </nav>
  );
}

type RightTocProps = {
  items: TocItem[];
  blurIntensity?: 'md' | 'xl';
  bgOpacity?: '40' | '60';
  linkTransition?: boolean;
  disableMotion?: boolean;
};

export function RightToc({
  items,
  blurIntensity = 'md',
  bgOpacity = '40',
  linkTransition = false,
  disableMotion = false,
}: RightTocProps) {
  const { language } = useI18n();
  const [active, setActive] = useState(items[0]?.id);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (disableMotion) {
      observer.current?.disconnect();
      observer.current = null;
      return;
    }

    const headers = items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    observer.current?.disconnect();
    observer.current = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(vis.target.id);
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5, 1] }
    );
    headers.forEach((h) => observer.current!.observe(h));
    return () => observer.current?.disconnect();
  }, [items, disableMotion]);

  const blurClass = blurIntensity === 'xl' ? 'backdrop-blur-xl' : 'backdrop-blur-md';
  const bgClass = bgOpacity === '60' ? 'bg-[color:var(--ui-deep)]' : 'bg-[color:var(--ui-deep)]';
  
  return (
    <nav className={`sticky top-20 rounded-2xl border border-[color:var(--ui-line)] ${bgClass} p-4 ${blurClass} backdrop-saturate-150`}>
      <motion.div
        variants={disableMotion ? undefined : tocVariants}
        initial={disableMotion ? false : 'hidden'}
        animate={disableMotion ? false : 'show'}
      >
        <div className="mb-2 text-[color:var(--ui-secondary)] text-sm">{language === 'ru' ? 'На этой странице' : 'On this page'}</div>
        <ol className="space-y-2 text-sm">
          {items.map((it, i) => {
            const on = active === it.id;
            return (
              <li key={it.id} className="flex items-start gap-2">
                <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${on ? 'border-[color:var(--ui-accent)] bg-[color:var(--ui-nav-active-bg)] text-[color:var(--ui-nav-active-text)]' : 'border-[color:var(--ui-nav-inactive-border)] bg-[color:var(--ui-nav-inactive-bg)] text-[color:var(--ui-muted)]'}`}>
                  {i + 1}
                </span>
                <a
                  href={`#${it.id}`}
                  className={`${on ? 'text-[color:var(--ui-accent)]' : 'text-[color:var(--ui-secondary)] hover:text-[color:var(--ui-nav-hover)]'}${linkTransition ? ' transition-colors' : ''}`}
                >
                  {it.title}
                </a>
              </li>
            );
          })}
        </ol>
      </motion.div>
    </nav>
  );
}

type SectionProps = {
  id: string;
  title: string;
  n: number;
  children: React.ReactNode;
  disableMotion?: boolean;
};

export function Section({ id, title, n, children, disableMotion = false }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-24">
      <motion.div
        variants={disableMotion ? undefined : sectionVariants}
        initial={disableMotion ? false : 'hidden'}
        whileInView={disableMotion ? undefined : 'show'}
        viewport={disableMotion ? undefined : { once: true, amount: 0.01 }}
      >
        <h2 className="mb-3 inline-flex items-center gap-2 rounded-full bg-[color:var(--ui-surface)] px-3 py-1.5 text-lg font-semibold">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--ui-accent-fill)] text-[color:var(--ui-accent-fill-ink)] text-sm">{n}</span>
          {title}
        </h2>
        <div className="mb-8 rounded-2xl border border-[color:var(--ui-line)] bg-[color:var(--ui-surface)] p-4 backdrop-blur-md backdrop-saturate-150">{children}</div>
      </motion.div>
    </section>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-md border border-[color:var(--ui-line)] bg-[color:var(--ui-surface)] px-1.5 py-0.5 text-xs">{children}</kbd>;
}

type CalloutProps = {
  title: string;
  children: React.ReactNode;
};

export function Callout({ title, children }: CalloutProps) {
  return (
    <div className="mb-6 rounded-2xl border border-[color:var(--ui-line)] bg-[color:var(--ui-surface)] p-4 backdrop-blur-md backdrop-saturate-150">
      <div className="mb-1 text-base font-semibold">{title}</div>
      {children}
    </div>
  );
}
