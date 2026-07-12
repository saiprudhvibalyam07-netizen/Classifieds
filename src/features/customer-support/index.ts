export { SupportWidget } from './components/SupportWidget'
export type { SupportWidgetProps } from './types'
export type { SupportMessage, SupportRole, SupportMessageStatus } from './types'

export { GEMINI_CONFIG } from './config/gemini'
export { GeminiProvider } from './providers/GeminiProvider'
export {
  SYSTEM_PROMPT,
  KNOWLEDGE_BASE,
  buildSupportPrompt,
} from './knowledge'
export type { DocKey } from './knowledge'
export { selectDocumentKeys } from './services/DocumentSelector'
export {
  CustomerSupportService,
  CustomerSupportError,
  customerSupportService,
} from './services/CustomerSupportService'
