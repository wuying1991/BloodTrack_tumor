import { test, expect } from '../fixtures/auth';
import { uniqueEmail } from '../helpers/api';

const PASSWORD = 'Test1234';

test.describe('Auth flow', () => {
  test('register via UI -> redirected to dashboard with user name', async ({ page }) => {
    const email = uniqueEmail('auth');
    const fullName = '注册测试者';

    await page.goto('/register');
    await page.locator('#fullName').fill(fullName);
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(PASSWORD);
    await page.locator('#confirmPassword').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.locator('.user-name')).toHaveText(fullName);
  });

  test('login via UI -> dashboard', async ({ page, auth }) => {
    await page.goto('/login');
    await page.locator('#email').fill(auth.user.email as string);
    await page.locator('#password').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.locator('.user-name')).toBeVisible();
  });

  test('wrong password -> error shown, stays on login page', async ({ page, auth }) => {
    await page.goto('/login');
    await page.locator('#email').fill(auth.user.email as string);
    await page.locator('#password').fill('WrongPass1');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('.auth-error')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('logout -> back to login page', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('.user-name')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: '登出' }).click();

    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
