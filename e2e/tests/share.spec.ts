import { test, expect } from '../fixtures/auth';
import { enableDataSharing, createBloodTest, createShare } from '../helpers/api';

test.describe('Share / read-only viewer', () => {
  test('open a no-PIN share link -> viewer shows shared blood test data', async ({ auth, browser }) => {
    // data sharing must be enabled server-side before a share can be created (else 403)
    await enableDataSharing(auth.accessToken);
    await createBloodTest(auth.accessToken, { date: '2026-07-12', wbc: 3.5, rbc: 4.2, hgb: 115, plt: 130 });
    const share = await createShare(auth.accessToken, {
      scope: { bloodTests: true, chemoCycles: false, analytics: false },
      expiresIn: 'never',
    });

    // fresh context = no auth localStorage, like a doctor opening the link
    const ctx = await browser.newContext();
    const viewer = await ctx.newPage();
    await viewer.route('**/fonts.googleapis.com/**', r => r.abort());
    await viewer.route('**/fonts.gstatic.com/**', r => r.abort());
    await viewer.goto(`/share/${share.token}`, { waitUntil: 'domcontentloaded' });

    await expect(viewer.getByRole('heading', { name: /的健康数据/ })).toBeVisible({ timeout: 15000 });
    await expect(viewer.getByRole('heading', { name: '血常规记录', exact: true })).toBeVisible();
    await expect(viewer.getByText('2026/7/12')).toBeVisible();
    await ctx.close();
  });

  test('create a share link via Settings UI -> appears in list', async ({ authenticatedPage: page }) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: '🔒 数据与隐私' }).click();
    await expect(page.getByRole('heading', { name: '数据与隐私' })).toBeVisible({ timeout: 10000 });

    // enable data sharing + save (must persist before creating a share).
    // The checkbox input is visually hidden (the slider is the visible UI) -> click the label.
    await page.locator('.toggle-switch').click();
    const saveResp = page.waitForResponse(
      r => r.url().includes('/auth/settings') && r.request().method() === 'PUT'
    );
    await page.getByRole('button', { name: '保存共享设置' }).click();
    await saveResp;

    // create a share (scope bloodTests checked by default, no PIN)
    await page.getByRole('button', { name: '+ 创建分享链接' }).click();
    await expect(page.getByRole('heading', { name: '创建分享链接' })).toBeVisible();
    await page.getByRole('button', { name: '创建并复制链接' }).click();
    await expect(page.getByRole('heading', { name: '✓ 创建成功' })).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: '完成' }).click();
    await expect(page.getByText('范围: 血常规')).toBeVisible({ timeout: 10000 });
  });
});
