import { test, expect } from '@playwright/test';

test.describe('CombatZone', () => {
  test('combat zone appears when combat starts with monster name', async ({ page }) => {
    await page.goto('/test-board');
    // No combat initially
    await expect(page.getByTestId('combat-zone')).not.toBeVisible();

    // Start combat
    await page.getByTestId('start-combat').click();
    await expect(page.getByTestId('combat-zone')).toBeVisible();
    await expect(page.getByTestId('monster-inst-1')).toBeVisible();
    await expect(page.getByTestId('monster-name-inst-1')).toHaveText('Big Rat');
  });

  test('doppelganger clone appears as second monster', async ({ page }) => {
    await page.goto('/test-board');
    await page.getByTestId('start-combat').click();
    await expect(page.getByTestId('monsters-area')).toBeVisible();

    // Initially one monster
    const monsters = page.getByTestId('monsters-area').locator('[data-testid^="monster-inst"]');
    await expect(monsters).toHaveCount(1);

    // Add clone
    await page.getByTestId('add-clone').click();
    await expect(monsters).toHaveCount(2);
    await expect(page.getByTestId('monster-name-inst-2')).toHaveText('Big Rat Clone');
  });

  test('buttons disabled when not active player', async ({ page }) => {
    await page.goto('/test-combat');
    await expect(page.getByTestId('btn-run-away')).toBeDisabled();
    await expect(page.getByTestId('btn-offer-help')).toBeDisabled();
  });

  test('buttons enabled when active player', async ({ page }) => {
    await page.goto('/test-board');
    await page.getByTestId('start-combat').click();
    await expect(page.getByTestId('btn-run-away')).toBeEnabled();
    await expect(page.getByTestId('btn-offer-help')).toBeEnabled();
  });

  test('shows combat power values', async ({ page }) => {
    await page.goto('/test-board');
    await page.getByTestId('start-combat').click();
    await expect(page.getByTestId('player-power')).toHaveText('5');
    await expect(page.getByTestId('monster-power')).toHaveText('3');
  });

  test('action panel is visible', async ({ page }) => {
    await page.goto('/test-board');
    await page.getByTestId('start-combat').click();
    await expect(page.getByTestId('action-panel')).toBeVisible();
  });
});
