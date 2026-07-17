import { test, expect } from '../fixtures/auth';
import { createBloodTest } from '../helpers/api';

const NORMAL = { wbc: 5.0, rbc: 4.5, hgb: 130, plt: 150 };

test.describe('Blood tests CRUD', () => {
  test('add a blood test via UI -> appears in list', async ({ authenticatedPage: page }) => {
    await page.goto('/blood-tests');
    await expect(page.getByRole('heading', { name: '血常规记录', exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('暂无血常规记录')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: '+ 添加记录' }).click();
    await expect(page.getByRole('heading', { name: '添加血常规记录' })).toBeVisible();

    await page.locator('#date').fill('2026-07-15');
    await page.locator('#wbc').fill(String(NORMAL.wbc));
    await page.locator('#rbc').fill(String(NORMAL.rbc));
    await page.locator('#hgb').fill(String(NORMAL.hgb));
    await page.locator('#plt').fill(String(NORMAL.plt));

    // beforeSubmit warns about no chemo cycle -> dismiss (取消) to continue saving
    page.on('dialog', d => d.dismiss());
    await page.getByRole('button', { name: '保存记录' }).click();

    await expect(page.getByRole('heading', { name: '添加血常规记录' })).toBeHidden({ timeout: 10000 });
    await expect(page.getByText('共 1 条记录')).toBeVisible();
    await expect(page.getByText('2026/07/15')).toBeVisible();
  });

  test('abnormal blood test shows 异常 badge + low arrow', async ({ authenticatedPage: page, auth }) => {
    await createBloodTest(auth.accessToken, { date: '2026-07-10', wbc: 3.2, rbc: 4.1, hgb: 110, plt: 120 });
    await page.goto('/blood-tests');
    await expect(page.getByText('共 1 条记录')).toBeVisible({ timeout: 15000 });

    await expect(page.locator('.abnormal-badge')).toHaveText('异常');
    await expect(page.locator('tr.abnormal')).toBeVisible();
    // WBC 3.2 is below 4.0 -> low arrow
    await expect(page.locator('[data-label="白细胞(WBC)"]')).toContainText('↓');
  });

  test('edit a blood test -> changes reflected in list', async ({ authenticatedPage: page, auth }) => {
    await createBloodTest(auth.accessToken, { date: '2026-07-08', ...NORMAL });
    await page.goto('/blood-tests');
    const wbcCell = page.locator('[data-label="白细胞(WBC)"]');
    await expect(wbcCell).toContainText('5.00', { timeout: 15000 });

    await page.locator('.btn-edit').click();
    await expect(page.getByRole('heading', { name: '编辑血常规记录' })).toBeVisible();
    await page.locator('#wbc').fill('7.5');
    // edit path skips the chemo-cycle beforeSubmit dialog (editingTest set)
    await page.getByRole('button', { name: '更新记录' }).click();

    await expect(page.getByRole('heading', { name: '编辑血常规记录' })).toBeHidden({ timeout: 10000 });
    await expect(wbcCell).toContainText('7.50');
  });

  test('delete a blood test -> removed from list', async ({ authenticatedPage: page, auth }) => {
    await createBloodTest(auth.accessToken, { date: '2026-07-05', ...NORMAL });
    await page.goto('/blood-tests');
    await expect(page.getByText('共 1 条记录')).toBeVisible({ timeout: 15000 });

    // delete uses window.confirm -> accept
    page.on('dialog', d => d.accept());
    await page.locator('.btn-delete').click();

    await expect(page.getByText('暂无血常规记录')).toBeVisible({ timeout: 10000 });
  });
});
