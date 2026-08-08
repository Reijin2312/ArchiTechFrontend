import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate } from 'react-router-dom';
import { authStore } from '../../shared/store/auth.js';
export default function RedirectToMyProfile() {
    const me = authStore.getState().user;
    return _jsx(Navigate, { to: me ? `/u/${me.username}` : '/auth/login', replace: true });
}
