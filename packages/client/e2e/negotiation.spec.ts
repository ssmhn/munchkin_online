import { test, expect } from '@playwright/test';

test.describe('NegotiationModal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-negotiation');
  });

  test('send mode: shows player targets and reward cards', async ({ page }) => {
    await expect(page.getByTestId('negotiation-modal')).toBeVisible();
    await expect(page.getByTestId('negotiation-title')).toHaveText('Ask for Help');
    await expect(page.getByTestId('send-offer')).toBeVisible();
    await expect(page.getByTestId('target-p2')).toBeVisible();
    await expect(page.getByTestId('target-p3')).toBeVisible();
    await expect(page.getByTestId('reward-sword-1')).toBeVisible();
    await expect(page.getByTestId('reward-potion-1')).toBeVisible();
  });

  test('send mode: select card and send offer', async ({ page }) => {
    await page.getByTestId('target-p3').click();
    await page.getByTestId('reward-sword-1').click();
    await page.getByTestId('btn-send-offer').click();
    await expect(page.getByTestId('negotiation-modal')).not.toBeVisible();
    await expect(page.getByTestId('result')).toHaveText('sent:p3:sword-1');
  });

  test('send mode: cancel closes modal', async ({ page }) => {
    await page.getByTestId('btn-cancel').click();
    await expect(page.getByTestId('negotiation-modal')).not.toBeVisible();
    await expect(page.getByTestId('result')).toHaveText('cancelled');
  });

  test('receive mode: shows incoming offer with accept/decline', async ({ page }) => {
    await page.getByTestId('btn-cancel').click();
    await page.getByTestId('show-receive').click();
    await expect(page.getByTestId('negotiation-title')).toHaveText('Help Offer Received');
    await expect(page.getByTestId('incoming-offer')).toBeVisible();
    await expect(page.getByTestId('offer-rewards')).toContainText('Sword of Doom (+3)');
    await expect(page.getByTestId('btn-accept')).toBeVisible();
    await expect(page.getByTestId('btn-decline')).toBeVisible();
    await expect(page.getByTestId('btn-counter')).toBeVisible();
  });

  test('receive mode: accept adds helper', async ({ page }) => {
    await page.getByTestId('btn-cancel').click();
    await page.getByTestId('show-receive').click();
    await page.getByTestId('btn-accept').click();
    await expect(page.getByTestId('negotiation-modal')).not.toBeVisible();
    await expect(page.getByTestId('helper-status')).toHaveText('Helper');
  });

  test('receive mode: decline closes modal without helper', async ({ page }) => {
    await page.getByTestId('btn-cancel').click();
    await page.getByTestId('show-receive').click();
    await page.getByTestId('btn-decline').click();
    await expect(page.getByTestId('negotiation-modal')).not.toBeVisible();
    await expect(page.getByTestId('result')).toHaveText('declined');
    await expect(page.getByTestId('helper-status')).toHaveText('none');
  });

  test('timer bar is visible', async ({ page }) => {
    await expect(page.getByTestId('negotiation-timer')).toBeVisible();
  });
});
