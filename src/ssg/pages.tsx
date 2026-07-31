import HomePage from '../pages/public/HomePage'
import RulesPage from '../pages/public/RulesPage'
import ShopPage from '../pages/public/ShopPage'
import WikiPage from '../pages/public/WikiPage'
import ChatPage from '../pages/public/ChatPage'
import AboutServerPage from '../pages/public/AboutServerPage'
import ContactsPage from '../pages/public/ContactsPage'
import MapPage from '../pages/public/MapPage'
import UserAgreementPage from '../pages/legal/UserAgreementPage'
import PrivacyPolicyPage from '../pages/legal/PrivacyPolicyPage'
import SiteHeader from '../shared/ui/layout/SiteHeader'
import SiteFooter from '../shared/ui/layout/SiteFooter'

export const pages = {
  '/': () => (<><SiteHeader/><main><HomePage/></main><SiteFooter/></>),
  '/rules': () => (<><SiteHeader/><main><RulesPage/></main><SiteFooter/></>),
  '/shop': () => (<><SiteHeader/><main><ShopPage/></main><SiteFooter/></>),
  '/wiki': () => (<><SiteHeader/><main><WikiPage/></main><SiteFooter/></>),
  '/chat': () => (<ChatPage/>),
  '/about': () => (<><SiteHeader/><main><AboutServerPage/></main><SiteFooter/></>),
  '/contacts': () => (<><SiteHeader/><main><ContactsPage/></main><SiteFooter/></>),
  '/map': () => (<><SiteHeader/><main><MapPage/></main><SiteFooter/></>),
  '/terms': () => (<><SiteHeader/><main><UserAgreementPage/></main><SiteFooter/></>),
  '/privacy': () => (<><SiteHeader/><main><PrivacyPolicyPage/></main><SiteFooter/></>),
};
