import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useWallpaper } from '../../shared/ui/wallpaper/useWallpaper.js';
import { Seo } from '../../shared/seo/seo.js';
import { routesMeta } from '../../shared/seo/routesMeta.js';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { LeftNav as BaseLeftNav, Section as BaseSection, Callout, pageVariants } from '../../shared/ui/layout/PageSidebar.js';
import { useIsMobile } from '../../shared/ui/utils/useIsMobile.js';
import { LAUNCHER_DOWNLOAD_URL, WIKI_URL } from '../../shared/constants.js';
import { useI18n } from '../../shared/i18n/I18nProvider.js';
export default function ShopPage() {
    useWallpaper();
    const isMobile = useIsMobile();
    const { t } = useI18n();
    return (_jsxs(_Fragment, { children: [_jsx(Seo, { ...routesMeta['/start'] }), _jsxs(motion.div, { className: "mx-auto w-full max-w-7xl grid grid-cols-12 gap-6 px-4 py-6 text-slate-100", variants: isMobile ? undefined : pageVariants, initial: isMobile ? false : 'hidden', animate: isMobile ? false : 'show', children: [_jsx("aside", { className: "col-span-12 md:col-span-3", children: _jsx(BaseLeftNav, { disableMotion: isMobile, items: [
                                { id: 'price', title: t('start.access') },
                                { id: 'how', title: t('start.how') },
                                { id: 'discounts', title: t('start.launcher') },
                                { id: 'policy', title: t('start.modpack') },
                                { id: 'faq', title: t('start.security') },
                            ], blurIntensity: "xl", bgOpacity: "60" }) }), _jsxs("main", { className: "col-span-12 md:col-span-6", children: [_jsx("h1", { className: "mb-4 text-3xl font-bold text-[22px] md:text-[24px] text-center", children: t('start.title') }), _jsx(Callout, { title: t('start.freeAccess'), children: _jsx("p", { className: "text-sm text-slate-300", children: t('start.lead') }) }), _jsx(BaseSection, { id: "how", n: 1, title: t('start.registration'), disableMotion: isMobile, children: _jsxs("ol", { className: "list-decimal pl-6 space-y-2 text-slate-300", children: [_jsxs("li", { children: [_jsx(Link, { to: "/auth/register", className: "text-sky-300 underline underline-offset-2 hover:text-sky-200", children: t('start.step1Link') }), "."] }), _jsxs("li", { children: [_jsx("a", { href: LAUNCHER_DOWNLOAD_URL, className: "text-sky-300 underline underline-offset-2 hover:text-sky-200", children: t('start.step2Link') }), " ", t('start.step2Tail')] }), _jsx("li", { children: t('start.step3') }), _jsx("li", { children: t('start.step4') })] }) }), _jsxs(BaseSection, { id: "discounts", n: 2, title: t('start.launcher'), disableMotion: isMobile, children: [_jsx("p", { className: "text-slate-300 text-sm", children: t('start.launcherText') }), _jsx("a", { href: LAUNCHER_DOWNLOAD_URL, className: "mt-4 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm hover:bg-indigo-500", children: t('start.downloadLauncher') })] }), _jsxs(BaseSection, { id: "policy", n: 3, title: t('start.modpackTitle'), disableMotion: isMobile, children: [_jsx("p", { className: "text-slate-300 text-sm", children: t('start.modpackText') }), _jsx("a", { href: `${WIKI_URL}#mods`, className: "mt-3 inline-flex text-sm text-sky-300 underline underline-offset-2 hover:text-sky-200", children: t('start.modpackLink') })] }), _jsx(BaseSection, { id: "faq", n: 4, title: t('start.security'), disableMotion: isMobile, children: _jsxs("dl", { className: "space-y-3", children: [_jsx(QA, { q: t('start.licenseQuestion'), children: t('start.licenseAnswer') }), _jsxs(QA, { q: t('start.sourceQuestion'), children: [t('start.sourceBefore'), " ", _jsx("a", { href: "https://github.com/Reijin2312/ArchiTech_Launcher", target: "_blank", rel: "noreferrer noopener", className: "text-sky-300 underline underline-offset-2 hover:text-sky-200", children: t('start.officialGithub') }), "."] })] }) })] }), _jsx("aside", { className: "col-span-12 md:col-span-3", children: _jsx(RightBox, {}) })] })] }));
}
function RightBox() {
    const { t } = useI18n();
    return (_jsxs("div", { className: "sticky top-20 space-y-3", children: [_jsxs("div", { className: "rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md backdrop-saturate-150", children: [_jsx("div", { className: "text-sm text-sky-300", children: t('start.ready') }), _jsx("div", { className: "mt-1 text-lg font-semibold", children: t('start.readyAction') }), _jsx("p", { className: "mt-2 text-xs text-slate-400", children: t('start.readyText') })] }), _jsxs("div", { className: "rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300 backdrop-blur-md backdrop-saturate-150", children: [_jsx("div", { className: "font-semibold mb-1 text-sky-300", children: t('start.noManual') }), t('start.noManualText')] })] }));
}
function QA({ q, children }) {
    return (_jsxs("div", { className: "rounded-xl border border-slate-800 bg-slate-900/60 p-3 backdrop-blur-md backdrop-saturate-150", children: [_jsx("div", { className: "font-semibold", children: q }), _jsx("div", { className: "mt-1 text-slate-300 text-sm", children: children })] }));
}
