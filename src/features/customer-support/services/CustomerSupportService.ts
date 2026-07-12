import { GeminiProvider } from '../providers/GeminiProvider'
import { buildSupportPrompt } from '../knowledge'
import type { DocKey } from '../knowledge'
import { selectDocumentKeys } from './DocumentSelector'

export class CustomerSupportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CustomerSupportError'
  }
}

export class CustomerSupportService {
  private provider: GeminiProvider

  constructor(provider: GeminiProvider = new GeminiProvider()) {
    this.provider = provider
  }

  async sendMessage(message: string): Promise<string> {
    try {
      const matched = selectDocumentKeys(message)
      // `faq` is always included: as a general fallback and alongside topic matches.
      const docKeys: DocKey[] = Array.from(new Set<DocKey>([...matched, 'faq']))
      return await this.provider.sendMessage(buildSupportPrompt(message, docKeys))
    } catch (error) {
      if (error instanceof CustomerSupportError) throw error
      throw new CustomerSupportError(
        'We’re having trouble connecting right now. Please try again in a moment.',
      )
    }
  }
}

export const customerSupportService = new CustomerSupportService()
