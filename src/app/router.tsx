import { createBrowserRouter, Navigate } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/features/auth/pages/LoginPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import CodeVerifyPage from '@/features/auth/pages/CodeVerifyPage';
import NewPasswordPage from '@/features/auth/pages/NewPasswordPage';
import ResetDonePage from '@/features/auth/pages/ResetDonePage';
import Layout from '@/app/Layout';
import UserProfilePage from '@/pages/UserProfilePage';
import RedirectToMyProfile from '@/pages/RedirectToMyProfile';
import RulesPage from '@/pages/RulesPage';
import ShopPage from '@/pages/ShopPage';
import WikiPage from '@/pages/WikiPage';
import SettingsProfilePage from '@/pages/SettingsProfilePage';
import ChangeEmailPage from '@/pages/EmailChangeStartPage';
import ChangePasswordPage from '@/pages/ChangePasswordPage';
import UserAgreementPage from '@/pages/UserAgreementPage';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';
import EmailChangeStartPage from '@/pages/EmailChangeStartPage';
import ChangeEmailNewPage from '@/pages/ChangeEmailNewPage';
import ContactsPage from '@/pages/ContactsPage';
import AboutServerPage from '@/pages/AboutServerPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: '/auth/login', element: <LoginPage /> },
      { path: '/auth/register', element: <RegisterPage /> },
      { path: '/auth/verify', element: <CodeVerifyPage mode="email-verify" /> },
      { path: '/auth/reset', element: <CodeVerifyPage mode="reset" /> },
      { path: '/auth/reset/new', element: <NewPasswordPage /> },
      { path: '/auth/reset/done', element: <ResetDonePage /> },
      { path: '/u/:username', element: <UserProfilePage /> },
      { path: '/profile', element: <RedirectToMyProfile /> },
      { path: '/rules', element: <RulesPage />},
      { path: '/shop', element: <ShopPage/>},
      { path: '/wiki', element: <WikiPage/>},
      { path: '/about', element: <AboutServerPage />},
      { path: '/contacts', element: <ContactsPage />},
      { path: '/terms', element: <UserAgreementPage/>},
      { path: '/privacy', element: <PrivacyPolicyPage/>},
      { path: '/settings/profile', element: <SettingsProfilePage/>},
      { path: '/settings/email', element: <EmailChangeStartPage/> },
      { path: '/settings/email/new', element: <ChangeEmailNewPage/> },
      { path: '/verify/email-change-old', element: <CodeVerifyPage mode="email-change-old" /> },
      { path: '/settings/password', element: <ChangePasswordPage/> },
      { path: '/verify/email',    element: <CodeVerifyPage mode="email-verify" /> },
      { path: '/auth/reset/code', element: <CodeVerifyPage mode="reset" /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
