/**
 * navRegistry — lightweight navigation callbacks registered by AppNavigator
 * and called from App.tsx (deep-link / notification handlers).
 * Kept in a separate file to avoid circular imports between App.tsx ↔ AppNavigator.tsx.
 */

let _navigateToHome: (() => void) | null = null;
let _navigateToResetPassword: ((token: string) => void) | null = null;
let _handleInstagramCallback: ((token: string) => void) | null = null;
let _pendingInstagramToken: string | null = null;

export function registerHomeNavigator(fn: () => void) {
  _navigateToHome = fn;
}

export function registerResetPasswordNavigator(fn: (token: string) => void) {
  _navigateToResetPassword = fn;
}

export function registerInstagramCallbackHandler(fn: (token: string) => void) {
  _handleInstagramCallback = fn;
  // Flush any token that arrived before the handler was registered (cold-start)
  if (_pendingInstagramToken) {
    const token = _pendingInstagramToken;
    _pendingInstagramToken = null;
    fn(token);
  }
}

export function navigateToHome() {
  _navigateToHome?.();
}

export function navigateToResetPassword(token: string) {
  _navigateToResetPassword?.(token);
}

export function handleInstagramCallback(token: string) {
  if (_handleInstagramCallback) {
    _handleInstagramCallback(token);
  } else {
    // Handler not yet registered (cold start) — queue the token
    _pendingInstagramToken = token;
  }
}
