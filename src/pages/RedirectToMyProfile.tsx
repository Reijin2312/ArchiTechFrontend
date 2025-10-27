import { Navigate } from 'react-router-dom';
import { authStore } from '@/shared/store/auth';

export default function RedirectToMyProfile() {
  const me = authStore.getState().user;
  return <Navigate to={me ? `/u/${me.username}` : '/auth/login'} replace />;
}
