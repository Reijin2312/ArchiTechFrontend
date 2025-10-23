export const endpoints = {
login: '/api/auth/login',
register: '/api/auth/register',
refresh: '/api/auth/refresh',
verifyEmailConfirm: '/api/auth/verify-email/confirm',
verifyEmailResend: '/api/auth/verify-email/resend',
resetBegin: '/api/auth/password/reset/begin',
resetConfirm: '/api/auth/password/reset/confirm',
resetResend: '/api/auth/password/reset/resend',
resetFinish: '/api/auth/password/reset/finish'
} as const;