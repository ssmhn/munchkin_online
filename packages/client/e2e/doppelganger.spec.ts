import { test, expect } from '@playwright/test';

test.describe('DoppelgangerAnimation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-doppelganger');
  });

  test('auto-clone: shadow separates and materializes with blur effect', async ({ page }) => {
    await page.getByTestId('auto-clone').click();
    await expect(page.getByTestId('doppelganger-animation')).toBeVisible();
    await expect(page.getByTestId('original-monster')).toBeVisible();
    await expect(page.getByTestId('clone-monster')).toBeAttached();
    await expect(page.getByTestId('clone-arc')).toBeAttached();

    await expect(page.getByTestId('completed-status')).toHaveText('auto-done', { timeout: 5000 });
  });

  test('choose mode: two monsters pulsate waiting for choice', async ({ page }) => {
    await page.getByTestId('choose-clone').click();
    await expect(page.getByTestId('monster-choice-inst-1')).toBeVisible();
    await expect(page.getByTestId('monster-choice-inst-2')).toBeVisible();
  });

  test('choose monster: clone appears after selection', async ({ page }) => {
    await page.getByTestId('choose-clone').click();
    await expect(page.getByTestId('monster-choice-inst-1')).toBeVisible();
    await page.getByTestId('monster-choice-inst-1').click();
    await expect(page.getByTestId('chosen-id')).toHaveText('inst-1');

    // After choosing, clone animation plays
    await expect(page.getByTestId('completed-status')).toHaveText('choose-done', { timeout: 5000 });
  });
});
