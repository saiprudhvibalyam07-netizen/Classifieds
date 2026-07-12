import type { DocKey } from '../knowledge'

interface SelectionRule {
  key: DocKey
  keywords: string[]
}

/**
 * Lightweight, dependency-free keyword rules. A document is selected when any of
 * its keywords appears in the (lowercased) customer message. Multiple documents
 * can match; `faq` is always added by the caller as a general fallback.
 */
const RULES: SelectionRule[] = [
  {
    key: 'buying',
    keywords: ['buy', 'buying', 'purchase', 'purchasing', 'order', 'checkout', 'pay', 'paid', 'payment', 'cod'],
  },
  {
    key: 'selling',
    keywords: ['sell', 'selling', 'promote', 'promoted', 'pricing', 'price my'],
  },
  {
    key: 'listings',
    keywords: [
      'listing', 'listings', 'post', 'create', 'edit', 'delete', 'draft',
      'photo', 'photos', 'upload', 'title', 'description', 'visibility', 'sold', 'publish',
    ],
  },
  {
    key: 'messaging',
    keywords: ['message', 'messages', 'messaging', 'chat', 'contact', 'inbox', 'conversation', 'reply', 'block', 'report'],
  },
  {
    key: 'account',
    keywords: [
      'account', 'password', 'login', 'log in', 'sign up', 'signup', 'register',
      'profile', 'email', 'verify', 'verified', 'favorites', 'favourite',
      'delete account', 'disable account',
    ],
  },
  {
    key: 'safety',
    keywords: [
      'safety', 'scam', 'fraud', 'suspicious', 'secure', 'security', 'fake',
      'stolen', 'illegal', 'meet', 'meeting', 'trust', 'report', 'robbery',
    ],
  },
  {
    key: 'navigation',
    keywords: [
      'navigation', 'home', 'menu', 'browse', 'category', 'categories',
      'dashboard', 'page', 'search', 'where', 'find', 'mobile', 'hamburger', 'get to',
    ],
  },
  {
    key: 'marketplace-rules',
    keywords: [
      'rules', 'rule', 'policy', 'policies', 'allowed', 'prohibited', 'banned',
      'counterfeit', 'spam', 'violation', 'suspend', 'suspended', 'enforce', 'terms', 'illegal',
    ],
  },
]

export function selectDocumentKeys(message: string): DocKey[] {
  const text = message.toLowerCase()
  const matched = new Set<DocKey>()

  for (const rule of RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      matched.add(rule.key)
    }
  }

  return [...matched]
}
