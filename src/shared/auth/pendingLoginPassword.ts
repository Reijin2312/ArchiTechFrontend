let pendingLoginPassword: string | null = null;

export function setPendingLoginPassword(password: string) {
  pendingLoginPassword = password;
}

export function getPendingLoginPassword() {
  return pendingLoginPassword;
}

export function clearPendingLoginPassword() {
  pendingLoginPassword = null;
}