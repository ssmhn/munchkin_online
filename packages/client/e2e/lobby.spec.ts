import { test, expect } from '@playwright/test';

test.describe('Lobby Page', () => {
  test('renders lobby page without errors', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('lobby-page')).toBeVisible();
    await expect(page.getByText('Munchkin Online')).toBeVisible();
    await expect(page.getByTestId('create-room')).toBeVisible();
    await expect(page.getByTestId('player-name')).toBeVisible();
    await expect(page.getByTestId('room-list')).toBeVisible();
  });

  test('player name input works', async ({ page }) => {
    await page.goto('/');
    const input = page.getByTestId('player-name');
    await input.fill('TestPlayer');
    await expect(input).toHaveValue('TestPlayer');
  });

  test('no console errors on page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForTimeout(500);
    // Allow fetch errors for /lobby/rooms (no server running in dev)
    const realErrors = errors.filter(e => !e.includes('fetch') && !e.includes('Failed to load'));
    expect(realErrors).toHaveLength(0);
  });
});

test.describe('Game Page', () => {
  test('shows loading state without token', async ({ page }) => {
    await page.goto('/game/test-room');
    await expect(page.getByTestId('game-loading')).toBeVisible();
    await expect(page.getByText('Connecting to game')).toBeVisible();
  });
});
