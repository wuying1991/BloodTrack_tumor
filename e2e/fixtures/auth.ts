import { test as base, expect, type Page } from '@playwright/test';
import { registerUser, type AuthTokens } from '../helpers/api';

/**
 * Auth fixture: register a user via API and inject the 4 localStorage keys AuthContext
 * reads (authToken / refreshToken / user / tokenExpiry) so the app is logged in on the
 * next navigation - deterministic + fast, no per-test UI login. apiClient reads
 * localStorage.authToken directly, so authenticated API calls work too.
 *
 * Use `authenticatedPage` for specs that need a logged-in user but aren't testing auth
 * itself. auth.spec drives the real login/register forms instead.
 */
async function injectAuth(page: Page, auth: AuthTokens) {
  await page.evaluate((a) => {
    localStorage.setItem('authToken', a.accessToken);
    localStorage.setItem('refreshToken', a.refreshToken);
    localStorage.setItem('user', JSON.stringify(a.user));
    localStorage.setItem('tokenExpiry', (Date.now() + 15 * 60 * 1000).toString());
  }, auth);
}

export const test = base.extend<{ auth: AuthTokens; authenticatedPage: Page }>({
  auth: async ({}, use) => {
    const auth = await registerUser();
    await use(auth);
  },
  authenticatedPage: async ({ page, auth }, use) => {
    // navigate to origin first so localStorage is set on the right origin
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await injectAuth(page, auth);
    await use(page);
  },
});

// Block Google Fonts (cross-origin, frequently hangs on slow networks) so page 'load'
// fires promptly. Tests assert on DOM, not font rendering.
test.beforeEach(async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', r => r.abort());
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
});

export { expect };
