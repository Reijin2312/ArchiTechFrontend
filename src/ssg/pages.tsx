import HomePage from '../pages/public/HomePage'
import RulesPage from '../pages/public/RulesPage'
import ShopPage from '../pages/public/ShopPage'
import WikiPage from '../pages/public/WikiPage'
import AboutServerPage from '../pages/public/AboutServerPage'
import ContactsPage from '../pages/public/ContactsPage'
import MapPage from '../pages/public/MapPage'
import UserAgreementPage from '../pages/legal/UserAgreementPage'
import PrivacyPolicyPage from '../pages/legal/PrivacyPolicyPage'
import SiteHeader from '../shared/ui/layout/SiteHeader'
import SiteFooter from '../shared/ui/layout/SiteFooter'
import { I18nProvider } from '../shared/i18n/I18nProvider'

const shell = (page: React.ReactNode) => <I18nProvider><SiteHeader/><main>{page}</main><SiteFooter/></I18nProvider>

export const pages = {
  '/': () => shell(<HomePage/>),
  '/rules': () => shell(<RulesPage/>),
  '/start': () => shell(<ShopPage/>),
  '/wiki': () => shell(<WikiPage/>),
  '/about': () => shell(<AboutServerPage/>),
  '/contacts': () => shell(<ContactsPage/>),
  '/map': () => shell(<MapPage/>),
  '/terms': () => shell(<UserAgreementPage/>),
  '/privacy': () => shell(<PrivacyPolicyPage/>),
};
