import { test, expect } from '@playwright/test';

test.describe('ReactionBar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-reaction');
  });

  test('reaction bar appears with trigger text', async ({ page }) => {
    await expect(page.getByTestId('reaction-bar')).toBeVisible();
    await expect(page.getByTestId('reaction-trigger')).toContainText('Door opened');
    await expect(page.getByTestId('reaction-trigger')).toContainText('monster_orc');
  });

  test('pass button sends pass and becomes disabled', async ({ page }) => {
    const passBtn = page.getByTestId('btn-pass');
    await expect(passBtn).toBeEnabled();
    await expect(passBtn).toHaveText('Pass');

    await passBtn.dispatchEvent('click');
    await expect(passBtn).toBeDisabled();
    await expect(passBtn).toHaveText('Passed');
  });

  test('reaction card buttons are visible', async ({ page }) => {
    await expect(page.getByTestId('reaction-card-potion_of_fire')).toBeVisible();
  });

  test('reaction bar disappears when closed', async ({ page }) => {
    await expect(page.getByTestId('reaction-bar')).toBeVisible();
    await page.getByTestId('close-reaction').click();
    await expect(page.getByTestId('reaction-bar')).not.toBeVisible();
  });

  test('timer progress bar exists', async ({ page }) => {
    await expect(page.getByTestId('reaction-timer')).toBeVisible();
  });
});
