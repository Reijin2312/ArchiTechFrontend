import type { ComponentProps } from 'react';
import { Seo } from '@/shared/seo/seo';
import { routesMeta } from '@/shared/seo/routesMeta';
import { motion } from 'framer-motion';
import { LeftNav as BaseLeftNav, RightToc as BaseRightToc, Section as BaseSection, Kbd, Callout, pageVariants } from '@/shared/ui/layout/PageSidebar';
import { useIsMobile } from '@/shared/ui/utils/useIsMobile';
import { useI18n } from '@/shared/i18n/I18nProvider';
import './DocumentPages.atelier.css';

export type TocItem = { id: string; title: string };

export const SECTIONS: TocItem[] = [
  { id: 'intro', title: 'Введение' },
  { id: 'forbidden', title: 'Запрещено' },
  { id: 'chat', title: 'Общение' },
  { id: 'techmagic', title: 'Модификации и ресурс-паки' },
  { id: 'build', title: 'Строительство' },
  { id: 'farms', title: 'Фермы и механизмы' },
  { id: 'pvp', title: 'PVP / PVE' },
  { id: 'trade', title: 'Экономика и торговля' },
  { id: 'security', title: 'Безопасность и аккаунты' },
  { id: 'penalties', title: 'Наказания' },
];




export default function RulesPage() {
  const isMobile = useIsMobile();
  const { language } = useI18n();

  const Section = (props: ComponentProps<typeof BaseSection>) => (
    <BaseSection {...props} disableMotion={isMobile} />
  );
  const LeftNav = (props: ComponentProps<typeof BaseLeftNav>) => (
    <BaseLeftNav {...props} disableMotion={isMobile} />
  );
  const RightToc = (props: ComponentProps<typeof BaseRightToc>) => (
    <BaseRightToc {...props} disableMotion={isMobile} />
  );

  if (language === 'en') return <EnglishRules isMobile={isMobile} />;

  return (
    <>
    <Seo {...routesMeta['/rules']} />
    <motion.div
      className="architech-document architech-rules mx-auto w-full max-w-7xl grid grid-cols-12 gap-6 px-4 py-6 text-[#f2efe9]"
      variants={isMobile ? undefined : pageVariants}
      initial={isMobile ? false : 'hidden'}
      animate={isMobile ? false : 'show'}
    >
      <aside className="hidden md:block md:col-span-3">
        <LeftNav items={SECTIONS} blurIntensity="xl" bgOpacity="60" />
      </aside>
      
      <main className="col-span-12 md:col-span-6">
        <h1 className="mb-4 text-3xl font-bold text-center text-[22px] md:text-[24px]">Правила сервера</h1>
        <Callout title="Рекомендация">
          <ul className="text-sm text-[#c9c4b9] space-y-1">
            <li>Быстрый поиск по странице: <Kbd>Ctrl</Kbd> + <Kbd>F</Kbd> (Windows / Linux), <Kbd>Cmd</Kbd> + <Kbd>F</Kbd> (macOS).</li>
            <li>По оставшимся вопросам вы можете обратиться к администрации.</li>
          </ul>
        </Callout>

        <Section id="intro" title="Введение" n={1}>
          <p className="text-[#c9c4b9]">
            Сервер состоит из <span className="text-[#c5aa84]">одного мира</span>. Тематикой является <span className="text-[#c5aa84]">техномагия с особым упором на строительство</span>. 
            Наша цель — создать комфортное и стабильное место для общения и взаимодействия.
            Администрация оставляет за собой право принимать решения по ситуациям, явно не описанным в правилах.
          </p>
          <ul className="mt-3 list-disc pl-5 text-[#c9c4b9]">
            <li>Уважайте других игроков, помогайте новичкам, играйте честно.</li>
            <li>О любых нарушениях незамедлительно сообщайте модераторам.</li>
          </ul>
        </Section>

        <Section id="forbidden" title="Запрещено" n={2}>
          <ol className="list-decimal pl-6 space-y-3">
            <li><b>Гриферство.</b> Частичное или полное разрушение чужих построек без разрешения владельца.</li>
            <li><b>Оскорбительное поведение.</b> Мат, уничижительные выражения в адрес других игроков/администрации, за исключением случаев, когда это является своеобразным взаимным юмором. </li>
            <li><b>Токсичность.</b> Воспрепятствование общению, крики, громкие и повторяющиеся звуки, иные злоупотребления войс-чатом.</li>
            <li><b>Флуд и спам.</b> Бессмысленные или однотипные сообщения.</li>
            <li><b>Оффтоп</b> в тематических каналах/чатах.</li>
            <li><b>Вредоносный контент.</b> Вирусы, фишинг, шок-контент, подозрительные ссылки.</li>
            <li><b>Контент 18+.</b> Порнография и эротика в любых её проявлениях.</li>
            <li><b>Разглашение персональных данных</b> игроков без их согласия.</li>
            <li><b>Дезинформация</b> и подрыв репутации проекта.</li>
            <li><b>Выпрашивание привилегий</b> у игроков и администрации.</li>
            <li><b>Манипуляции с правилами</b> и поиски «лазеек» в целях оправдать собственные нарушения.</li>
            <li><b>Твинки</b> для обхода наказаний или получения выгоды.</li>
            <li><b>Читы/ПО, моды и ресурс-паки, дающие преимущество</b>, их реклама или пропаганда.</li>
            <li><b>Коммерческая реклама</b> без согласования с администрацией.</li>
          </ol>
        </Section>

        <Section id="chat" title="Общение" n={3}>
          <ul className="list-disc pl-5 space-y-1 text-[#c9c4b9]">
            <li>Правила общения действуют в текстовом и голосовом чате, а также на связанных площадках проекта.</li>
            <li>Не публикуйте личные данные третьих лиц.</li>
            <li>Предложения с конструктивной критикой направляйте в соответствующие каналы. Избегайте оффтопа.</li>
            <li>Не мешайте другим игрокам громкими, повторяющимися звуками и не принуждайте их переходить в голосовой чат.</li>
          </ul>
        </Section>

        <Section id="techmagic" title="Модификации и ресурс-паки" n={4}>
          <ul className="list-disc pl-5 space-y-1 text-[#c9c4b9]">
            <li>Разрешены моды, входящие в сборку сервера. Сторонние клиентские моды допустимы, за исключением дающих преимущество чит-модов. </li>
            <li>Визуальные и QoL-моды допустимы, если не дают геймплейного преимущества.</li>
            <li>Эксплойты и дюпы любых механик запрещены, за исключением дюпа динамита, яиц дракона и ковров. О найденных багах сообщайте модераторам.</li>
          </ul>
        </Section>

        <Section id="build" title="Строительство" n={5}>
          <ul className="list-disc pl-5 space-y-1 text-[#c9c4b9]">
            <li>Не допускайте пересечения вашей зоны постройки с чужими территориями без согласования.</li>
            <li>Ставьте таблички и иные метки, по которым можно определить принадлежность занятой территории вам.</li>
            <li>Ломать чужие таблички и конфисковать себе чужие территории строго запрещено. Исключение: спавновый остров в случае, если за месяц после присвоения территории на ней не было ничего построено.</li>
            <li>Сохраняйте проходы, магистрали, жд-пути и иные общие дороги. Не блокируйте порталы и перекрёстки, не создавайте препятствий движению поездов.</li>
            <li>После демонтажа построек или терраформирования приводите местность в порядок.</li>
          </ul>
        </Section>

        <Section id="farms" title="Фермы и механизмы" n={6}>
          <ul className="list-disc pl-5 space-y-1 text-[#c9c4b9]">
            <li>Тяжёлые и большие механизмы / фермы согласовывайте с модерацией. Создаваемая нагрузка не должна сажать TPS сервера и приводить к лагам.</li>
            <li>Авто-фермы допустимы при наличии ограничителей скорости и выключателей.</li>
            <li>Лимит мобов действует. Администрация имеет право уничтожить источник лагов.</li>
          </ul>
        </Section>

        <Section id="pvp" title="PVP / PVE" n={7}>
          <ul className="list-disc pl-5 space-y-1 text-[#c9c4b9]">
            <li>PvE разрешено.</li>
            <li>PvP разрешено только по взаимному согласию участников или в отмеченных зонах и событиях.</li>
            <li>Запрещено втягивать игроков в PvP провокацией или обманом.</li>
          </ul>
        </Section>

        <Section id="trade" title="Экономика и торговля" n={8}>
          <ul className="list-disc pl-5 space-y-1 text-[#c9c4b9]">
            <li>Договаривайтесь об условиях сделки заранее; крупные обмены рекомендуется фиксировать, например, в подписанной книге.</li>
            <li>Реклама собственных магазинов разрешена в специально отведённых местах.</li>
          </ul>
        </Section>

        <Section id="security" title="Безопасность и аккаунты" n={9}>
          <ul className="list-disc pl-5 space-y-1 text-[#c9c4b9]">
            <li>Безопасность аккаунта - ответственность его владельца.</li>
            <li>Не делитесь с посторонними данными для входа и не сообщайте коды доступа ни при каких обстоятельствах.</li>
            <li>Администрация никогда не просит пароль или код доступа. Вводите их только на официальном сайте и в лаунчере ArchiTech.</li>
            <li>Запрещён обход банов через твинки и VPN.</li>
            <li>При любой подозрительной активности немедленно сообщайте администрации.</li>
          </ul>
        </Section>

        <Section id="penalties" title="Наказания" n={10}>
          <ul className="list-disc pl-5 space-y-1 text-[#c9c4b9]">
            <li>Меры наказания применяются в соответствии со следующей шкалой: <b>предупреждение → мут → временный бан → перманентный бан.</b> </li>
            <li>Степень наказания зависит от тяжести, повторяемости нарушений и их последствий. </li>
            <li>Администрация вправе усилить наказание при наличии отягчающих обстоятельств.</li>
          </ul>
        </Section>
      </main>

      <aside className="hidden md:block md:col-span-3">
        <RightToc items={SECTIONS} blurIntensity="xl" bgOpacity="60" />
      </aside>
    </motion.div>
    </>
  );
}

