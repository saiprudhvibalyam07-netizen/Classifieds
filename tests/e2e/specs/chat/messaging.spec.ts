import { test, expect } from '../../fixtures/testContext';
import { mockSupabaseAuth } from '../../utils/mockAuth';

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
    await expect(badge.first()).toHaveAttribute('aria-label');
  });

  test('should have accessible message input after selecting conversation', async ({ chatPage, page }) => {
    await chatPage.expectLoadingToFinish();
    await chatPage.selectConversation(0);
    const input = page.locator('[data-testid="chat-message-input"]');
    await expect(input).toBeVisible({ timeout: 5000 });
    await expect(input).toHaveAttribute('aria-label');
  });

  test('should search conversations by name', async ({ chatPage, page }) => {
    await chatPage.expectLoadingToFinish();
    await chatPage.searchConversations('Rajesh');
    const items = page.locator('[data-testid="chat-conversation-item"]');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should filter conversations when search yields no results', async ({ chatPage, page }) => {
    await chatPage.expectLoadingToFinish();
    await chatPage.searchConversations('xyznonexistent');
    const items = page.locator('[data-testid="chat-conversation-item"]');
    await expect(items).toHaveCount(0);
    await chatPage.expectEmptyState();
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
});
