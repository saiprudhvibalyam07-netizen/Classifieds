export const SESSION_STORAGE_KEY = 'chatbot_session_id'
export const CONVERSATION_STORAGE_KEY = 'chatbot_active_conversation'

export const MOCK_RESPONSES: Record<string, string> = {
  visitor: 'Welcome to ValClassifieds. How can I help you today?',
  buyer: 'I can help you search listings and answer marketplace questions.',
  seller: 'I can help you improve and manage your listings.',
  admin: 'I can assist with administration and moderation tasks.',
}

export const STARTER_PROMPTS = {
  visitor: [
    'What is ValClassifieds?',
    'Browse categories',
    'How do I buy something?',
    'Search listings',
  ],
  buyer: [
    'Find phones under 20000',
    'How to buy safely?',
    'Popular categories',
    'Contact seller help',
  ],
  seller: [
    'How to post a listing?',
    'Pricing suggestions',
    'Photo tips',
    'Promote my listing',
  ],
  admin: [
    'Show active conversations',
    'Recent feedback',
    'System health',
    'Pending escalations',
  ],
}