const EN_SECTIONS: TocItem[] = [
  { id: 'intro', title: 'Introduction' }, { id: 'forbidden', title: 'Forbidden actions' },
  { id: 'chat', title: 'Communication' }, { id: 'techmagic', title: 'Mods and resource packs' },
  { id: 'build', title: 'Building' }, { id: 'farms', title: 'Farms and machinery' },
  { id: 'pvp', title: 'PVP / PVE' }, { id: 'trade', title: 'Economy and trading' },
  { id: 'security', title: 'Security and accounts' }, { id: 'penalties', title: 'Penalties' },
];

const EN_RULES: Array<{ id: string; items: React.ReactNode[] }> = [
  { id: 'intro', items: [<>The server uses <b>one persistent world</b> focused on tech magic and building. Our goal is a stable, welcoming place for collaboration. Staff may decide cases not explicitly covered by these rules.</>, <>Respect other players, help newcomers, play fairly, and report violations to staff.</>] },
  { id: 'forbidden', items: [<><b>Griefing:</b> damaging another player’s build without permission.</>, <><b>Abusive behaviour:</b> targeted insults or harassment; friendly mutual banter is the only exception.</>, <><b>Toxicity:</b> disrupting conversation, shouting, repeated loud sounds, or abusing voice chat.</>, <><b>Flood and spam:</b> meaningless or repetitive messages.</>, <>Off-topic posts in topic-specific channels.</>, <>Malware, phishing, shock content, or suspicious links.</>, <>Pornographic or erotic content.</>, <>Sharing another person’s private data without consent.</>, <>Misinformation intended to harm the project or its reputation.</>, <>Begging players or staff for privileges.</>, <>Manipulating wording or searching for loopholes to excuse a violation.</>, <>Alternate accounts used to evade punishment or gain an advantage.</>, <>Cheats, software, mods, or resource packs that provide an unfair advantage, including their promotion.</>, <>Commercial advertising without staff approval.</>] },
  { id: 'chat', items: [<>The communication rules apply to text chat, proximity voice chat, and the project’s related platforms.</>, <>Do not publish another person’s private data.</>, <>Send constructive feedback to the appropriate channels and avoid off-topic discussion.</>, <>Do not disrupt others with loud or repetitive sounds, and do not pressure players to join voice chat.</>] },
  { id: 'techmagic', items: [<>The server modpack is allowed. Extra client-side mods are allowed unless they provide an unfair advantage.</>, <>Visual and quality-of-life mods are allowed when they do not change gameplay fairness.</>, <>Exploits and duplication glitches are forbidden, except TNT, dragon egg, and carpet duplication. Report newly discovered bugs to staff.</>] },
  { id: 'build', items: [<>Do not overlap another player’s building area without agreement.</>, <>Mark occupied territory so its owner can be identified.</>, <>Never remove another player’s markers or seize their territory. An unused claim on the spawn island may be released after one month with no construction.</>, <>Keep public paths, highways, railways, portals, junctions, and train routes clear.</>, <>Clean up the terrain after dismantling builds or terraforming.</>] },
  { id: 'farms', items: [<>Coordinate very large or heavy farms and machinery with staff. They must not reduce server TPS or cause lag.</>, <>Automated farms must have rate limits and an off switch.</>, <>Entity limits apply. Staff may remove or disable a source of server lag.</>] },
  { id: 'pvp', items: [<>PVE is allowed.</>, <>PVP is allowed only with mutual consent or inside designated zones and events.</>, <>Do not trick or provoke players into unwanted PVP.</>] },
  { id: 'trade', items: [<>Agree on the terms before trading; record major exchanges, for example in a signed book.</>, <>Advertise your own shops only in designated places.</>] },
  { id: 'security', items: [<>You are responsible for the security of your account.</>, <>Never share sign-in details or access codes.</>, <>Staff will never ask for your password or access code. Enter them only on the official ArchiTech website and launcher.</>, <>Do not evade bans using alternate accounts or VPN services.</>, <>Report suspicious account activity to staff immediately.</>] },
  { id: 'penalties', items: [<>Typical escalation is <b>warning → mute → temporary ban → permanent ban</b>.</>, <>The penalty depends on severity, repetition, and consequences.</>, <>Staff may increase a penalty when aggravating circumstances apply.</>] },
];

