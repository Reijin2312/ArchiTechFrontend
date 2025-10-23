import { createBrowserRouter, Navigate } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/features/auth/pages/LoginPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import CodeVerifyPage from '@/features/auth/pages/CodeVerifyPage';
import NewPasswordPage from '@/features/auth/pages/NewPasswordPage';
import ResetDonePage from '@/features/auth/pages/ResetDonePage';


export const router = createBrowserRouter([
{ path: '/', element: <HomePage /> },
{ path: '/auth/login', element: <LoginPage /> },
{ path: '/auth/register', element: <RegisterPage /> },
{ path: '/auth/verify', element: <CodeVerifyPage mode="email-verify" /> },
{ path: '/auth/reset', element: <CodeVerifyPage mode="reset" /> },
{ path: '/auth/reset/new', element: <NewPasswordPage /> },
{ path: '/auth/reset/done', element: <ResetDonePage /> },
{ path: '*', element: <Navigate to="/" replace /> }
]);