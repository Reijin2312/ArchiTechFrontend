import { useEffect, useMemo, useRef, useState } from 'react';

type TocItem = { id: string; title: string; n: number };
const SECTIONS: TocItem[] = [
  { id: 'id1', title: 'Общие положения', n: 1 },
  { id: 'id2', title: 'Состав данных и цели обработки', n: 2 },
  { id: 'id3', title: 'Cookies и подобные технологии', n: 3 },
  { id: 'id4', title: 'Правовые основания обработки', n: 4 },
  { id: 'id5', title: 'Передача третьим лицам и трансграничная передача', n: 5 },
  { id: 'id6', title: 'Права пользователя (субъекта персональных данных)', n: 6 },
  { id: 'id7', title: 'Сроки хранения и безопасность', n: 7 },
  { id: 'id8', title: 'Ссылки на сторонние ресурсы', n: 8 },
  { id: 'id9', title: 'Коммуникации и рассылки', n: 9 },
  { id: 'id10', title: 'Ограничение ответственности', n: 10 },
  { id: 'id11', title: 'Порядок разрешения споров', n: 11 },
  { id: 'id12', title: 'Изменения Политики', n: 12 },
  { id: 'id13', title: 'Контакты оператора', n: 13 },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto w-full max-w-7xl grid grid-cols-12 gap-6 px-4 py-6 text-slate-100">
      <aside className="col-span-12 md:col-span-3">
        <LeftNav />
      </aside>

      <main className="col-span-12 md:col-span-6">
        <h1 className="mb-4 text-3xl font-bold">Политика конфиденциальности проекта</h1>
        <Callout />

        <Section id="id1" title="Общие положения" n={1}>
         <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li>Обработка персональных данных осуществляется по праву Российской Федерации, включая Федеральный закон № 152‑ФЗ «О персональных данных» и связанные акты.</li>
            <li>Политика является неотъемлемой частью Пользовательского соглашения и действует во всей экосистеме «ArchiTech» (веб‑сайт https://architech-mc.ru и поддомены, игровые серверы, магазин, Wiki, карта, API и иные сервисы).</li>
            <li>Политика распространяется исключительно на наши Сервисы. Мы не контролируем и не отвечаем за сайты третьих лиц, на которые могут вести ссылки из Сервисов.</li>
            <li>Актуальная редакция Политики публикуется на Сайте. Мы вправе изменять Политику без отдельного уведомления. Продолжение использования Сервисов после публикации новой редакции означает согласие с изменениями.</li>
          </ol>
        </Section>

        <Section id="id2" title="Состав данных и цели обработки" n={2}>
          <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li>
              Мы можем получать следующие категории данных:
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li><b>Идентификационные данные:</b> адрес электронной почты; игровые и внешние публичные идентификаторы, привязанные к аккаунту; никнейм.</li>
                <li><b>Технические данные:</b> IP-адрес, заголовки запросов, информация о браузере/клиенте, файлы cookie и иные идентификаторы, дата и время обращений, параметры сессии, лог-записи системы.</li>
                <li><b>Данные об активности:</b> действия в аккаунте, обращения в поддержку, факты нарушений правил, операции во внутриигровых сервисах.</li>
              </ul>
            </li>

            <li>
              Цели обработки:
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>регистрация и аутентификация пользователей; предоставление доступа к функционалу Сервисов;</li>
                <li>обеспечение безопасности, предотвращение мошенничества, расследование инцидентов;</li>
                <li>соблюдение законодательства и выполнение Пользовательского соглашения и внутренних правил;</li>
                <li>статистика, аналитика, техническая поддержка, развитие и оптимизация Сервисов;</li>
                <li>информирование о существенных изменениях в работе Сервисов и правилах;</li>
                <li>в случаях, предусмотренных законом, рассылка сообщений сервисного и информационного характера.</li>
              </ul>
            </li>

            <li>Данные, поступающие автоматически при сетевых соединениях и фиксируемые в системных журналах, используются для администрирования, информационной безопасности и статистики.</li>
          </ol>
        </Section>


        <Section id="id3" title="Cookies и подобные технологии" n={3}>
          <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li>Мы используем cookies и иные локальные идентификаторы для обеспечения работы Сервисов, а также для статистики и улучшения пользовательского опыта.</li>
            <li>Вы можете ограничить или отключить использование cookies в настройках браузера. Это может повлиять на доступность отдельных функций.</li>
          </ol>
        </Section>

        <Section id="id4" title="Правовые основания обработки" n={4}>
          <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li>Обработка осуществляется на одном или нескольких основаниях: согласие пользователя; исполнение договора (Пользовательского соглашения); исполнение требований закона; реализация законных интересов Администрации при соблюдении прав субъектов данных.</li>
          </ol>
        </Section>

        <Section id="id5" title="Передача третьим лицам и трансграничная передача" n={5}>
          <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li> Мы можем поручать обработку данных уполномоченным лицам (процессорам) при условии заключения договора о конфиденциальности и безопасности. </li>
            <li> Передача данных третьим лицам также возможна, если она необходима для: исполнения закона; предотвращения злоупотреблений; защиты прав и законных интересов «ArchiTech» и/или третьих лиц; исполнения запросов госорганов при наличии законных оснований.</li>
            <li> Трансграничная передача допускается при соблюдении требований законодательства о персональных данных. </li>
          </ol>
        </Section>

        <Section id="id6" title="Права пользователя (субъекта персональных данных)" n={6}>
          <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li>
              Пользователь вправе:
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>запрашивать сведения об обработке своих персональных данных;</li>
                <li>требовать уточнения, блокирования или удаления данных при наличии оснований, предусмотренных законом;</li>
                <li>отзывать согласие на обработку данных, если обработка основана на согласии;</li>
                <li>обжаловать действия или бездействие оператора данных в уполномоченный орган или в суд.</li>
              </ul>
            </li>

            <li> При отзыве согласия часть функций Сервисов может стать недоступной. </li>
          </ol>
        </Section>

        <Section id="id7" title="Сроки хранения и безопасность" n={7}>
          <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li>Данные хранятся столько, сколько необходимо для целей обработки, либо в сроки, установленные законом и внутренними регламентами.</li>
            <li>Мы применяем организационные и технические меры защиты, соразмерные рискам, включая контроль доступа, журналирование, резервное копирование и защиту каналов связи.</li>
            <li>Пользователь обязан соблюдать меры по защите своего аккаунта и средств аутентификации. Риски, связанные с передачей учетных данных третьим лицам, несет Пользователь.</li>
          </ol>
        </Section>

        <Section id="id8" title="Ссылки на сторонние ресурсы" n={8}>
          <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li>Мы не отвечаем за содержание и политику обработки данных на сайтах третьих лиц, даже если ссылки на них размещены в наших Сервисах. Перед вводом данных рекомендуем ознакомиться с их политиками конфиденциальности.</li>
          </ol>
        </Section>

        <Section id="id9" title="Коммуникации и рассылки" n={9}>
          <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li>Мы можем направлять сервисные сообщения о важных изменениях и событиях, влияющих на использование Сервисов.</li>
            <li>Информационные и маркетинговые сообщения направляются при наличии соответствующего правового основания и могут быть отключены через предусмотренные механизмы.</li>
          </ol>
        </Section>

        <Section id="id10" title="Ограничение ответственности" n={10}>
          <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li>Мы стремимся выполнять эту Политику, но не можем гарантировать абсолютную защиту при воздействии факторов вне нашего контроля.</li>
            <li>Сервисы и размещённая информация предоставляются по принципу «как есть». Мы не отвечаем за убытки, вызванные ограничением доступа к Сервисам или сбоями инфраструктуры, если иное не предусмотрено законом.</li>
          </ol>
        </Section>

        <Section id="id11" title="Порядок разрешения споров" n={11}>
          <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li>До обращения в суд стороны предпринимают попытку досудебного урегулирования: обмен претензиями в письменной форме и срок ответа до 30 календарных дней с даты получения.</li>
            <li>Споры подлежат разрешению по праву Российской Федерации с подсудностью по месту нахождения Администрации, если иное не установлено императивными нормами.</li>
          </ol>
        </Section>

        <Section id="id12" title="Изменения Политики" n={12}>
          <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li>Мы вправе обновлять Политику. Дата публикации текущей редакции указана в начале документа. Продолжение использования Сервисов означает согласие с новой редакцией.</li>
          </ol>
        </Section>

        <Section id="id13" title="Контакты оператора" n={13}>
          <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <p className="text-slate-300">
            По вопросам обработки персональных данных и реализации прав субъектов данных: privacy@architech-mc.ru.
            </p>
          </ol>
        </Section>
      </main>

      <aside className="col-span-12 md:col-span-3">
        <RightToc items={SECTIONS} />
      </aside>
    </div>
  );
}

