import { createContext, useContext, useReducer, useCallback, useRef, useEffect, type ReactNode } from 'react'
import type { ChatState, ChatAction, ChatbotConversation, ChatbotMessage, ChatbotRole } from '../types'
import { conversationManager } from '../services/conversationManager'
import { getConversationProvider } from '../services/provider'
import { useChatAuth } from '../hooks/useChatAuth'

interface ChatContextValue extends ChatState {
  toggleChat: () => void
  openChat: () => void
  closeChat: () => void
  sendMessage: (content: string) => Promise<void>
  startNewConversation: (role: ChatbotRole) => Promise<void>
  restoreConversation: (conversation: ChatbotConversation, messages: ChatbotMessage[]) => void
  retryMessage: (messageId: string) => Promise<void>
  resetChat: () => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

  const initialState: ChatState = {
  isOpen: false,
  conversation: null,
  messages: [],
  isTyping: false,
  streamingMessageId: null,
  error: null,
  offline: false,
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'TOGGLE_OPEN':
      return { ...state, isOpen: !state.isOpen }
    case 'SET_OPEN':
      return { ...state, isOpen: action.payload }
    case 'SET_CONVERSATION':
      return { ...state, conversation: action.payload }
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload }
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] }
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.payload.id ? { ...m, ...action.payload.updates } : m
        ),
      }
    case 'SET_TYPING':
      return { ...state, isTyping: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_OFFLINE':
      return { ...state, offline: action.payload }
    case 'RESET':
      return { ...initialState, isOpen: state.isOpen }
    case 'START_STREAM': {
      const newMessage: ChatbotMessage = {
        id: action.payload.messageId,
        conversationId: action.payload.conversationId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        status: 'streaming',
      }
      return {
        ...state,
        messages: [...state.messages, newMessage],
        streamingMessageId: action.payload.messageId,
        isTyping: false,
      }
    }
    case 'STREAM_TOKEN': {
      if (state.streamingMessageId !== action.payload.messageId) return state
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.payload.messageId
            ? { ...m, content: m.content + action.payload.token }
            : m
        ),
      }
    }
    case 'END_STREAM': {
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.payload.messageId
            ? { ...m, status: 'sent' }
            : m
        ),
        streamingMessageId: null,
      }
    }
    case 'STREAM_ERROR': {
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.payload.messageId
            ? { ...m, status: 'failed', content: m.content || action.payload.error }
            : m
        ),
        streamingMessageId: null,
        error: action.payload.error,
      }
    }
    default:
      return state
  }
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState)
  const abortRef = useRef(false)
  const { userId: currentUserId } = useChatAuth()
  const userIdRef = useRef(currentUserId)
  userIdRef.current = currentUserId

  // On unmount (which happens on every identity switch because the provider is
  // keyed by user id) wipe all client-side chatbot caches so they cannot leak
  // into the next account's session. We pass the ending identity so a guest's
  // own refresh keeps its session id (to restore the conversation) while an
  // authenticated user's teardown clears it. NOTE: closing the widget only
  // toggles `isOpen` and does NOT unmount this provider, so this never fires on
  // a plain close/reopen.
  useEffect(() => {
    return () => {
      conversationManager.resetSession(userIdRef.current)
    }
  }, [])

  const toggleChat = useCallback(() => dispatch({ type: 'TOGGLE_OPEN' }), [])
  const openChat = useCallback(() => dispatch({ type: 'SET_OPEN', payload: true }), [])
  const closeChat = useCallback(() => dispatch({ type: 'SET_OPEN', payload: false }), [])

  const startNewConversation = useCallback(async (role: ChatbotRole) => {
    dispatch({ type: 'SET_ERROR', payload: null })
    try {
      const conv = await conversationManager.createConversation(null, role)
      if (conv) {
        dispatch({ type: 'SET_CONVERSATION', payload: conv })
        dispatch({ type: 'SET_MESSAGES', payload: [] })
        const ephemeral = (conv.metadata as Record<string, unknown> | undefined)?.ephemeral === true
        dispatch({ type: 'SET_OFFLINE', payload: ephemeral })
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'Unable to start the conversation. Please try again.' })
      }
    } catch (err) {
      console.error('startNewConversation failed:', err)
      dispatch({ type: 'SET_ERROR', payload: 'Unable to start the conversation. Please try again.' })
    }
  }, [])

  // Reuse an existing, already-loaded conversation (e.g. when the same user
  // reopens the widget or after a page refresh restores their history).
  // Unlike startNewConversation this never creates a new row or clears messages.
  const restoreConversation = useCallback(
    (conversation: ChatbotConversation, messages: ChatbotMessage[]) => {
      dispatch({ type: 'SET_ERROR', payload: null })
      dispatch({ type: 'SET_CONVERSATION', payload: conversation })
      dispatch({ type: 'SET_MESSAGES', payload: messages })
      const ephemeral = (conversation.metadata as Record<string, unknown> | undefined)?.ephemeral === true
      dispatch({ type: 'SET_OFFLINE', payload: ephemeral })
    },
    []
  )

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !state.conversation) return

    dispatch({ type: 'SET_ERROR', payload: null })
    abortRef.current = false

    const userTempId = crypto.randomUUID()
    const userMessage: ChatbotMessage = {
      id: userTempId,
      conversationId: state.conversation.id,
      role: 'user',
      content: content.trim(),
      createdAt: new Date().toISOString(),
      status: 'sending',
    }

    dispatch({ type: 'ADD_MESSAGE', payload: userMessage })

    const savedUser = await conversationManager.saveMessage(
      state.conversation.id,
      'user',
      content.trim()
    )

    if (savedUser) {
      dispatch({ type: 'UPDATE_MESSAGE', payload: { id: userTempId, updates: { id: savedUser.id, status: 'sent' } } })
    }

    dispatch({ type: 'SET_TYPING', payload: true })

    const assistantTempId = crypto.randomUUID()
    let streamStarted = false

    try {
      const provider = getConversationProvider()

      const response = await provider.sendMessage(content.trim(), state.conversation.role, {
        onToken: (token: string) => {
          if (abortRef.current) return
          if (!streamStarted) {
            streamStarted = true
            dispatch({
              type: 'START_STREAM',
              payload: { messageId: assistantTempId, conversationId: state.conversation!.id },
            })
          }
          dispatch({ type: 'STREAM_TOKEN', payload: { messageId: assistantTempId, token } })
        },
        signal: undefined,
        messages: state.messages,
      })

      if (abortRef.current) return

      if (!streamStarted) {
        dispatch({
          type: 'START_STREAM',
          payload: { messageId: assistantTempId, conversationId: state.conversation.id },
        })
        dispatch({ type: 'STREAM_TOKEN', payload: { messageId: assistantTempId, token: response.content } })
      }

      dispatch({ type: 'END_STREAM', payload: { messageId: assistantTempId } })

      const savedAssistant = await conversationManager.saveMessage(
        state.conversation.id,
        'assistant',
        response.content
      )

      if (savedAssistant) {
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: { id: assistantTempId, updates: { id: savedAssistant.id } },
        })
      }
    } catch (err) {
      if (abortRef.current) return
      dispatch({
        type: 'STREAM_ERROR',
        payload: { messageId: assistantTempId, error: 'Failed to send message. Please try again.' },
      })
    }
  }, [state.conversation, state.messages])

  const retryMessage = useCallback(async (messageId: string) => {
    const failedMessage = state.messages.find((m) => m.id === messageId)
    if (!failedMessage || failedMessage.role !== 'user') return
    await sendMessage(failedMessage.content)
  }, [state.messages, sendMessage])

  const resetChat = useCallback(() => {
    abortRef.current = true
    dispatch({ type: 'RESET' })
  }, [])

  return (
    <ChatContext.Provider
      value={{
        ...state,
        toggleChat,
        openChat,
        closeChat,
        sendMessage,
        startNewConversation,
        restoreConversation,
        retryMessage,
        resetChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return context
}
