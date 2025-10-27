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
      { path: '/settings/profile', element: <SettingsProfilePage/>},
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
