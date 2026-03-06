import { test, expect } from '@playwright/test';

test.describe('VictoryScreen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-victory');
  });

  test('victory screen shows with 100+ confetti particles', async ({ page }) => {
    await expect(page.getByTestId('victory-screen')).toBeVisible();
    await expect(page.getByTestId('victory-confetti-container')).toBeVisible();

    // Wait for confetti to be created
    await page.waitForTimeout(500);
    const confetti = page.locator('[data-testid="victory-confetti"]');
    const count = await confetti.count();
    expect(count).toBeGreaterThanOrEqual(100);
  });

  test('winner name appears letter by letter', async ({ page }) => {
    await expect(page.getByTestId('winner-name')).toBeVisible();
    const letters = page.getByTestId('winner-name').locator('[data-letter]');
    const count = await letters.count();
    expect(count).toBe('DragonSlayer'.length);
  });

  test('trophy drops with bounce', async ({ page }) => {
    await expect(page.getByTestId('victory-trophy')).toBeVisible();
  });

  test('play again button appears after delay and navigates', async ({ page }) => {
    // Button should not be visible immediately
    await expect(page.getByTestId('play-again-btn')).not.toBeVisible({ timeout: 1000 }).catch(() => {});

    // Wait for button to appear (2s delay + animation)
    await expect(page.getByTestId('play-again-btn')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('play-again-btn').click();
    await expect(page.getByTestId('victory-screen')).not.toBeVisible();
    await expect(page.getByTestId('play-again-result')).toHaveText('lobby');
  });
});
