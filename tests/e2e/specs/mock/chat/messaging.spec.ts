import { test, expect } from '../../../fixtures/testContext';
import { mockSupabaseAuth } from '../../../utils/mockAuth';

test.describe('Chat - Messaging', () => {
  test.beforeEach(async ({ chatPage, page }) => {
    await mockSupabaseAuth(page);
    await chatPage.goto();
  });

  test('should display conversation list with multiple items', async ({ chatPage, page }) => {
    await chatPage.expectLoadingToFinish();
    await chatPage.expectConversationListVisible();
    const count = await page.locator('[data-testid="chat-conversation-item"]').count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('should display conversations for logged-in user', async ({ chatPage, page }) => {
    await chatPage.expectLoadingToFinish();
    const items = page.locator('[data-testid="chat-conversation-item"]');
    await expect(items.first()).toBeVisible();
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should send a message in conversation', async ({ chatPage, page }) => {
    await chatPage.expectLoadingToFinish();
    await chatPage.selectConversation(0);
    const messageText = `Test message ${Date.now()}`;
    await chatPage.sendMessage(messageText);
    await chatPage.expectMessageSent(messageText);
  });

  test('should have unread badge visible for conversations with unread messages', async ({ chatPage, page }) => {
    await chatPage.expectLoadingToFinish();
    const badge = page.locator('[data-testid="chat-unread-badge"]');
    await expect(badge.first()).toBeVisible({ timeout: 5000 });
  });

  test('should have accessible message input after selecting conversation', async ({ chatPage, page }) => {
    await chatPage.expectLoadingToFinish();
    await chatPage.selectConversation(0);
    const input = page.locator('[data-testid="chat-message-input"]');
    await expect(input).toBeVisible({ timeout: 5000 });
    await expect(input).toHaveAttribute('aria-label');
  });

  test('should navigate back to conversation list from active conversation', async ({ chatPage, page }) => {
    await chatPage.expectLoadingToFinish();
    await chatPage.selectConversation(0);
    await expect(page.locator('[data-testid="chat-message-area"]')).toBeVisible({ timeout: 5000 });
    const backButton = page.locator('button[aria-label="Back to conversations"]');
    if (await backButton.isVisible().catch(() => false)) {
      await backButton.click();
      await chatPage.expectConversationListVisible();
    }
  });

  test('should display conversation header with call buttons', async ({ chatPage, page }) => {
    await chatPage.expectLoadingToFinish();
    await chatPage.selectConversation(0);
    await chatPage.expectConversationHeaderVisible();
    const voiceBtn = page.locator('[data-testid="voice-call-button"]');
    const videoBtn = page.locator('[data-testid="video-call-button"]');
    await expect(voiceBtn).toBeVisible();
    await expect(videoBtn).toBeVisible();
  });

  test('should display file attachment button', async ({ chatPage, page }) => {
    await chatPage.expectLoadingToFinish();
    await chatPage.selectConversation(0);
    const btn = page.locator('[data-testid="attach-file-button"]');
    await expect(btn).toBeVisible();
  });

  test('should display camera button', async ({ chatPage, page }) => {
    await chatPage.expectLoadingToFinish();
    await chatPage.selectConversation(0);
    const btn = page.locator('[data-testid="attach-camera-button"]');
    await expect(btn).toBeVisible();
  });

  test('should display voice recording button', async ({ chatPage, page }) => {
    await chatPage.expectLoadingToFinish();
    await chatPage.selectConversation(0);
    const btn = page.locator('[data-testid="attach-voice-button"]');
    await expect(btn).toBeVisible();
  });

  test('should display chat menu with options', async ({ chatPage, page }) => {
    await chatPage.expectLoadingToFinish();
    await chatPage.selectConversation(0);
    const menuBtn = page.locator('[data-testid="chat-menu-button"]');
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
    const dropdown = page.locator('[data-testid="chat-menu-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 3000 });
  });

  test('should display message status indicator', async ({ chatPage, page }) => {
    await chatPage.expectLoadingToFinish();
    await chatPage.selectConversation(0);
    const status = page.locator('[data-testid="message-status"]');
    await expect(status.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display reaction picker on message hover', async ({ chatPage, page }) => {
    await chatPage.expectLoadingToFinish();
    await chatPage.selectConversation(0);
    const bubble = page.locator('[data-testid="chat-message-bubble"]').first();
    await bubble.hover();
    const picker = page.locator('[data-testid="reaction-picker"]').first();
    await expect(picker).toBeVisible({ timeout: 3000 });
  });
});
