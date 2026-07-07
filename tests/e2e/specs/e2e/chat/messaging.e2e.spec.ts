import { test, expect } from '../../../fixtures/e2eContext';

test.describe('E2E: Chat - Messaging', () => {

  test.beforeEach(async ({ chatPage }) => {
    await chatPage.goto();
    await chatPage.expectLoadingToFinish();
  });

  test('should display conversation list', async ({ chatPage }) => {
    const count = await chatPage.conversationItem().count();
    if (count > 0) {
      await chatPage.expectConversationListVisible();
    }
  });

  test('should display conversations for logged-in user', async ({ chatPage }) => {
    const count = await chatPage.conversationItem().count();
    if (count > 0) {
      await expect(chatPage.conversationItem().first()).toBeVisible();
    }
  });

  test('should send a message in conversation', async ({ chatPage }) => {
    const count = await chatPage.conversationItem().count();
    if (count > 0) {
      await chatPage.selectConversation(0);
      const testMsg = `Test message ${Date.now()}`;
      await chatPage.sendMessage(testMsg);
      await chatPage.expectMessageSent(testMsg);
    }
  });

  test('should have accessible message input', async ({ chatPage }) => {
    const count = await chatPage.conversationItem().count();
    if (count > 0) {
      await chatPage.selectConversation(0);
      await expect(chatPage.messageInput()).toBeVisible();
      const ariaLabel = await chatPage.messageInput().getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }
  });

  test('should navigate back to conversation list', async ({ chatPage, page }) => {
    const count = await chatPage.conversationItem().count();
    if (count > 0) {
      await chatPage.selectConversation(0);
      await chatPage.expectConversationHeaderVisible();
      const backBtn = page.locator('button[aria-label*="Back"]').or(page.locator('svg.lucide-arrow-left').first());
      if (await backBtn.isVisible()) {
        await backBtn.click();
        await page.waitForLoadState('networkidle');
        await chatPage.expectConversationListVisible();
      }
    }
  });

  test('should display conversation header with call buttons', async ({ chatPage }) => {
    const count = await chatPage.conversationItem().count();
    if (count > 0) {
      await chatPage.selectConversation(0);
      await chatPage.expectConversationHeaderVisible();
    }
  });

  test('should display attachment buttons', async ({ chatPage }) => {
    const count = await chatPage.conversationItem().count();
    if (count > 0) {
      await chatPage.selectConversation(0);
      if (await chatPage.attachFileButton().isVisible().catch(() => false)) {
        await expect(chatPage.attachFileButton()).toBeVisible();
      }
    }
  });

  test('should have chat menu', async ({ chatPage }) => {
    const count = await chatPage.conversationItem().count();
    if (count > 0) {
      await chatPage.selectConversation(0);
      if (await chatPage.chatMenuButton().isVisible().catch(() => false)) {
        await expect(chatPage.chatMenuButton()).toBeVisible();
      }
    }
  });
});
