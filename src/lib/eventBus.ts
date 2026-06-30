type EventHandler = (...args: unknown[]) => void

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>()

  on(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler)
    return () => { this.handlers.get(event)?.delete(handler) }
  }

  off(event: string, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler)
  }

  emit(event: string, ...args: unknown[]): void {
    this.handlers.get(event)?.forEach((handler) => {
      try { handler(...args) } catch { /* swallow handler errors */ }
    })
  }

  clear(): void {
    this.handlers.clear()
  }
}

export const eventBus = new EventBus()

export const ChatEvents = {
  MessageSent: 'chat:message:sent',
  MessageRead: 'chat:message:read',
  ConversationCreated: 'chat:conversation:created',
  ConversationDeleted: 'chat:conversation:deleted',
  UnreadChanged: 'chat:unread:changed',
  OnlineStatusChanged: 'chat:presence:changed',
  ToastShown: 'chat:toast:shown',
} as const
