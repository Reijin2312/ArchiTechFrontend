import HomePage from '@/pages/HomePage';
import RulesPage from '@/pages/RulesPage';
import ShopPage from '@/pages/ShopPage';
import WikiPage from '@/pages/WikiPage';
import UserAgreementPage from '@/pages/UserAgreementPage';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';
import SiteHeader from '@/shared/ui/SiteHeader';
import SiteFooter from '@/shared/ui/SiteFooter';

export const pages = {
  '/': () => (<><SiteHeader/><main><HomePage/></main><SiteFooter/></>),
  '/rules': () => (<><SiteHeader/><main><RulesPage/></main><SiteFooter/></>),
  '/shop': () => (<><SiteHeader/><main><ShopPage/></main><SiteFooter/></>),
  '/wiki': () => (<><SiteHeader/><main><WikiPage/></main><SiteFooter/></>),
  '/terms': () => (<><SiteHeader/><main><UserAgreementPage/></main><SiteFooter/></>),
  '/privacy': () => (<><SiteHeader/><main><PrivacyPolicyPage/></main><SiteFooter/></>),
};
