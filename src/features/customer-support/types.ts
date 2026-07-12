export type SupportRole = 'user' | 'support'

export type SupportMessageStatus = 'sending' | 'sent' | 'error'

export interface SupportMessage {
  id: string
  role: SupportRole
  content: string
  timestamp: number
  status?: SupportMessageStatus
}

export interface SupportWidgetProps {
  /** Header title. Defaults to "ValClassifieds Support". */
  title?: string
  /** Status line shown under the title (e.g. "Typically replies in a few minutes"). */
  subtitle?: string
  /** Shows the online indicator when true. Defaults to true. */
  online?: boolean
  /** Greeting shown on first open before any messages exist. */
  welcomeMessage?: string
  /** Seed the conversation (e.g. from persisted history). */
  initialMessages?: SupportMessage[]
  /** Placeholder for the message input. */
  inputPlaceholder?: string
  /** When true, shows the typing indicator (e.g. awaiting a backend response). */
  typing?: boolean
  /**
   * Future integration point. Called with the user's text when they send a
   * message. Wire this to Gemini / a backend later — no logic lives here.
   */
  onSendMessage?: (text: string) => void
}
