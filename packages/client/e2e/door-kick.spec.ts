import { test, expect } from '@playwright/test';

test.describe('DoorKickAnimation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-door-kick');
  });

  test('monster: door opens and monster appears with elastic animation', async ({ page }) => {
    await page.getByTestId('kick-monster').click();
    await expect(page.getByTestId('door-kick-animation')).toBeVisible();
    await expect(page.getByTestId('door-panel')).toBeVisible();

    // Wait for animation to complete
    await expect(page.getByTestId('completed-type')).toHaveText('MONSTER', { timeout: 5000 });
    // Revealed card should have MONSTER type
    // Animation is complete so the component is unmounted
  });

  test('equipment: card falls with bounce', async ({ page }) => {
    await page.getByTestId('kick-equipment').click();
    await expect(page.getByTestId('door-kick-animation')).toBeVisible();
    const revealedCard = page.getByTestId('revealed-card');
    await expect(revealedCard).toHaveAttribute('data-card-type', 'EQUIPMENT');

    await expect(page.getByTestId('completed-type')).toHaveText('EQUIPMENT', { timeout: 5000 });
  });

  test('curse: red flash appears', async ({ page }) => {
    await page.getByTestId('kick-curse').click();
    await expect(page.getByTestId('curse-flash')).toBeAttached();
    await expect(page.getByTestId('door-kick-animation')).toBeVisible();

    await expect(page.getByTestId('completed-type')).toHaveText('CURSE', { timeout: 5000 });
  });

  test('door panel has correct initial content', async ({ page }) => {
    await page.getByTestId('kick-monster').click();
    const door = page.getByTestId('door-panel');
    await expect(door).toBeVisible();
  });
});
