import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from 'framer-motion';
import { TEAM_AVATAR_FALLBACK } from '../../../shared/data/team.js';
import { SvgCurseForge, SvgModrinth, SvgGitHub } from '../../../shared/ui/image/Icons.js';
import { useI18n } from '../../../shared/i18n/I18nProvider.js';
import { teamTranslations } from '../../../shared/i18n/translations.js';
const teamContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.06 },
    },
};
const teamItem = {
    hidden: { opacity: 0, y: 16, filter: 'blur(8px)', scale: 0.98 },
    show: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        scale: 1,
        transition: { duration: 0.4, ease: 'easeOut' },
    },
};
export function TeamGrid({ team, avatars, disableMotion, className }) {
    const { language } = useI18n();
    const copy = teamTranslations[language];
    if (!team.length)
        return null;
    const [leader, ...otherMembers] = team;
    const leaderSrc = avatars[leader.name] || TEAM_AVATAR_FALLBACK;
    return (_jsxs(motion.div, { className: [
            'grid gap-4 lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.44fr)]',
            className,
        ]
            .filter(Boolean)
            .join(' '), variants: disableMotion ? undefined : teamContainer, children: [_jsxs(motion.div, { variants: disableMotion ? undefined : teamItem, whileHover: disableMotion ? undefined : { y: -4, scale: 1.005 }, whileTap: disableMotion ? undefined : { scale: 0.995 }, className: "relative flex flex-col justify-center overflow-hidden rounded-2xl border border-sky-500/40 bg-linear-to-br from-slate-900/72 via-slate-900/56 to-sky-950/30 p-5 backdrop-blur-md backdrop-saturate-150 shadow-[0_14px_38px_rgba(2,6,23,0.55)]", children: [_jsx("div", { className: "pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-sky-400/15 blur-2xl" }), _jsx("div", { className: "pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-indigo-500/18 blur-3xl" }), _jsxs("div", { className: "relative z-10 flex items-stretch gap-4", children: [_jsx("a", { href: `/u/${encodeURIComponent(leader.name)}`, className: "shrink-0 self-stretch", children: _jsx("img", { src: leaderSrc, alt: leader.name, width: 112, height: 112, loading: "lazy", decoding: "async", className: "h-full min-h-28 w-28 rounded-2xl border border-slate-700/90 bg-slate-800 object-cover", onError: (event) => {
                                        const img = event.currentTarget;
                                        if (!img.src.endsWith(TEAM_AVATAR_FALLBACK))
                                            img.src = TEAM_AVATAR_FALLBACK;
                                    } }) }), _jsxs("div", { className: "flex min-w-0 flex-1 flex-col justify-center", children: [_jsx("div", { className: "text-[10px] uppercase tracking-[0.16em] text-sky-300/90", children: copy.lead }), _jsxs("a", { href: `/u/${encodeURIComponent(leader.name)}`, className: "mt-2 block min-w-0", children: [_jsx("div", { className: "truncate text-lg font-semibold text-slate-100", children: leader.name }), _jsx("div", { className: "text-sm text-slate-300", children: localizedRole(leader.name, leader.role, copy) })] }), (leader.curseForgeUrl || leader.modrinthUrl || leader.githubUrl) && (_jsxs("div", { className: "mt-3 flex items-center gap-3", children: [leader.curseForgeUrl && (_jsx("a", { href: leader.curseForgeUrl, target: "_blank", rel: "noreferrer noopener", className: "grid size-9 place-items-center text-[#f16436] transition-transform hover:scale-110 hover:text-[#ff8158]", "aria-label": copy.curseForge, title: "CurseForge", children: _jsx(SvgCurseForge, { className: "size-8" }) })), leader.modrinthUrl && (_jsx("a", { href: leader.modrinthUrl, target: "_blank", rel: "noreferrer noopener", className: "grid size-9 place-items-center text-[#00af5c] transition-transform hover:scale-110 hover:text-[#36d17b]", "aria-label": copy.modrinth, title: "Modrinth", children: _jsx(SvgModrinth, { className: "size-8" }) })), leader.githubUrl && (_jsx("a", { href: leader.githubUrl, target: "_blank", rel: "noreferrer noopener", className: "grid size-9 place-items-center text-slate-300 transition-transform hover:scale-110 hover:text-white", "aria-label": "GitHub Reijin2312", title: "GitHub", children: _jsx(SvgGitHub, { className: "size-7" }) }))] }))] })] })] }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2", children: otherMembers.map((member) => {
                    const src = avatars[member.name] || TEAM_AVATAR_FALLBACK;
                    return (_jsx(motion.div, { variants: disableMotion ? undefined : teamItem, whileHover: disableMotion ? undefined : { y: -4, scale: 1.01 }, whileTap: disableMotion ? undefined : { scale: 0.99 }, className: "group relative overflow-hidden rounded-2xl border border-slate-800 bg-linear-to-b from-slate-900/60 to-slate-900/20 p-4 backdrop-blur-md backdrop-saturate-150 will-change-transform", children: _jsxs("a", { href: `/u/${encodeURIComponent(member.name)}`, className: "flex items-center gap-3", children: [_jsx("img", { src: src, alt: member.name, width: 48, height: 48, loading: "lazy", decoding: "async", title: member.retiredSince
                                        ? copy.retiredTitle.replace('{reason}', language === 'ru' ? (member.retirementReason ?? copy.left) : copy.left).replace('{year}', String(member.retiredSince))
                                        : undefined, className: `size-12 rounded-xl border border-slate-700 bg-slate-800 object-cover transition duration-300 ${member.retiredSince
                                        ? 'grayscale opacity-65 group-hover:grayscale-0 group-hover:opacity-100'
                                        : ''}`, onError: (event) => {
                                        const img = event.currentTarget;
                                        if (!img.src.endsWith(TEAM_AVATAR_FALLBACK))
                                            img.src = TEAM_AVATAR_FALLBACK;
                                    } }), _jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "truncate font-medium", children: member.name }), _jsxs("div", { className: "flex flex-wrap items-center gap-1.5 text-sm text-slate-400", children: [_jsx("span", { className: member.retiredSince ? 'line-through decoration-slate-500' : undefined, children: localizedRole(member.name, member.role, copy) }), member.retiredSince && (_jsxs("span", { className: "rounded-md bg-slate-800/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-500", title: copy.retiredTitle.replace('{reason}', language === 'ru' ? (member.retirementReason ?? copy.left) : copy.left).replace('{year}', String(member.retiredSince)), children: ["retired ", member.retiredSince] }))] })] })] }) }, member.name));
                }) })] }));
}
function localizedRole(name, fallback, copy) {
    if (name === 'Raijin')
        return copy.owner;
    if (name === 'Kelbor_Hal')
        return copy.juniorAdmin;
    if (name === 'Wolle')
        return copy.techAdmin;
    if (name === 'Sile_Scorp')
        return copy.designer;
    if (name === 'Explyp')
        return copy.python;
    return fallback;
}
