/**
 * navRegistry — lightweight navigation callbacks registered by AppNavigator
 * and called from App.tsx (deep-link / notification handlers).
 * Kept in a separate file to avoid circular imports between App.tsx ↔ AppNavigator.tsx.
 */

let _navigateToHome: (() => void) | null = null;
let _navigateToResetPassword: ((token: string) => void) | null = null;
let _handleInstagramCallback: ((token: string) => void) | null = null;

export function registerHomeNavigator(fn: () => void) {
  _navigateToHome = fn;
}

export function registerResetPasswordNavigator(fn: (token: string) => void) {
  _navigateToResetPassword = fn;
}

export function registerInstagramCallbackHandler(fn: (token: string) => void) {
  _handleInstagramCallback = fn;
}

export function navigateToHome() {
  _navigateToHome?.();
}

export function navigateToResetPassword(token: string) {
  _navigateToResetPassword?.(token);
}

export function handleInstagramCallback(token: string) {
  _handleInstagramCallback?.(token);
}
