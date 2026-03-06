import { test, expect } from '@playwright/test';

test.describe('Design System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-design');
  });

  test('GoldButton renders primary and danger variants', async ({ page }) => {
    const primary = page.getByTestId('btn-primary');
    const danger = page.getByTestId('btn-danger');
    const disabled = page.getByTestId('btn-disabled');

    await expect(primary).toBeVisible();
    await expect(danger).toBeVisible();
    await expect(disabled).toBeVisible();
    await expect(disabled).toBeDisabled();
  });

  test('GoldButton hover does not use CSS transition for transform', async ({ page }) => {
    const btn = page.getByTestId('btn-primary');
    const transitionProp = await btn.evaluate(
      (el) => window.getComputedStyle(el).transitionProperty
    );
    // Should not have transform/scale CSS transitions — GSAP handles hover
    expect(transitionProp).not.toContain('transform');
    expect(transitionProp).not.toContain('scale');
    expect(transitionProp).not.toContain('box-shadow');
  });

  test('CardFrame shows correct border color per type', async ({ page }) => {
    const monster = page.getByTestId('card-monster');
    const equipment = page.getByTestId('card-equipment');
    const cls = page.getByTestId('card-class');

    await expect(monster).toBeVisible();
    await expect(equipment).toBeVisible();
    await expect(cls).toBeVisible();

    // Check data-card-type attributes
    await expect(monster).toHaveAttribute('data-card-type', 'MONSTER');
    await expect(equipment).toHaveAttribute('data-card-type', 'EQUIPMENT');
    await expect(cls).toHaveAttribute('data-card-type', 'CLASS');
  });

  test('LevelBadge displays level and updates on click', async ({ page }) => {
    const badge = page.getByTestId('level-badge');
    const levelText = page.getByTestId('level-value');

    await expect(badge).toHaveText('1');
    await expect(levelText).toHaveText('Current: 1');

    await page.getByTestId('btn-level-up').click();
    await expect(badge).toHaveText('2');
    await expect(levelText).toHaveText('Current: 2');
  });

  test('LevelBadge level down works', async ({ page }) => {
    await page.getByTestId('btn-level-up').click();
    await page.getByTestId('btn-level-up').click();
    await expect(page.getByTestId('level-badge')).toHaveText('3');

    await page.getByTestId('btn-level-down').click();
    await expect(page.getByTestId('level-badge')).toHaveText('2');
  });

  test('CSS variables are applied to body', async ({ page }) => {
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    // --color-bg: #1a1208 → rgb(26, 18, 8)
    expect(bgColor).toBe('rgb(26, 18, 8)');
  });

  test('fantasy font is loaded', async ({ page }) => {
    const fontFamily = await page.getByTestId('section-buttons').evaluate(
      (el) => window.getComputedStyle(el).fontFamily
    );
    expect(fontFamily.toLowerCase()).toContain('cinzel');
  });
});
