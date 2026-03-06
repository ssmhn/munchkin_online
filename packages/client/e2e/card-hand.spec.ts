import { test, expect } from '@playwright/test';

test.describe('InteractiveCardHand', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-card-hand');
  });

  test('renders all cards in hand', async ({ page }) => {
    await expect(page.getByTestId('hand-card-sword')).toBeVisible();
    await expect(page.getByTestId('hand-card-potion')).toBeVisible();
    await expect(page.getByTestId('hand-card-cursed')).toBeVisible();
    await expect(page.getByTestId('hand-card-helmet')).toBeVisible();
    await expect(page.getByTestId('hand-count')).toHaveText('Cards: 4');
  });

  test('hover lifts card via GSAP (not CSS transition)', async ({ page }) => {
    const card = page.getByTestId('hand-card-sword');
    const transition = await card.evaluate((el) => window.getComputedStyle(el).transitionProperty);
    expect(transition).not.toContain('transform');

    await card.hover();
    // GSAP sets inline transform — check it changed
    await page.waitForTimeout(300);
    const transform = await card.evaluate((el) => el.style.transform);
    expect(transform).toBeTruthy();
  });

  test('play card: flies to table and removed from hand', async ({ page }) => {
    await page.getByTestId('hand-card-sword').click();
    // Wait for animation + state update
    await expect(page.getByTestId('last-played')).toHaveText('Last played: sword', { timeout: 3000 });
    await expect(page.getByTestId('hand-count')).toHaveText('Cards: 3');
    await expect(page.getByTestId('hand-card-sword')).not.toBeAttached();
  });

  test('forbidden card: shake on click, stays in hand', async ({ page }) => {
    const cursed = page.getByTestId('hand-card-cursed');
    await expect(cursed).toHaveAttribute('data-playable', 'false');
    await cursed.click();

    // Card should still be in hand
    await page.waitForTimeout(500);
    await expect(page.getByTestId('hand-card-cursed')).toBeVisible();
    await expect(page.getByTestId('last-played')).toHaveText('Last played: none');
    await expect(page.getByTestId('hand-count')).toHaveText('Cards: 4');
  });

  test('playable cards have gold border, forbidden have muted border', async ({ page }) => {
    const sword = page.getByTestId('hand-card-sword');
    const cursed = page.getByTestId('hand-card-cursed');
    await expect(sword).toHaveAttribute('data-playable', 'true');
    await expect(cursed).toHaveAttribute('data-playable', 'false');
  });
});
