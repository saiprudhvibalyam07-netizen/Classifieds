import { useCallback, useEffect, useRef, useState } from 'react'
import type { SupportMessage, SupportWidgetProps } from '../types'
import { FloatingButton } from './FloatingButton'
import { ChatWindow } from './ChatWindow'
import { customerSupportService, CustomerSupportError } from '../services/CustomerSupportService'

const DEFAULT_WELCOME =
  'Hi! 👋 Welcome to ValClassifieds Support. Ask us anything about buying, selling, or your account and we’ll help you out.'

export function SupportWidget({
  title = 'ValClassifieds Support',
  subtitle,
  online = true,
  welcomeMessage = DEFAULT_WELCOME,
  initialMessages = [],
  inputPlaceholder = 'Type your message…',
  typing = false,
  onSendMessage,
}: SupportWidgetProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<SupportMessage[]>(initialMessages)
  const [isTyping, setIsTyping] = useState(false)
  const requestSeq = useRef(0)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const handleSend = useCallback(
    async (text: string) => {
      const seq = ++requestSeq.current
      const userMessage: SupportMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: Date.now(),
        status: 'sent',
      }
      setMessages((prev) => [...prev, userMessage])
      onSendMessage?.(text)

      setIsTyping(true)
      try {
        const reply = await customerSupportService.sendMessage(text)
        if (seq !== requestSeq.current) return
        setMessages((prev) => [
          ...prev,
          {
            id: `s-${Date.now()}`,
            role: 'support',
            content: reply,
            timestamp: Date.now(),
            status: 'sent',
          },
        ])
      } catch (error) {
        if (seq !== requestSeq.current) return
        const fallback =
          error instanceof CustomerSupportError
            ? error.message
            : 'Sorry, something went wrong. Please try again later.'
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: 'support',
            content: fallback,
            timestamp: Date.now(),
            status: 'error',
          },
        ])
      } finally {
        if (seq === requestSeq.current) setIsTyping(false)
      }
    },
    [onSendMessage],
  )

  const handleClear = useCallback(() => {
    requestSeq.current++
    setMessages([])
    setIsTyping(false)
  }, [])

  return (
    <>
      <FloatingButton isOpen={open} online={online} onClick={() => setOpen((o) => !o)} />
      <ChatWindow
        open={open}
        title={title}
        subtitle={subtitle}
        online={online}
        welcomeMessage={welcomeMessage}
        messages={messages}
        typing={typing || isTyping}
        inputPlaceholder={inputPlaceholder}
        onClose={() => setOpen(false)}
        onClear={handleClear}
        onSend={handleSend}
      />
    </>
  )
}
