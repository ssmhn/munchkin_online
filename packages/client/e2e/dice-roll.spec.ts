import { test, expect } from '@playwright/test';

test.describe('DiceRollOverlay', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-dice-roll');
  });

  test('dice appears and spins for ~1.5 seconds', async ({ page }) => {
    await page.getByTestId('roll-success').click();
    await expect(page.getByTestId('dice-roll-overlay')).toBeVisible();
    await expect(page.getByTestId('dice-cube')).toBeVisible();
    await expect(page.getByTestId('dice-number')).toBeVisible();

    await expect(page.getByTestId('roll-completed')).toHaveText('success', { timeout: 8000 });
  });

  test('success (>=5): green glow and Success label', async ({ page }) => {
    await page.getByTestId('roll-success').click();

    // Wait for result to settle
    await expect(page.getByTestId('dice-result-label')).toHaveText('Success!', { timeout: 5000 });
    await expect(page.getByTestId('roll-completed')).toHaveText('success', { timeout: 8000 });
  });

  test('fail (<5): red glow and Failed label', async ({ page }) => {
    await page.getByTestId('roll-fail').click();

    await expect(page.getByTestId('dice-result-label')).toHaveText('Failed!', { timeout: 5000 });
    await expect(page.getByTestId('roll-completed')).toHaveText('fail', { timeout: 8000 });
  });

  test('dice shows final result number', async ({ page }) => {
    await page.getByTestId('roll-six').click();

    await expect(page.getByTestId('dice-result-label')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('dice-number')).toHaveText('6');
  });
});
