import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('switching between login and register modes', async ({ page }) => {
    await page.goto('/login');

    // Login mode by default
    const loginTab = page.getByTestId('tab-login');
    const registerTab = page.getByTestId('tab-register');
    await expect(loginTab).toBeVisible();
    await expect(registerTab).toBeVisible();

    // Login mode: no name field
    await expect(page.getByTestId('input-name')).not.toBeVisible();
    await expect(page.getByTestId('input-email')).toBeVisible();
    await expect(page.getByTestId('input-password')).toBeVisible();

    // Switch to register
    await registerTab.click();
    await expect(page.getByTestId('input-name')).toBeVisible();

    // Switch back to login
    await loginTab.click();
    await expect(page.getByTestId('input-name')).not.toBeVisible();
  });

  test('submit button shows correct label per mode', async ({ page }) => {
    await page.goto('/login');

    // Login mode
    await expect(page.getByTestId('auth-submit')).toHaveText('Login');

    // Register mode
    await page.getByTestId('tab-register').click();
    await expect(page.getByTestId('auth-submit')).toHaveText('Create Account');
  });

  test('form has required validation on email and password', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.getByTestId('input-email');
    const passInput = page.getByTestId('input-password');

    // Both fields should have required attribute
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passInput).toHaveAttribute('required', '');
    await expect(passInput).toHaveAttribute('minLength', '6');
  });

  test('join page shows invalid state for bad invite', async ({ page }) => {
    await page.goto('/join/fake-room?invite=bad-token');
    await expect(page.getByTestId('join-page')).toBeVisible();
    // Should show invalid invite message after checking
    await expect(page.getByText('Invalid Invite')).toBeVisible({ timeout: 5000 });
  });

  test('join page shows invalid state without invite token', async ({ page }) => {
    await page.goto('/join/fake-room');
    await expect(page.getByTestId('join-page')).toBeVisible();
    await expect(page.getByText('Invalid Invite')).toBeVisible({ timeout: 5000 });
  });
});
