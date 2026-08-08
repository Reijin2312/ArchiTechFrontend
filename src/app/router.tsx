import { createBrowserRouter, Navigate } from 'react-router-dom';
import HomePage from '@/pages/public/HomePage';
import LoginPage from '@/features/auth/pages/LoginPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import CodeVerifyPage from '@/features/auth/pages/CodeVerifyPage';
import NewPasswordPage from '@/features/auth/pages/NewPasswordPage';
import ResetDonePage from '@/features/auth/pages/ResetDonePage';
import Layout from '@/app/Layout';
import UserProfilePage from '@/pages/public/UserProfilePage';
import RedirectToMyProfile from '@/pages/settings/RedirectToMyProfile';
import RulesPage from '@/pages/public/RulesPage';
import ShopPage from '@/pages/public/ShopPage';
import WikiPage from '@/pages/public/WikiPage';
import SettingsProfilePage from '@/pages/settings/SettingsProfile/SettingsProfilePage';
import ChangeEmailPage from '@/pages/settings/EmailChangeStartPage';
import ChangePasswordPage from '@/pages/settings/ChangePasswordPage';
import TwoFactorSetupPage from '@/pages/settings/TwoFactorSetupPage';
import TwoFactorDisablePage from '@/pages/settings/TwoFactorDisablePage';
import UserAgreementPage from '@/pages/legal/UserAgreementPage';
import PrivacyPolicyPage from '@/pages/legal/PrivacyPolicyPage';
import EmailChangeStartPage from '@/pages/settings/EmailChangeStartPage';
import ChangeEmailNewPage from '@/pages/settings/ChangeEmailNewPage';
import ContactsPage from '@/pages/public/ContactsPage';
import MapPage from '@/pages/public/MapPage';
import AboutServerPage from '@/pages/public/AboutServerPage';
import TgBotLoginWebApp from '@/features/auth/pages/TgBotLoginWebApp';
import DeviceLoginDonePage from '@/features/auth/pages/DeviceLoginDonePage';
import LoginTwoFactorPage from '@/features/auth/pages/LoginTwoFactorPage';
import UserAchievementsPage from '@/pages/public/UserAchievementsPage';
import UserSkinsPage from '@/pages/public/UserSkinsPage';
import ChatPage from '@/pages/public/ChatPage';

export const router = createBrowserRouter([
  { path: '/tg-login', element: <TgBotLoginWebApp /> },
  { path: '/chat', element: <ChatPage /> },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: '/auth/login', element: <LoginPage /> },
      { path: '/auth/login/2fa', element: <LoginTwoFactorPage /> },
      { path: '/auth/register', element: <RegisterPage /> },
      { path: '/auth/verify', element: <CodeVerifyPage mode="email-verify" /> },
      { path: '/auth/reset', element: <CodeVerifyPage mode="reset" /> },
      { path: '/auth/reset/new', element: <NewPasswordPage /> },
      { path: '/auth/reset/done', element: <ResetDonePage /> },
      { path: '/auth/device/done', element: <DeviceLoginDonePage /> },
      { path: '/u/:username', element: <UserProfilePage /> },
      { path: '/u/:username/achievements', element: <UserAchievementsPage /> },
      { path: '/u/:username/skins', element: <UserSkinsPage /> },
      { path: '/profile', element: <RedirectToMyProfile /> },
      { path: '/rules', element: <RulesPage />},
      { path: '/start', element: <ShopPage/>},
      { path: '/shop', element: <Navigate to="/start" replace />},
      { path: '/wiki', element: <WikiPage/>},
      { path: '/about', element: <AboutServerPage />},
      { path: '/contacts', element: <ContactsPage />},
      { path: '/map', element: <MapPage />},
      { path: '/terms', element: <UserAgreementPage/>},
      { path: '/privacy', element: <PrivacyPolicyPage/>},
      { path: '/settings/profile', element: <SettingsProfilePage/>},
      { path: '/settings/email', element: <EmailChangeStartPage/> },
      { path: '/settings/email/new', element: <ChangeEmailNewPage/> },
      { path: '/verify/email-change-old', element: <CodeVerifyPage mode="email-change-old" /> },
      { path: '/settings/password', element: <ChangePasswordPage/> },
      { path: '/settings/2fa/setup', element: <TwoFactorSetupPage/> },
      { path: '/settings/2fa/disable', element: <TwoFactorDisablePage/> },
      { path: '/verify/email',    element: <CodeVerifyPage mode="email-verify" /> },
      { path: '/auth/reset/code', element: <CodeVerifyPage mode="reset" /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
