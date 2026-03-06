import { test, expect } from '@playwright/test';

test.describe('Auth Page', () => {
  test('unauthenticated user is redirected to auth page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('auth-page')).toBeVisible();
    await expect(page.getByText('Munchkin Online')).toBeVisible();
  });

  test('shows login and register tabs', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('tab-login')).toBeVisible();
    await expect(page.getByTestId('tab-register')).toBeVisible();
  });

  test('register tab shows name field', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('input-name')).not.toBeVisible();
    await page.getByTestId('tab-register').click();
    await expect(page.getByTestId('input-name')).toBeVisible();
  });

  test('email and password inputs work', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.getByTestId('input-email');
    const passInput = page.getByTestId('input-password');
    await emailInput.fill('test@example.com');
    await passInput.fill('password123');
    await expect(emailInput).toHaveValue('test@example.com');
    await expect(passInput).toHaveValue('password123');
  });

  test('no console errors on auth page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/login');
    await page.waitForTimeout(500);
    const realErrors = errors.filter(e => !e.includes('fetch') && !e.includes('Failed to load'));
    expect(realErrors).toHaveLength(0);
  });
});

test.describe('Game Page (auth redirect)', () => {
  test('unauthenticated game access redirects to auth', async ({ page }) => {
    await page.goto('/game/test-room');
    await expect(page.getByTestId('auth-page')).toBeVisible();
  });
});
