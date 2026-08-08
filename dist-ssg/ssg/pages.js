import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import HomePage from '../pages/public/HomePage.js';
import RulesPage from '../pages/public/RulesPage.js';
import ShopPage from '../pages/public/ShopPage.js';
import WikiPage from '../pages/public/WikiPage.js';
import AboutServerPage from '../pages/public/AboutServerPage.js';
import ContactsPage from '../pages/public/ContactsPage.js';
import MapPage from '../pages/public/MapPage.js';
import UserAgreementPage from '../pages/legal/UserAgreementPage.js';
import PrivacyPolicyPage from '../pages/legal/PrivacyPolicyPage.js';
import SiteHeader from '../shared/ui/layout/SiteHeader.js';
import SiteFooter from '../shared/ui/layout/SiteFooter.js';
import { I18nProvider } from '../shared/i18n/I18nProvider.js';
const shell = (page) => _jsxs(I18nProvider, { children: [_jsx(SiteHeader, {}), _jsx("main", { children: page }), _jsx(SiteFooter, {})] });
export const pages = {
    '/': () => shell(_jsx(HomePage, {})),
    '/rules': () => shell(_jsx(RulesPage, {})),
    '/start': () => shell(_jsx(ShopPage, {})),
    '/wiki': () => shell(_jsx(WikiPage, {})),
    '/about': () => shell(_jsx(AboutServerPage, {})),
    '/contacts': () => shell(_jsx(ContactsPage, {})),
    '/map': () => shell(_jsx(MapPage, {})),
    '/terms': () => shell(_jsx(UserAgreementPage, {})),
    '/privacy': () => shell(_jsx(PrivacyPolicyPage, {})),
};
