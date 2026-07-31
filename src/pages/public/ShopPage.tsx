import { useWallpaper } from '@/shared/ui/wallpaper/useWallpaper';
import { Seo } from '@/shared/seo/seo';
import { routesMeta } from '@/shared/seo/routesMeta';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { LeftNav as BaseLeftNav, Section as BaseSection, Callout, pageVariants } from '@/shared/ui/layout/PageSidebar';
import { useIsMobile } from '@/shared/ui/utils/useIsMobile';
import { LAUNCHER_DOWNLOAD_URL, WIKI_URL } from '@/shared/constants';

export default function ShopPage() {
  useWallpaper();
  const isMobile = useIsMobile();

  return (
    <>
      <Seo {...routesMeta['/shop']} />
      <motion.div
        className="mx-auto w-full max-w-7xl grid grid-cols-12 gap-6 px-4 py-6 text-slate-100"
        variants={isMobile ? undefined : pageVariants}
        initial={isMobile ? false : 'hidden'}
        animate={isMobile ? false : 'show'}
      >
        <aside className="col-span-12 md:col-span-3">
          <BaseLeftNav disableMotion={isMobile} items={[
            { id: 'price', title: 'Доступ' },
            { id: 'how', title: 'Как начать' },
            { id: 'discounts', title: 'Лаунчер' },
            { id: 'policy', title: 'Сборка' },
            { id: 'faq', title: 'Безопасность' },
          ]} blurIntensity="xl" bgOpacity="60" />
        </aside>

        <main className="col-span-12 md:col-span-6">
          <h1 className="mb-4 text-3xl font-bold text-[22px] md:text-[24px] text-center">Как начать играть</h1>

          <Callout title="Бесплатный вход на ArchiTech MC">
            <p className="text-sm text-slate-300">
              Зарегистрируйтесь на сайте, скачайте лаунчер и войдите в аккаунт. Сервер сам появится в списке — останется нажать «Играть».
            </p>
          </Callout>

          <BaseSection id="how" n={1} title="Регистрация и вход" disableMotion={isMobile}>
            <ol className="list-decimal pl-6 space-y-2 text-slate-300">
              <li><Link to="/auth/register" className="text-sky-300 underline underline-offset-2 hover:text-sky-200">Зарегистрируйтесь на сайте ArchiTech</Link>.</li>
              <li><a href={LAUNCHER_DOWNLOAD_URL} className="text-sky-300 underline underline-offset-2 hover:text-sky-200">Скачайте лаунчер</a> и войдите в аккаунт.</li>
              <li>Запустите сборку через лаунчер.</li>
              <li>Нажмите «Играть» — сервер появится автоматически.</li>
            </ol>
          </BaseSection>

          <BaseSection id="discounts" n={2} title="Лаунчер" disableMotion={isMobile}>
            <p className="text-slate-300 text-sm">
              Лаунчер сам установит и обновит моды, чтобы не собирать клиент вручную.
            </p>
            <a href={LAUNCHER_DOWNLOAD_URL} className="mt-4 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm hover:bg-indigo-500">
              Скачать лаунчер
            </a>
          </BaseSection>

          <BaseSection id="policy" n={3} title="Сборка и сервер" disableMotion={isMobile}>
            <p className="text-slate-300 text-sm">
              Minecraft 1.21.1 NeoForge. В основе — Create, Create: Aeronautics, Ars Nouveau, аддоны и авторские порты BetterEnd и BetterNether.
            </p>
            <a href={`${WIKI_URL}#mods`} className="mt-3 inline-flex text-sm text-sky-300 underline underline-offset-2 hover:text-sky-200">
              Полный состав сборки — в вики
            </a>
          </BaseSection>

          <BaseSection id="faq" n={4} title="Безопасность" disableMotion={isMobile}>
            <dl className="space-y-3">
              <QA q="Нужна ли лицензия Minecraft?">
                Нет. Экосистема ArchiTech использует собственную систему аккаунтов для входа через лаунчер.
              </QA>
              <QA q="Можно проверить исходный код?">
                Да, исходный код лаунчера открыт в <a href="https://github.com/Reijin2312/ArchiTech_Launcher" target="_blank" rel="noreferrer noopener" className="text-sky-300 underline underline-offset-2 hover:text-sky-200">официальном GitHub</a>.
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
  return (
    <div className="sticky top-20 space-y-3">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md backdrop-saturate-150">
        <div className="text-sm text-sky-300">Готовы начать?</div>
        <div className="mt-1 text-lg font-semibold">Скачайте лаунчер</div>
        <p className="mt-2 text-xs text-slate-400">После входа сервер появится в списке автоматически.</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300 backdrop-blur-md backdrop-saturate-150">
        <div className="font-semibold mb-1 text-sky-300">Без ручной настройки</div>
        Лаунчер установит сборку и обновления сам.
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
