import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '@/shared/seo/seo';
import { routesMeta } from '@/shared/seo/routesMeta';
import { motion } from 'framer-motion';
import { LeftNav as BaseLeftNav, RightToc as BaseRightToc, Section as BaseSection, Kbd, Callout, pageVariants } from '@/shared/ui/layout/PageSidebar';
import { useIsMobile } from '@/shared/ui/utils/useIsMobile';
import { ModCatalogSection } from '@/pages/public/wiki/ModCatalogSection';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { LAUNCHER_DOWNLOAD_URL } from '@/shared/constants';
import type { TranslationKey } from '@/shared/i18n/translations';
import './DocumentPages.atelier.css';

export type WikiTocItem = { id: string; title: string; n: number };
export const WIKI_SECTIONS: WikiTocItem[] = [
  { id: 'intro', title: 'О сервере и тематика', n: 1 },
  { id: 'start', title: 'Как начать играть', n: 2 },
  { id: 'mods', title: 'Список модов', n: 3 },
  { id: 'progress', title: 'Рекомендуемый маршрут', n: 4 },
  { id: 'commands', title: 'Команды сервера', n: 5 },
  { id: 'economy', title: 'Экономика', n: 6 },
  { id: 'perf', title: 'Производительность', n: 7 },
  { id: 'help', title: 'Если что-то не работает', n: 8 },
  { id: 'faq', title: 'FAQ', n: 9 },
  { id: 'links', title: 'Ссылки', n: 10 },
];

type Cmd = { cmd: string; descKey: TranslationKey };
const CMDS: Cmd[] = [
  { cmd: '/msg <player> <message>', descKey: 'wiki.cmdMessage' },
];

