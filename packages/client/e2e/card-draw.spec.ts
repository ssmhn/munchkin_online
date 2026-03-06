import { test, expect } from '@playwright/test';

test.describe('CardDrawAnimation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-card-draw');
  });

  test('draw 1 card: animation plays and card appears in hand', async ({ page }) => {
    await expect(page.getByTestId('animating-status')).toHaveText('idle');
    await page.getByTestId('draw-one').click();
    await expect(page.getByTestId('animating-status')).toHaveText('animating');
    await expect(page.getByTestId('card-draw-animation')).toBeVisible();
    await expect(page.getByTestId('draw-card-card-1')).toBeVisible();

    // Wait for animation to complete
    await expect(page.getByTestId('animating-status')).toHaveText('idle', { timeout: 5000 });
    await expect(page.getByTestId('hand-card-0')).toBeVisible();
    await expect(page.getByTestId('hand-card-0')).toContainText('Orc');
  });

  test('draw 3 cards: all arrive in hand with stagger', async ({ page }) => {
    await page.getByTestId('draw-three').click();
    await expect(page.getByTestId('animating-status')).toHaveText('animating');

    // All 3 draw cards should exist
    await expect(page.getByTestId('draw-card-card-a')).toBeVisible();
    await expect(page.getByTestId('draw-card-card-b')).toBeVisible();
    await expect(page.getByTestId('draw-card-card-c')).toBeVisible();

    // Wait for completion
    await expect(page.getByTestId('animating-status')).toHaveText('idle', { timeout: 5000 });
    await expect(page.getByTestId('hand-card-0')).toContainText('Sword');
    await expect(page.getByTestId('hand-card-1')).toContainText('Potion');
    await expect(page.getByTestId('hand-card-2')).toContainText('Helmet');
  });

  test('during animation, state not yet updated (hand empty)', async ({ page }) => {
    await page.getByTestId('draw-one').click();
    // During animation, hand should still be empty
    await expect(page.getByTestId('animating-status')).toHaveText('animating');
    const handCards = page.locator('[data-testid^="hand-card-"]');
    await expect(handCards).toHaveCount(0);
  });

  test('draw button disabled during animation', async ({ page }) => {
    await page.getByTestId('draw-one').click();
    await expect(page.getByTestId('draw-one')).toBeDisabled();
    await expect(page.getByTestId('draw-three')).toBeDisabled();
    await expect(page.getByTestId('animating-status')).toHaveText('idle', { timeout: 5000 });
    await expect(page.getByTestId('draw-one')).toBeEnabled();
  });
});
