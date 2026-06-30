import { describe, it, expect, vi } from 'vitest'
import { eventBus, ChatEvents } from '../../../lib/eventBus'

describe('eventBus', () => {
  it('dispatches and receives events', () => {
    const handler = vi.fn()
    const off = eventBus.on(ChatEvents.MessageSent, handler)

    eventBus.emit(ChatEvents.MessageSent, { id: 'msg1' })
    expect(handler).toHaveBeenCalledWith({ id: 'msg1' })

    off()
    eventBus.emit(ChatEvents.MessageSent, { id: 'msg2' })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('supports multiple listeners', () => {
    const a = vi.fn()
    const b = vi.fn()

    eventBus.on(ChatEvents.ToastShown, a)
    eventBus.on(ChatEvents.ToastShown, b)
    eventBus.emit(ChatEvents.ToastShown, { message: 'hi', type: 'info' })

    expect(a).toHaveBeenCalled()
    expect(b).toHaveBeenCalled()

    eventBus.clear()
  })

  it('clears all handlers', () => {
    const handler = vi.fn()
    eventBus.on('test-event', handler)
    eventBus.clear()
    eventBus.emit('test-event', 42)

    expect(handler).not.toHaveBeenCalled()
  })
})