export default function WikiPage() {
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const sections = useMemo(() => WIKI_SECTIONS.map((item) => ({ ...item, title: wikiSectionTitle(item.id, t) })), [t]);

  const Section = (props: ComponentProps<typeof BaseSection>) => (
    <BaseSection {...props} disableMotion={isMobile} />
  );
  const LeftNav = (props: ComponentProps<typeof BaseLeftNav>) => (
    <BaseLeftNav {...props} disableMotion={isMobile} />
  );
  const RightToc = (props: ComponentProps<typeof BaseRightToc>) => (
    <BaseRightToc {...props} disableMotion={isMobile} />
  );

  return (
    <>
    <Seo {...routesMeta['/wiki']} />
    <motion.div
      className="architech-document architech-wiki mx-auto w-full max-w-7xl grid grid-cols-12 gap-6 px-4 py-6 text-[#f2efe9]"
      variants={isMobile ? undefined : pageVariants}
      initial={isMobile ? false : 'hidden'}
      animate={isMobile ? false : 'show'}
    >
      <aside className="hidden md:block md:col-span-3">
        <LeftNav items={sections} blurIntensity="xl" bgOpacity="60" />
      </aside>

      <main className="col-span-12 md:col-span-6">
        <h1 className="mb-4 text-3xl font-bold text-[22px] md:text-[24px] text-center">{t('wiki.title')}</h1>
        <Callout title={t('wiki.howToUse')}>
          <ul className="text-sm text-[#c9c4b9] space-y-1">
            <li>{t('wiki.howToUseNavigation')} <Kbd>Ctrl</Kbd> + <Kbd>F</Kbd> (Windows / Linux), <Kbd>Cmd</Kbd> + <Kbd>F</Kbd> (macOS).</li>
            <li>{t('wiki.howToUseMods')}</li>
          </ul>
        </Callout>

        <Section id="intro" title={t('wiki.sectionIntro')} n={1}>
          <p className="text-[#c9c4b9] ">
            {t('wiki.introFirstBefore')} <span className="text-[#c5aa84]">{t('wiki.introOneWorld')}</span>. {t('wiki.introThemeBefore')} <span className="text-[#c5aa84]">{t('wiki.introTheme')}</span>. {t('wiki.introGoal')}
          </p>
          <p className="text-[#c9c4b9]">
            {t('wiki.introSpawn')}
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[#c9c4b9]">
            <li>{t('wiki.packTechnology')}</li>
            <li>{t('wiki.packMagic')}</li>
            <li>{t('wiki.packWorld')}</li>
            <li>{t('wiki.packBuilding')}</li>
          </ul>
        </Section>

        <Section id="start" title={t('wiki.sectionStart')} n={2}>
          <p className="mb-3 text-[#c9c4b9]">{t('wiki.startIntro')}</p>
          <ol className="list-decimal pl-6 space-y-2 text-[#c9c4b9]">
            <li><Link to="/auth/register" className="text-[#c5aa84] hover:text-[#f1dbc0] hover:underline">{t('start.step1Link')}</Link>.</li>
            <li><a href={LAUNCHER_DOWNLOAD_URL} className="text-[#c5aa84] hover:text-[#f1dbc0] hover:underline">{t('start.step2Link')}</a> {t('start.step2Tail')}</li>
            <li>{t('start.step3')}</li>
            <li>{t('start.step4')}</li>
          </ol>
          <div className="mt-4 rounded-xl border border-[rgba(238,232,220,0.19)] bg-[#252620] p-4 text-sm text-[#c9c4b9]">
            <div className="mb-2 font-semibold text-[#c5aa84]">{t('wiki.firstMinutesTitle')}</div>
            <ul className="list-disc space-y-1 pl-5">
              <li>{t('wiki.firstMinutesJei')}</li>
              <li>{t('wiki.firstMinutesJade')}</li>
              <li>{t('wiki.firstMinutesMap')}</li>
              <li>{t('wiki.firstMinutesGuides')}</li>
            </ul>
          </div>
        </Section>

        <ModCatalogSection disableMotion={isMobile} />

        <Section id="progress" title={t('wiki.sectionProgress')} n={4}>
          <p className="mb-3 text-[#c9c4b9]">{t('wiki.progressIntro')}</p>
          <ul className="space-y-3 text-[#c9c4b9]">
            <li>
              <b>{t('wiki.progress1Title')}</b> {t('wiki.progress1')}
            </li>
            <li>
              <b>{t('wiki.progress2Title')}</b> {t('wiki.progress2')}
            </li>
            <li>
              <b>{t('wiki.progress3Title')}</b> {t('wiki.progress3')}
            </li>
            <li>
              <b>{t('wiki.progress4Title')}</b> {t('wiki.progress4')}
            </li>
            <li>
              <b>{t('wiki.progress5Title')}</b> {t('wiki.progress5')}
            </li>
          </ul>
        </Section>

        <CommandsSection disableMotion={isMobile} />

        <Section id="economy" title={t('wiki.sectionEconomy')} n={6}>
          <ul className="list-disc pl-5 space-y-1 text-[#c9c4b9]">
            <li>{t('wiki.economy1')}</li>
            <li>{t('wiki.economy2')}</li>
          </ul>
        </Section>

        <Section id="perf" title={t('wiki.sectionPerformance')} n={7}>
          <ul className="list-disc pl-5 space-y-1 text-[#c9c4b9]">
            <li>{t('wiki.performance1')}</li>
            <li>{t('wiki.performance2')}</li>
            <li>{t('wiki.performance3')}</li>
          </ul>
        </Section>

        <Section id="help" title={t('wiki.sectionHelp')} n={8}>
          <ol className="list-decimal space-y-2 pl-6 text-[#c9c4b9]">
            <li>{t('wiki.helpUpdate')}</li>
            <li>{t('wiki.helpCleanPack')}</li>
            <li>{t('wiki.helpRestart')}</li>
            <li>{t('wiki.helpLogs')}</li>
          </ol>
        </Section>

        <FaqSection disableMotion={isMobile} />

        <Section id="links" title={t('wiki.sectionLinks')} n={10}>
          <ul className="list-disc pl-5 text-[#c9c4b9]">
            <li><Link to="/rules" className="text-[#c5aa84] hover:text-[#f1dbc0]">{t('wiki.rulesLink')}</Link></li>
            <li><Link to="/start" className="text-[#c5aa84] hover:text-[#f1dbc0]">{t('wiki.startLink')}</Link></li>
            <li><Link to="/privacy" className="text-[#c5aa84] hover:text-[#f1dbc0]">{t('footer.privacy')}</Link></li>
            <li><Link to="/terms" className="text-[#c5aa84] hover:text-[#f1dbc0]">{t('footer.terms')}</Link></li>
          </ul>
        </Section>
      </main>

      <aside className="hidden md:block md:col-span-3">
        <RightToc items={sections} blurIntensity="xl" bgOpacity="60" linkTransition />
      </aside>
    </motion.div>
    </>
  );
}

type SectionComponentProps = ComponentProps<typeof BaseSection>;

function CommandsSection({ disableMotion }: { disableMotion: SectionComponentProps['disableMotion'] }) {
  const { t } = useI18n();

  return (
    <BaseSection id="commands" title={t('wiki.sectionCommands')} n={5} disableMotion={disableMotion}>
      <div className="grid gap-4">
        <CmdTable title={t('wiki.server')} items={CMDS} />
      </div>
    </BaseSection>
  );
}

function FaqSection({ disableMotion }: { disableMotion: SectionComponentProps['disableMotion'] }) {
  const { t } = useI18n();
  const qa = [
    { q: t('wiki.faqJoinQ'), a: t('wiki.faqJoinA') },
    { q: t('wiki.faqModsQ'), a: t('wiki.faqModsA') },
    { q: t('wiki.faqPvpQ'), a: t('wiki.faqPvpA') },
    { q: t('wiki.faqMoveQ'), a: t('wiki.faqMoveA') },
  ];
  return (
    <BaseSection id="faq" title={t('wiki.faqTitle')} n={9} disableMotion={disableMotion}>
      <div className="space-y-3">
        {qa.map((x) => (
          <div key={x.q} className="rounded-xl border border-[rgba(238,232,220,0.19)] bg-[#252620] p-3 backdrop-blur-md backdrop-saturate-150">
            <div className="font-semibold">{x.q}</div>
            <div className="mt-1 text-sm text-[#c9c4b9]">{x.a}</div>
          </div>
        ))}
      </div>
    </BaseSection>
  );
}

function CmdTable({ title, items }: { title: string; items: Cmd[] }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-[rgba(238,232,220,0.19)] bg-[#252620] p-4 backdrop-blur-md backdrop-saturate-150">
      <div className="mb-2 text-sm font-semibold text-[#c5aa84]">{title}</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#252620] text-[#c9c4b9]">
            <tr>
              <th className="px-3 py-2">{t('wiki.command')}</th>
              <th className="px-3 py-2">{t('wiki.description')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.cmd} className="border-t border-[rgba(238,232,220,0.19)]">
                <td className="px-3 py-2 text-[#c5aa84]">{c.cmd}</td>
                <td className="px-3 py-2 text-[#c9c4b9]">{t(c.descKey)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function wikiSectionTitle(id: string, t: (key: TranslationKey) => string) {
  const keys: Record<string, TranslationKey> = {
    intro: 'wiki.sectionIntro',
    start: 'wiki.sectionStart',
    mods: 'wiki.sectionMods',
    progress: 'wiki.sectionProgress',
    commands: 'wiki.sectionCommands',
    economy: 'wiki.sectionEconomy',
    perf: 'wiki.sectionPerformance',
    help: 'wiki.sectionHelp',
    faq: 'wiki.faqTitle',
    links: 'wiki.sectionLinks',
  };
  return t(keys[id] ?? 'wiki.title');
}
