import buying from './buying.md?raw'
import selling from './selling.md?raw'
import listings from './listings.md?raw'
import messaging from './messaging.md?raw'
import account from './account.md?raw'
import safety from './safety.md?raw'
import faq from './faq.md?raw'
import navigation from './navigation.md?raw'
import marketplaceRules from './marketplace-rules.md?raw'
import systemPrompt from './system-prompt.md?raw'

export type DocKey =
  | 'buying'
  | 'selling'
  | 'listings'
  | 'messaging'
  | 'account'
  | 'safety'
  | 'navigation'
  | 'marketplace-rules'
  | 'faq'

export const SYSTEM_PROMPT = systemPrompt.trim()

const DOCUMENTS: Record<DocKey, string> = {
  buying,
  selling,
  listings,
  messaging,
  account,
  safety,
  faq,
  navigation,
  'marketplace-rules': marketplaceRules,
}

const TITLES: Record<DocKey, string> = {
  buying: 'Buying Guide',
  selling: 'Selling Guide',
  listings: 'Listing Guide',
  messaging: 'Messaging Guide',
  account: 'Account Help',
  safety: 'Safety Tips',
  faq: 'FAQ',
  navigation: 'Navigation Help',
  'marketplace-rules': 'Marketplace Rules',
}

export const ALL_DOC_KEYS: DocKey[] = Object.keys(DOCUMENTS) as DocKey[]

export const KNOWLEDGE_BASE = ALL_DOC_KEYS
  .map((key) => `# ${TITLES[key]}\n\n${DOCUMENTS[key].trim()}`)
  .join('\n\n')

/**
 * Assembles the full prompt sent to Gemini.
 * @param customerMessage the user's question
 * @param docKeys which knowledge documents to include (defaults to all)
 */
export function buildSupportPrompt(
  customerMessage: string,
  docKeys: DocKey[] = ALL_DOC_KEYS,
): string {
  const selected = docKeys
    .map((key) => `# ${TITLES[key]}\n\n${DOCUMENTS[key].trim()}`)
    .join('\n\n')

  return [
    SYSTEM_PROMPT,
    '',
    '=== VALCLASSIFIEDS SUPPORT DOCUMENTATION ===',
    '',
    selected,
    '',
    '=== END DOCUMENTATION ===',
    '',
    `Customer message: ${customerMessage}`,
  ].join('\n')
}
