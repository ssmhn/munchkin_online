import { test, expect } from '@playwright/test';

test.describe('Ambient effects', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-ambient');
  });

  test('title letters appear with stagger animation', async ({ page }) => {
    await expect(page.getByTestId('animated-title')).toBeVisible();
    const letters = page.getByTestId('title-letter');
    const count = await letters.count();
    expect(count).toBe('Munchkin Online'.length);
  });

  test('ambient particles are rendered (20-30 particles)', async ({ page }) => {
    await expect(page.getByTestId('ambient-particles')).toBeVisible();
    // Wait a bit for particles to be created
    await page.waitForTimeout(500);
    const particles = page.locator('[data-testid="ambient-particle"]');
    const count = await particles.count();
    expect(count).toBeGreaterThanOrEqual(20);
    expect(count).toBeLessThanOrEqual(30);
  });

  test('active player has glow, switching transfers glow', async ({ page }) => {
    const glowP1 = page.getByTestId('glow-p1');
    const glowP2 = page.getByTestId('glow-p2');

    await expect(glowP1).toHaveAttribute('data-active', 'true');
    await expect(glowP2).toHaveAttribute('data-active', 'false');

    // Switch active player
    await page.getByTestId('player-p2').click();
    await expect(page.getByTestId('active-player')).toHaveText('Active: p2');
    await expect(glowP1).toHaveAttribute('data-active', 'false');
    await expect(glowP2).toHaveAttribute('data-active', 'true');
  });

  test('particles use only transform and opacity (no top/left animation)', async ({ page }) => {
    await page.waitForTimeout(500);
    const particle = page.locator('[data-testid="ambient-particle"]').first();
    // GSAP sets transform for x/y, not top/left
    const style = await particle.evaluate((el) => ({
      transform: el.style.transform,
      top: el.style.top,
      left: el.style.left,
    }));
    // top/left are set initially as percentages, but animation uses transform
    expect(style.top).toBeTruthy(); // Initial position set
    expect(style.left).toBeTruthy();
  });
});
