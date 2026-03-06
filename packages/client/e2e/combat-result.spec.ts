import { test, expect } from '@playwright/test';

test.describe('CombatResultAnimation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-combat-result');
  });

  test('victory: confetti particles and monster flies away', async ({ page }) => {
    await page.getByTestId('play-victory').click();
    await expect(page.getByTestId('combat-result-animation')).toBeVisible();
    await expect(page.getByTestId('combat-player')).toBeVisible();
    await expect(page.getByTestId('combat-monster')).toBeVisible();

    // Confetti particles should be created
    const confetti = page.getByTestId('confetti-container');
    await expect(confetti).toBeVisible();

    // Result label shows VICTORY
    await expect(page.getByTestId('result-label')).toContainText('VICTORY');

    await expect(page.getByTestId('completed-outcome')).toHaveText('VICTORY', { timeout: 5000 });
  });

  test('defeat: dark overlay and player shake', async ({ page }) => {
    await page.getByTestId('play-defeat').click();
    await expect(page.getByTestId('combat-result-animation')).toBeVisible();
    await expect(page.getByTestId('defeat-overlay')).toBeAttached();
    await expect(page.getByTestId('result-label')).toContainText('DEFEAT');

    await expect(page.getByTestId('completed-outcome')).toHaveText('DEFEAT', { timeout: 5000 });
  });

  test('escape: player runs off and returns', async ({ page }) => {
    await page.getByTestId('play-escape').click();
    await expect(page.getByTestId('combat-result-animation')).toBeVisible();
    await expect(page.getByTestId('result-label')).toContainText('ESCAPED');

    await expect(page.getByTestId('completed-outcome')).toHaveText('ESCAPE', { timeout: 5000 });
  });
});