function EnglishRules({ isMobile }: { isMobile: boolean }) {
  return <>
    <Seo {...routesMeta['/rules']} />
    <motion.div className="architech-document architech-rules mx-auto grid w-full max-w-7xl grid grid-cols-12 gap-6 px-4 py-6 text-[#f2efe9]" variants={isMobile ? undefined : pageVariants} initial={isMobile ? false : 'hidden'} animate={isMobile ? false : 'show'}>
      <aside className="hidden md:block md:col-span-3"><BaseLeftNav items={EN_SECTIONS} disableMotion={isMobile} blurIntensity="xl" bgOpacity="60" /></aside>
      <main className="col-span-12 md:col-span-6">
        <h1 className="mb-4 text-center text-[22px] font-bold md:text-[24px]">Server rules</h1>
        <Callout title="Tip"><ul className="space-y-1 text-sm text-[#c9c4b9]"><li>Search this page with <Kbd>Ctrl</Kbd> + <Kbd>F</Kbd> (Windows / Linux) or <Kbd>Cmd</Kbd> + <Kbd>F</Kbd> (macOS).</li><li>Ask the staff team if anything remains unclear.</li></ul></Callout>
        {EN_SECTIONS.map((section, index) => <BaseSection key={section.id} id={section.id} title={section.title} n={index + 1} disableMotion={isMobile}><ul className="list-disc space-y-1 pl-5 text-[#c9c4b9]">{EN_RULES.find((entry) => entry.id === section.id)?.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul></BaseSection>)}
      </main>
      <aside className="hidden md:block md:col-span-3"><BaseRightToc items={EN_SECTIONS} disableMotion={isMobile} blurIntensity="xl" bgOpacity="60" /></aside>
    </motion.div>
  </>;
}
