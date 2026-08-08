import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, InputRow, inp } from './components.js';
export function ProfileSection({ profile, displayName, setDisplayName, bio, setBio, locationTxt, setLocationTxt, website, setWebsite, birthDate, setBirthDate, busy, onSave, }) {
    return (_jsxs(Card, { children: [_jsx("h2", { className: "mb-4 text-sm font-semibold text-sky-300", children: "\u041F\u0440\u043E\u0444\u0438\u043B\u044C" }), _jsx(InputRow, { label: "\u041E\u0442\u043E\u0431\u0440\u0430\u0436\u0430\u0435\u043C\u043E\u0435 \u0438\u043C\u044F", children: _jsx("input", { value: displayName, onChange: (e) => setDisplayName(e.target.value), className: inp() }) }), _jsx(InputRow, { label: "\u041E \u0441\u0435\u0431\u0435", children: _jsx("textarea", { value: bio, onChange: (e) => setBio(e.target.value), rows: 4, className: inp() }) }), _jsxs("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-2", children: [_jsx(InputRow, { label: "\u0413\u043E\u0440\u043E\u0434/\u043C\u0435\u0441\u0442\u043E\u043F\u043E\u043B\u043E\u0436\u0435\u043D\u0438\u0435", children: _jsx("input", { value: locationTxt, onChange: (e) => setLocationTxt(e.target.value), className: inp() }) }), _jsx(InputRow, { label: "\u0421\u0430\u0439\u0442", children: _jsx("input", { value: website, onChange: (e) => setWebsite(e.target.value), className: inp(), placeholder: "https://\u2026" }) })] }), _jsxs(InputRow, { label: "\u0414\u0430\u0442\u0430 \u0440\u043E\u0436\u0434\u0435\u043D\u0438\u044F", children: [_jsx("input", { type: "date", value: birthDate || '', onChange: (e) => setBirthDate(e.target.value || ''), className: inp(), min: "1900-01-01", max: new Date().toISOString().slice(0, 10) }), _jsxs("div", { className: "mt-2 flex flex-col gap-1 text-xs text-slate-400", children: [birthDate &&
                                (() => {
                                    try {
                                        const birth = new Date(birthDate);
                                        const today = new Date();
                                        let age = today.getFullYear() - birth.getFullYear();
                                        const monthDiff = today.getMonth() - birth.getMonth();
                                        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                                            age--;
                                        }
                                        return (_jsxs("span", { children: ["\u0412\u043E\u0437\u0440\u0430\u0441\u0442: ", age, " ", age === 1 ? 'год' : age < 5 ? 'года' : 'лет'] }));
                                    }
                                    catch {
                                        return null;
                                    }
                                })(), profile?.registeredAt &&
                                (() => {
                                    try {
                                        const reg = new Date(profile.registeredAt);
                                        const today = new Date();
                                        let years = today.getFullYear() - reg.getFullYear();
                                        const monthDiff = today.getMonth() - reg.getMonth();
                                        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < reg.getDate())) {
                                            years--;
                                        }
                                        return (_jsxs("span", { children: ["\u0421 \u043D\u0430\u043C\u0438 ", years > 0 ? `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}` : 'менее года'] }));
                                    }
                                    catch {
                                        return null;
                                    }
                                })()] })] }), _jsx("div", { className: "mt-4 flex justify-end", children: _jsx("button", { disabled: busy === 'profile', onClick: onSave, className: "rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-600/20 transition-all", children: "\uD83D\uDCBE \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043F\u0440\u043E\u0444\u0438\u043B\u044C" }) })] }));
}
