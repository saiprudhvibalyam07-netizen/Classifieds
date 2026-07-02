import { Page, expect } from '@playwright/test';

export class ChatPage {
  constructor(private page: Page) {}

  private conversationList = () => this.page.locator('[data-testid="chat-conversation-list"]');
  private conversationItem = () => this.page.locator('[data-testid="chat-conversation-item"]');
  private conversationSearch = () => this.page.locator('[data-testid="chat-conversation-search"]');
  private messageArea = () => this.page.locator('[data-testid="chat-message-area"]');
  private messageBubble = () => this.page.locator('[data-testid="chat-message-bubble"]');
  private messageInput = () => this.page.locator('[data-testid="chat-message-input"]');
  private sendButton = () => this.page.locator('[data-testid="chat-send-button"]');
  private attachmentButton = () => this.page.locator('[data-testid="chat-attachment-button"]');
  private typingIndicator = () => this.page.locator('[data-testid="chat-typing-indicator"]');
  private unreadBadge = () => this.page.locator('[data-testid="chat-unread-badge"]');
  private emptyState = () => this.page.locator('[data-testid="chat-empty-state"]');
  private loadingSkeleton = () => this.page.locator('[data-testid="chat-loading-skeleton"]');

  async goto() {
    await this.page.goto('/messages');
    await this.page.waitForLoadState('networkidle');
  }

  async selectConversation(index: number = 0) {
    await this.conversationItem().nth(index).click();
    await this.page.waitForLoadState('networkidle');
  }

  async sendMessage(text: string) {
    await this.messageInput().fill(text);
    await this.sendButton().click();
  }

  async searchConversations(query: string) {
    await this.conversationSearch().fill(query);
  }

  async expectConversationListVisible() {
    await expect(this.conversationList()).toBeVisible({ timeout: 10000 });
  }

  async expectMessageSent(text: string) {
    await expect(this.messageArea().locator(`text=${text}`)).toBeVisible({ timeout: 5000 });
  }

  async expectEmptyState() {
    await expect(this.emptyState().first()).toBeVisible();
  }

  async expectLoadingToFinish() {
    await expect(this.loadingSkeleton()).not.toBeVisible({ timeout: 10000 }).catch(() => {});
  }

  async getUnreadBadgeCount(): Promise<number> {
    const badge = this.unreadBadge();
    if (await badge.isVisible().catch(() => false)) {
      const text = await badge.textContent();
      return parseInt(text || '0', 10);
    }
    return 0;
  }
}
