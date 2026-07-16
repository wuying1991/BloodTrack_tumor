import { test, expect } from '../fixtures/auth';
import { createBloodTest } from '../helpers/api';

test.describe('PWA offline', () => {
  test('offline reload -> cached blood tests render + offline indicator shows', async ({
    authenticatedPage: page,
    auth,
    context,
  }) => {
    await createBloodTest(auth.accessToken, { date: '2026-07-14', wbc: 4.5, rbc: 4.4, hgb: 125, plt: 160 });

    // ensure the SW is active before loading the page we'll reload offline,
    // so it intercepts+ caches the document and /api/blood-tests
    await page.waitForFunction(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      return !!(r && r.active);
    }, { timeout: 20000 });

    // online: load /blood-tests -> SW caches app shell + API response
    await page.goto('/blood-tests', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('共 1 条记录')).toBeVisible({ timeout: 15000 });

    // go offline and reload -> SW serves cached shell + cached API data
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(page.locator('.offline-indicator')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('共 1 条记录')).toBeVisible({ timeout: 15000 });
  });

  test('offline indicator appears when the network drops (no reload)', async ({
    authenticatedPage: page,
    context,
  }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.user-name')).toBeVisible({ timeout: 15000 });
    // online -> indicator hidden
    await expect(page.locator('.offline-indicator')).toBeHidden();

    // network drops -> OfflineIndicator's offline listener should render the bar
    await context.setOffline(true);
    await expect(page.locator('.offline-indicator')).toBeVisible({ timeout: 10000 });
  });
});
