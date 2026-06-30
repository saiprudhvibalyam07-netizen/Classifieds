import { describe, it, expect, beforeEach } from 'vitest'
import { enqueueAction, getQueuedActions, removeQueuedAction, clearQueue, getQueueSize } from '../utils/offlineQueue'

beforeEach(async () => {
  await clearQueue()
})

describe('offlineQueue', () => {
  it('enqueues and retrieves items', async () => {
    await enqueueAction('send_message', { text: 'hello' })
    await enqueueAction('edit_message', { id: 'msg1', message: 'edited' })

    const items = await getQueuedActions()
    expect(items).toHaveLength(2)
    expect(items[0].type).toBe('send_message')
    expect(items[0].payload.text).toBe('hello')
  })

  it('removes an item from the queue', async () => {
    await enqueueAction('send_message', { text: 'test' })
    const items = await getQueuedActions()
    await removeQueuedAction(items[0].id)

    const remaining = await getQueuedActions()
    expect(remaining).toHaveLength(0)
  })

  it('reports correct queue size', async () => {
    expect(await getQueueSize()).toBe(0)
    await enqueueAction('delete_message', { id: 'm1' })
    expect(await getQueueSize()).toBe(1)
  })

  it('clears the entire queue', async () => {
    await enqueueAction('mark_read', { conversationId: 'c1', userId: 'u1' })
    await clearQueue()
    expect(await getQueueSize()).toBe(0)
  })
})
