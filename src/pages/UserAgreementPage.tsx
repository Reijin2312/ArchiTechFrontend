import { useWallpaper } from '@/shared/ui/useWallpaper';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Seo } from '@/shared/seo/seo';
import { routesMeta } from '@/shared/seo/routesMeta';

type TocItem = { id: string; title: string; n: number };
const SECTIONS: TocItem[] = [
  { id: 'id1', title: 'Общие условия', n: 1 },
  { id: 'id2', title: 'Обязанности Пользователя', n: 2 },
  { id: 'id3', title: 'Отказ от гарантий', n: 3 },
  { id: 'id4', title: 'Контент и модерация', n: 4 },
  { id: 'id5', title: 'Интеллектуальная собственность', n: 5 },
  { id: 'id6', title: 'Меры и ограничения', n: 6 },
  { id: 'id7', title: 'Оборот игрового контента', n: 7 },
  { id: 'id8', title: 'Операции с доступом и Аккаунтами', n: 8 },
  { id: 'id9', title: 'Персональные данные', n: 9 },
  { id: 'id10', title: 'Прочие условия', n: 10 },
];

export default function UserAgreementPage() {
  useWallpaper();

  return (
    <>
    <Seo {...routesMeta['/terms']} />
    <div className="mx-auto w-full max-w-7xl grid grid-cols-12 gap-6 px-4 py-6 text-slate-100">
      <aside className="col-span-12 md:col-span-3">
        <LeftNav />
      </aside>

      <main className="col-span-12 md:col-span-6">
        <h1 className="mb-4 text-3xl font-bold text-[22px] md:text-[24px] text-center">Пользовательское соглашение</h1>
        <Callout />

        <Section id="id1" title="Общие условия" n={1}>
         <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li>Использование Сервисов регулируется законодательством Российской Федерации.</li>
            <li>Соглашение является публичной офертой. Доступ к Сервисам означает присоединение к Соглашению.</li>
            <li>При несогласии с Условиями Пользователь обязан прекратить использование Сервисов.</li>
            <li>Администрация вправе в одностороннем порядке обновлять Соглашение. Новая редакция вступает в силу с момента публикации на Сайте. Если Пользователь не согласен с изменениями, он обязан отказаться от доступа и использования Сервисов.</li>
          </ol>
        </Section>

        <Section id="id2" title="Обязанности Пользователя" n={2}>
          <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li>Пользователь обязуется воздерживаться от действий, нарушающих законодательство РФ и/или нормы международного права, в том числе в сфере охраны интеллектуальной собственности, а также от действий, способных нарушить нормальную работу Сервисов (взлом, DDoS, злоупотребление уязвимостями и т. п.).</li>
            <li>Размещаемые Пользователем Контент и данные не должны противоречить законодательству РФ и общепринятым нормам морали и нравственности.</li>
            <li>Администрация не несет ответственность за внешние ресурсы, ссылки на которые могут присутствовать в Сервисах. Переход по внешним ссылкам осуществляется Пользователем на свой риск.</li>
            <li>Пользователь соглашается, что Администрация не несет ответственности (прямой или косвенной) за убытки/потери, причиненные использованием внешних ресурсов, товаров, услуг или информации, доступных по ссылкам из Сервисов, а также за последствия контактов, установленных Пользователем на основании такой информации.</li>
          </ol>
        </Section>

        <Section id="id3" title="Отказ от гарантий" n={3}>
          <p className="text-slate-300">
            Сервисы и услуги поддержки предоставляются <b>«КАК ЕСТЬ»</b>. Администрация отказывается от любых гарантий, явных или подразумеваемых, включая гарантию товарной пригодности, соответствия конкретной цели и ненарушения прав третьих лиц. Администрация не гарантирует бесперебойную и безошибочную работу Сервисов и/или материалов, а также получение Пользователем ожидаемых результатов от их использования.
          </p>
        </Section>

        <Section id="id4" title="Контент и модерация" n={4}>
          <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li> За Контент, публикуемый Пользователем, ответственность несет исключительно Пользователь. </li>
            <li> Администрация вправе по собственному усмотрению просматривать, редактировать, перемещать или удалять любой пользовательский Контент без предварительного уведомления и объяснения причин. </li>
            <li>Запрещается размещать Контент, нарушающий законодательство РФ или международное право, а также порнографические материалы, оскорбления, пропаганду ненависти и дискриминации. Дополнительные требования изложены в Правилах сервера.</li>
          </ol>
        </Section>

        <Section id="id5" title="Интеллектуальная собственность" n={5}>
          <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li> Права на Контент, размещенный Пользователями, принадлежат их правообладателям. </li>
            <li> Размещая Контент в Сервисах, Пользователь подтверждает наличие необходимых прав и не возражает против технической обработки Контента, необходимой для функционирования Сервисов (хранение, передача, отображение). Все права третьих лиц сохраняются за их владельцами. </li>
          </ol>
        </Section>

        <Section id="id6" title="Меры и ограничения" n={6}>
          <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li>Решение о том, нарушает ли конкретный Аккаунт Соглашение/политику, принимается Администрацией.</li>
            <li>Нарушение Соглашения может повлечь блокировку доступа к Сервисам, а также иные меры, предусмотренные законом. Администрация вправе сохранять техническую информацию, необходимую для идентификации нарушителей.</li>
            <li>Администрация вправе применять санкции и за нарушения, прямо не перечисленные в Соглашении и/или политиках, если они очевидно противоречат духу и целям проекта.</li>
            <li>Попытки давления на Администрацию с целью отмены ограничений могут привести к усилению примененных мер.</li>
            <li>Запрещено создавать/использовать дополнительные Аккаунты для обхода ограничений.</li>
            <li>Изменение данных Аккаунта не отменяет ранее наложенных ограничений и не восстанавливает доступ автоматически.</li>
          </ol>
        </Section>

        <Section id="id7" title="Оборот игрового контента" n={7}>
          <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li>Продажа/обмен Игрового контента допускается только за внутриигровую валюту в порядке, установленном Правилами сервера.</li>
            <li>Продажа/обмен Игрового контента за фиатные деньги, криптовалюту или иные ценности «в реале» запрещены и могут повлечь применение ограничений.</li>
          </ol>
        </Section>

        <Section id="id8" title="Операции с доступом и Аккаунтами" n={8}>
          <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li>Запрещены продажа и передача Игрового аккаунта с активным доступом на Игровые серверы.</li>
            <li>Запрещена продажа привязанных аккаунтов сторонних сервисов (соцсетей и т. п.), если они связаны с Аккаунтом, имеющим доступ на серверы.</li>
            <li>Запрещены продажа/передача доступа, персональных промокодов, баланса без прямого согласования с Администрацией. </li>
          </ol>
        </Section>

        <Section id="id9" title="Персональные данные" n={9}>
          <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li>Обработка персональных данных осуществляется в соответствии с Федеральным законом РФ от 27.07.2006 № 152‑ФЗ «О персональных данных».</li>
            <li>Цель обработки — исполнение настоящего Соглашения и обеспечение работы Сервисов. Обрабатываться могут следующие данные: адрес электронной почты; IP‑адрес; публичные идентификаторы сторонних сервисов, привязанных к Аккаунту; дата и время обращений к Сервисам; сведения об активности в Сервисах.</li>
            <li>Регистрируясь и/или используя Сервисы, Пользователь уведомлен о сборе и дает согласие на обработку указанных персональных данных, включая их передачу и хранение, на срок до отзыва согласия. </li>
            <li>Отозвать согласие можно по адресу: privacy@architech-mc.ru. В случае отзыва согласия доступ к Сервисам может быть прекращен (в т. ч. из‑за невозможности их предоставления без обработки данных).</li>
          </ol>
        </Section>

        <Section id="id10" title="Прочие условия" n={10}>
          <ol className="list-decimal pl-6 space-y-2 text-slate-300">
            <li>Все споры, вытекающие из Соглашения или связанные с ним, подлежат разрешению по праву Российской Федерации.</li>
            <li>Соглашение не создает между Пользователем и Администрацией отношений агентирования, товарищества, совместной деятельности, трудовых отношений и иных отношений, прямо не предусмотренных настоящим документом.</li>
            <li>Пользователь подтверждает, что ознакомлен со всеми пунктами Соглашения и принимает их в полном объеме.</li>
            <li>Принимая Условия, вы также соглашаетесь с Правилами сервера: https://architech-mc.ru/rules.</li>
            <li>Политика возврата средств: https://architech-mc.ru/wiki/legal/refund-policy.</li>
            <li>Политика бездействия: https://architech-mc.ru/wiki/legal/inactivity-policy.</li>
          </ol>
        </Section>
      </main>

      <aside className="col-span-12 md:col-span-3">
        <RightToc items={SECTIONS} />
      </aside>
    </div>
    </>
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
      <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md backdrop-saturate-150">{children}</div>
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