function LeftNav() {
  return (
    <nav className="sticky top-20">
      <h2 className="mb-3 text-sky-400 text-sm font-semibold">Разделы</h2>
      <ul className="space-y-2 text-sm">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="text-slate-300 hover:text-sky-300">
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function RightToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
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
  }, [items]);

  return (
    <nav className="sticky top-20">
      <div className="mb-2 text-slate-300 text-sm">На этой странице</div>
      <ol className="space-y-2 text-sm">
        {items.map((it, i) => {
          const on = active === it.id;
          return (
            <li key={it.id} className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-700 text-xs text-slate-400">
                {i + 1}
              </span>
              <a href={`#${it.id}`} className={on ? 'text-sky-300' : 'text-slate-300 hover:text-sky-300'}>
                {it.title}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Section({ id, title, n, children }: { id: string; title: string; n: number; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1.5 text-lg font-semibold">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-slate-50 text-sm">{n}</span>
        {title}
      </h2>
      <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">{children}</div>
    </section>
  );
}

function Callout() {
  return (
    <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-1 text-base font-semibold">Подсказка по навигации</div>
      <ul className="text-sm text-slate-300 space-y-1">
        <li>Переходите по разделам слева или используйте быстрый поиск по странице: <Kbd>Ctrl</Kbd> + <Kbd>F</Kbd> (Windows / Linux), <Kbd>Cmd</Kbd> + <Kbd>F</Kbd> (macOS).</li>
      </ul>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-xs">{children}</kbd>;
}
