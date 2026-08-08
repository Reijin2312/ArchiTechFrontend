import { useWallpaper } from '@/shared/ui/wallpaper/useWallpaper';
import { Seo } from '@/shared/seo/seo';
import { routesMeta } from '@/shared/seo/routesMeta';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { LeftNav as BaseLeftNav, Section as BaseSection, Callout, pageVariants } from '@/shared/ui/layout/PageSidebar';
import { useIsMobile } from '@/shared/ui/utils/useIsMobile';
import { LAUNCHER_DOWNLOAD_URL, WIKI_URL } from '@/shared/constants';
import { useI18n } from '@/shared/i18n/I18nProvider';

export default function ShopPage() {
  useWallpaper();
  const isMobile = useIsMobile();
  const { t } = useI18n();

  return (
    <>
      <Seo {...routesMeta['/start']} />
      <motion.div
        className="mx-auto w-full max-w-7xl grid grid-cols-12 gap-6 px-4 py-6 text-slate-100"
        variants={isMobile ? undefined : pageVariants}
        initial={isMobile ? false : 'hidden'}
        animate={isMobile ? false : 'show'}
      >
        <aside className="col-span-12 md:col-span-3">
          <BaseLeftNav disableMotion={isMobile} items={[
            { id: 'price', title: t('start.access') },
            { id: 'how', title: t('start.how') },
            { id: 'discounts', title: t('start.launcher') },
            { id: 'policy', title: t('start.modpack') },
            { id: 'faq', title: t('start.security') },
          ]} blurIntensity="xl" bgOpacity="60" />
        </aside>

        <main className="col-span-12 md:col-span-6">
          <h1 className="mb-4 text-3xl font-bold text-[22px] md:text-[24px] text-center">{t('start.title')}</h1>

          <Callout title={t('start.freeAccess')}>
            <p className="text-sm text-slate-300">
              {t('start.lead')}
            </p>
          </Callout>

          <BaseSection id="how" n={1} title={t('start.registration')} disableMotion={isMobile}>
            <ol className="list-decimal pl-6 space-y-2 text-slate-300">
              <li><Link to="/auth/register" className="text-sky-300 underline underline-offset-2 hover:text-sky-200">{t('start.step1Link')}</Link>.</li>
              <li><a href={LAUNCHER_DOWNLOAD_URL} className="text-sky-300 underline underline-offset-2 hover:text-sky-200">{t('start.step2Link')}</a> {t('start.step2Tail')}</li>
              <li>{t('start.step3')}</li>
              <li>{t('start.step4')}</li>
            </ol>
          </BaseSection>

          <BaseSection id="discounts" n={2} title={t('start.launcher')} disableMotion={isMobile}>
            <p className="text-slate-300 text-sm">
              {t('start.launcherText')}
            </p>
            <a href={LAUNCHER_DOWNLOAD_URL} className="mt-4 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm hover:bg-indigo-500">
              {t('start.downloadLauncher')}
            </a>
          </BaseSection>

          <BaseSection id="policy" n={3} title={t('start.modpackTitle')} disableMotion={isMobile}>
            <p className="text-slate-300 text-sm">
              {t('start.modpackText')}
            </p>
            <a href={`${WIKI_URL}#mods`} className="mt-3 inline-flex text-sm text-sky-300 underline underline-offset-2 hover:text-sky-200">
              {t('start.modpackLink')}
            </a>
          </BaseSection>

          <BaseSection id="faq" n={4} title={t('start.security')} disableMotion={isMobile}>
            <dl className="space-y-3">
              <QA q={t('start.licenseQuestion')}>
                {t('start.licenseAnswer')}
              </QA>
              <QA q={t('start.sourceQuestion')}>
                {t('start.sourceBefore')} <a href="https://github.com/Reijin2312/ArchiTech_Launcher" target="_blank" rel="noreferrer noopener" className="text-sky-300 underline underline-offset-2 hover:text-sky-200">{t('start.officialGithub')}</a>.
              </QA>
            </dl>
          </BaseSection>
        </main>

        <aside className="col-span-12 md:col-span-3">
          <RightBox />
        </aside>
      </motion.div>
    </>
  );
}

function RightBox() {
  const { t } = useI18n();
  return (
    <div className="sticky top-20 space-y-3">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md backdrop-saturate-150">
        <div className="text-sm text-sky-300">{t('start.ready')}</div>
        <div className="mt-1 text-lg font-semibold">{t('start.readyAction')}</div>
        <p className="mt-2 text-xs text-slate-400">{t('start.readyText')}</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300 backdrop-blur-md backdrop-saturate-150">
        <div className="font-semibold mb-1 text-sky-300">{t('start.noManual')}</div>
        {t('start.noManualText')}
      </div>
    </div>
  );
}

function QA({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 backdrop-blur-md backdrop-saturate-150">
      <div className="font-semibold">{q}</div>
      <div className="mt-1 text-slate-300 text-sm">{children}</div>
    </div>
  );
}
