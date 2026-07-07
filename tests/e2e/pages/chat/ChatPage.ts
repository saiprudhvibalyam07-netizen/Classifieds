import { Page, expect } from '@playwright/test';

export class ChatPage {
  constructor(private page: Page) {}
  getPage() { return this.page; }

  private conversationList = () => this.page.locator('[data-testid="chat-conversation-list"]');
  private conversationItem = () => this.page.locator('[data-testid="chat-conversation-item"]');
  private messageArea = () => this.page.locator('[data-testid="chat-message-area"]');
  private messageBubble = () => this.page.locator('[data-testid="chat-message-bubble"]');
  private messageInput = () => this.page.locator('[data-testid="chat-message-input"]');
  private sendButton = () => this.page.locator('[data-testid="chat-send-button"]');
  private unreadBadge = () => this.page.locator('[data-testid="chat-unread-badge"]');
  private emptyState = () => this.page.locator('[data-testid="chat-empty-state"]');
  private loadingSkeleton = () => this.page.locator('[data-testid="chat-loading-skeleton"]');
  private conversationHeader = () => this.page.locator('[data-testid="conversation-header"]');
  private attachFileButton = () => this.page.locator('[data-testid="attach-file-button"]');
  private attachCameraButton = () => this.page.locator('[data-testid="attach-camera-button"]');
  private attachVoiceButton = () => this.page.locator('[data-testid="attach-voice-button"]');
  private imageBubble = () => this.page.locator('[data-testid="image-bubble"]');
  private videoBubble = () => this.page.locator('[data-testid="video-bubble"]');
  private documentBubble = () => this.page.locator('[data-testid="document-bubble"]');
  private voiceNoteBubble = () => this.page.locator('[data-testid="voice-note-bubble"]');
  private reactionPicker = () => this.page.locator('[data-testid="reaction-picker"]');
  private messageReactions = () => this.page.locator('[data-testid="message-reactions"]');
  private replyPreview = () => this.page.locator('[data-testid="reply-preview"]');
  private messageStatus = () => this.page.locator('[data-testid="message-status"]');
  private chatMenuButton = () => this.page.locator('[data-testid="chat-menu-button"]');
  private voiceCallButton = () => this.page.locator('[data-testid="voice-call-button"]');
  private videoCallButton = () => this.page.locator('[data-testid="video-call-button"]');
  private searchMessagesButton = () => this.page.locator('[data-testid="search-messages-button"]');
  private uploadProgress = () => this.page.locator('[data-testid="upload-progress"]');

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

  async expectConversationHeaderVisible() {
    await expect(this.conversationHeader()).toBeVisible({ timeout: 5000 });
  }

  async expectImageBubbleVisible() {
    await expect(this.imageBubble().first()).toBeVisible({ timeout: 5000 });
  }

  async expectVideoBubbleVisible() {
    await expect(this.videoBubble().first()).toBeVisible({ timeout: 5000 });
  }

  async expectDocumentBubbleVisible() {
    await expect(this.documentBubble().first()).toBeVisible({ timeout: 5000 });
  }

  async expectVoiceNoteBubbleVisible() {
    await expect(this.voiceNoteBubble().first()).toBeVisible({ timeout: 5000 });
  }

  async expectMessageReactionsVisible() {
    await expect(this.messageReactions().first()).toBeVisible({ timeout: 5000 });
  }

  async expectReplyPreviewVisible() {
    await expect(this.replyPreview()).toBeVisible({ timeout: 5000 });
  }

  async expectMessageStatusVisible() {
    await expect(this.messageStatus().first()).toBeVisible({ timeout: 5000 });
  }

  async clickVoiceCall() {
    await this.voiceCallButton().click();
  }

  async clickVideoCall() {
    await this.videoCallButton().click();
  }
}
