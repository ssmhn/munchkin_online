import { test, expect } from '@playwright/test';

test.describe('ChooseTargetOverlay', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-choice');
  });

  test('shows overlay with two monster options', async ({ page }) => {
    await expect(page.getByTestId('choose-overlay')).toBeVisible();
    await expect(page.getByTestId('choose-title')).toHaveText('Choose a monster to clone');
    await expect(page.getByTestId('option-inst-1')).toHaveText('Orc (Level 4)');
    await expect(page.getByTestId('option-inst-2')).toHaveText('Big Rat (Level 1)');
  });

  test('choosing an option closes overlay and sends choice', async ({ page }) => {
    await expect(page.getByTestId('chosen-value')).toHaveText('none');
    await page.getByTestId('option-inst-1').click();
    await expect(page.getByTestId('choose-overlay')).not.toBeVisible();
    await expect(page.getByTestId('chosen-value')).toHaveText('inst-1');
  });

  test('timeout progress bar exists', async ({ page }) => {
    await expect(page.getByTestId('choose-timer')).toBeVisible();
  });
});
