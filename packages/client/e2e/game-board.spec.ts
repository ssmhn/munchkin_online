import { test, expect } from '@playwright/test';

test.describe('Game Board', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-board');
  });

  test('renders player areas with correct levels', async ({ page }) => {
    await expect(page.getByTestId('game-board')).toBeVisible();
    await expect(page.getByTestId('player-area-p1')).toBeVisible();
    await expect(page.getByTestId('player-area-p2')).toBeVisible();
    await expect(page.getByTestId('player-level-p1')).toHaveText('3');
    await expect(page.getByTestId('player-level-p2')).toHaveText('1');
  });

  test('shows player name, race, class, gender', async ({ page }) => {
    await expect(page.getByTestId('player-name-p1')).toHaveText('Alice');
    await expect(page.getByTestId('player-race-p1')).toHaveText('ELF');
    await expect(page.getByTestId('player-class-p1')).toHaveText('WIZARD');
    await expect(page.getByTestId('player-gender-p1')).toHaveText('FEMALE');
  });

  test('own hand shows real cards, other hand shows backs', async ({ page }) => {
    await expect(page.getByTestId('own-hand')).toBeVisible();
    await expect(page.getByTestId('card-sword_1')).toBeVisible();
    await expect(page.getByTestId('card-potion_2')).toBeVisible();
    await expect(page.getByTestId('card-armor_3')).toBeVisible();

    // Other player's hand shows backs
    await expect(page.getByTestId('other-hand')).toBeVisible();
    const cardBacks = page.getByTestId('card-back');
    await expect(cardBacks).toHaveCount(2);
  });

  test('deck areas show card counts', async ({ page }) => {
    await expect(page.getByTestId('door-deck-count')).toHaveText('20');
    await expect(page.getByTestId('treasure-deck-count')).toHaveText('15');
  });

  test('game log shows entries', async ({ page }) => {
    await expect(page.getByTestId('game-log')).toBeVisible();
    await expect(page.getByText('Alice kicked the door')).toBeVisible();
    await expect(page.getByText('A Big Rat appears!')).toBeVisible();
  });

  test('active player is highlighted', async ({ page }) => {
    const p1Area = page.getByTestId('player-area-p1');
    const border = await p1Area.evaluate(el => getComputedStyle(el).borderColor);
    // Active player p1 should have gold border
    expect(border).not.toBe('rgb(68, 68, 68)');
  });

  test('self marker shown for own player', async ({ page }) => {
    await expect(page.getByTestId('self-marker')).toBeVisible();
    await expect(page.getByTestId('self-marker')).toHaveText('(You)');
  });

  test('level updates reactively on button click', async ({ page }) => {
    await expect(page.getByTestId('player-level-p1')).toHaveText('3');
    await page.getByTestId('bump-level').click();
    await expect(page.getByTestId('player-level-p1')).toHaveText('4');
    await page.getByTestId('bump-level').click();
    await expect(page.getByTestId('player-level-p1')).toHaveText('5');
  });

  test('card count shown for each player', async ({ page }) => {
    await expect(page.getByTestId('player-cards-p1')).toHaveText('Cards: 3');
    await expect(page.getByTestId('player-cards-p2')).toHaveText('Cards: 2');
  });
});
