import { createBrowserRouter, Navigate } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/features/auth/pages/LoginPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import CodeVerifyPage from '@/features/auth/pages/CodeVerifyPage';
import NewPasswordPage from '@/features/auth/pages/NewPasswordPage';
import ResetDonePage from '@/features/auth/pages/ResetDonePage';
import { authStore } from '@/shared/store/auth'
import ProfilePage from '@/pages/ProfilePage'
import type { ReactElement } from 'react';
import Layout from '@/app/Layout';

function RequireAuth({ children }: { children: ReactElement }) {
  const user = authStore(s => s.user)
  if (!user) {
    const next = encodeURIComponent(window.location.pathname + window.location.search)
    return <Navigate to={`/auth/login?next=${next}`} replace />
  }
  return children
}

export const router = createBrowserRouter([
{ path: '/',
  element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: '/auth/login', element: <LoginPage /> },
      { path: '/auth/register', element: <RegisterPage /> },
      { path: '/auth/verify', element: <CodeVerifyPage mode="email-verify" /> },
      { path: '/auth/reset', element: <CodeVerifyPage mode="reset" /> },
      { path: '/auth/reset/new', element: <NewPasswordPage /> },
      { path: '/auth/reset/done', element: <ResetDonePage /> },
      { path: '/profile', element: (
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
      ) },
      { path: '*', element: <Navigate to="/" replace /> }
    ]
},
]);