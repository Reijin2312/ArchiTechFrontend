let pendingLoginPassword = null;
export function setPendingLoginPassword(password) {
    pendingLoginPassword = password;
}
export function getPendingLoginPassword() {
    return pendingLoginPassword;
}
export function clearPendingLoginPassword() {
    pendingLoginPassword = null;
}
