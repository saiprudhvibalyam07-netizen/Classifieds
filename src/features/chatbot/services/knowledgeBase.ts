import type { KnowledgeDocument, KnowledgeChunk, SourceType } from '../types'
import { logger } from './logger'

const documents = new Map<string, KnowledgeDocument>()
const chunks = new Map<string, KnowledgeChunk>()
const documentChunks = new Map<string, string[]>()

export async function addDocument(doc: KnowledgeDocument): Promise<void> {
  documents.set(doc.id, doc)
  logger.info('knowledge_document_added', {
    details: { id: doc.id, title: doc.title, sourceType: doc.sourceType },
  })
}

export async function getDocument(id: string): Promise<KnowledgeDocument | undefined> {
  return documents.get(id)
}

export async function updateDocument(id: string, updates: Partial<KnowledgeDocument>): Promise<void> {
  const existing = documents.get(id)
  if (!existing) throw new Error(`Document not found: ${id}`)
  documents.set(id, { ...existing, ...updates, updatedAt: new Date().toISOString() })
}

export async function deleteDocument(id: string): Promise<void> {
  documents.delete(id)
  const chunkIds = documentChunks.get(id) ?? []
  for (const cid of chunkIds) chunks.delete(cid)
  documentChunks.delete(id)
}

export async function addChunk(chunk: KnowledgeChunk): Promise<void> {
  chunks.set(chunk.id, chunk)
  const existing = documentChunks.get(chunk.documentId) ?? []
  existing.push(chunk.id)
  documentChunks.set(chunk.documentId, existing)
}

export async function addChunks(chunkList: KnowledgeChunk[]): Promise<void> {
  for (const chunk of chunkList) {
    await addChunk(chunk)
  }
}

export async function getChunk(id: string): Promise<KnowledgeChunk | undefined> {
  return chunks.get(id)
}

export async function getDocumentChunks(documentId: string): Promise<KnowledgeChunk[]> {
  const ids = documentChunks.get(documentId) ?? []
  return ids.map((id) => chunks.get(id)).filter(Boolean) as KnowledgeChunk[]
}

export function getAllDocuments(): KnowledgeDocument[] {
  return Array.from(documents.values())
}

export function getAllChunks(): Map<string, KnowledgeChunk> {
  return new Map(chunks)
}

export function getChunkCount(): number {
  return chunks.size
}

export function getDocumentCount(): number {
  return documents.size
}

export async function searchDocuments(query: string, sourceType?: SourceType): Promise<KnowledgeDocument[]> {
  const q = query.toLowerCase()
  return Array.from(documents.values()).filter((doc) => {
    if (sourceType && doc.sourceType !== sourceType) return false
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.content.toLowerCase().includes(q)
    )
  })
}

export async function clearKnowledgeBase(): Promise<void> {
  documents.clear()
  chunks.clear()
  documentChunks.clear()
}

export async function seedDefaultKnowledge(): Promise<void> {
  const docs: KnowledgeDocument[] = [
    {
      id: 'faq-001',
      title: 'How do I create an account?',
      sourceType: 'faq',
      content: 'Creating an account on ValClassifieds is free and easy. Click the "Sign Up" button in the top right corner, enter your email address, create a password, and fill in your basic profile information. You will receive a verification email to confirm your account. Once verified, you can start browsing and posting listings immediately.',
      metadata: { category: 'account', keywords: ['signup', 'registration', 'create account'] },
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'faq-002',
      title: 'How do I post a listing?',
      sourceType: 'faq',
      content: 'To post a listing, click the "Create Listing" button on the homepage or your dashboard. Fill in the required details including title, description, price, category, and location. You can upload up to 10 photos. Review your listing and click "Submit". Your listing will be live immediately and visible to all users.',
      metadata: { category: 'selling', keywords: ['post', 'create listing', 'sell'] },
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'faq-003',
      title: 'How do I edit or delete my listing?',
      sourceType: 'faq',
      content: 'Go to "My Listings" from your profile menu. Find the listing you want to edit and click the "Edit" button. You can modify the title, description, price, photos, and other details. To delete, click the "Delete" button and confirm. Deleted listings cannot be recovered.',
      metadata: { category: 'selling', keywords: ['edit listing', 'delete listing', 'modify'] },
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'faq-004',
      title: 'Is posting items free?',
      sourceType: 'faq',
      content: 'Yes, posting items on ValClassifieds is completely free. There are no listing fees, no subscription costs, and no hidden charges. You can post as many listings as you want at no cost. Premium featured listing options may be offered in the future.',
      metadata: { category: 'pricing', keywords: ['free', 'cost', 'pricing', 'fees'] },
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'faq-005',
      title: 'How do I contact a seller?',
      sourceType: 'faq',
      content: 'Each listing has a "Contact Seller" button. Click it to send a message to the seller through our internal messaging system. Your contact information is not shared with the seller unless you choose to provide it. Always communicate through the platform for your safety.',
      metadata: { category: 'buying', keywords: ['contact seller', 'message', 'inquire'] },
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'faq-006',
      title: 'What safety precautions should I take?',
      sourceType: 'faq',
      content: 'Always meet in a public place for transactions. Bring a friend if possible. Inspect items before paying. Use the platform messaging system rather than sharing personal contact information. Trust your instincts — if a deal seems too good to be true, it probably is. Report suspicious activity to our support team.',
      metadata: { category: 'safety', keywords: ['safety', 'secure', 'scam', 'meet'] },
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'policy-001',
      title: 'Prohibited Items Policy',
      sourceType: 'policy',
      content: 'The following items are prohibited on ValClassifieds: illegal drugs and paraphernalia, weapons and firearms, stolen goods, counterfeit items, hazardous materials, animals (except pet services), adult content, tobacco and alcohol, prescription medications, and any items that violate local, state, or federal laws. Listings found in violation will be removed immediately and accounts may be suspended.',
      metadata: { category: 'policies', keywords: ['prohibited', 'banned', 'illegal', 'restricted'] },
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'policy-002',
      title: 'User Conduct Policy',
      sourceType: 'policy',
      content: 'Users must treat others with respect. Harassment, hate speech, threats, or any form of discrimination will not be tolerated. Do not spam listings or messages. Do not create multiple accounts to evade policies. Do not attempt to complete transactions outside the platform. Violations may result in account suspension or permanent ban.',
      metadata: { category: 'policies', keywords: ['conduct', 'behavior', 'rules', 'harassment'] },
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'help-001',
      title: 'Getting Started Guide',
      sourceType: 'help_center',
      content: 'Welcome to ValClassifieds! This guide will help you get started. First, create your free account. Next, complete your profile with a photo and description. Browse listings by category or use the search bar. To post your first listing, click "Create Listing" and follow the prompts. Check your messages regularly to respond to interested buyers.',
      metadata: { category: 'onboarding', keywords: ['getting started', 'guide', 'new user'] },
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'help-002',
      title: 'Understanding Categories',
      sourceType: 'help_center',
      content: 'ValClassifieds organizes listings into categories to help you find what you are looking for. Major categories include Electronics, Furniture, Vehicles, Real Estate, Jobs, Services, Clothing, Books & Media, Sports & Outdoors, and Pets. Each category has subcategories for more specific filtering. You can browse by category from the homepage or use the search bar to find items across all categories.',
      metadata: { category: 'browsing', keywords: ['categories', 'browse', 'filter'] },
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]

  for (const doc of docs) {
    await addDocument(doc)
  }

  logger.info('knowledge_base_seeded', { details: { documentCount: docs.length } })
}
