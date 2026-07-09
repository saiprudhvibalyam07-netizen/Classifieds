import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerTool,
  unregisterTool,
  getRegisteredTools,
  executeToolCall,
  executeToolCalls,
} from '../toolRouter'

describe('toolRouter', () => {
  beforeEach(() => {
    const tools = getRegisteredTools()
    tools.forEach((t) => unregisterTool(t))
  })

  describe('registerTool', () => {
    it('registers a tool handler', () => {
      registerTool({
        name: 'test_tool',
        description: 'A test tool',
        execute: async () => ({ toolName: 'test_tool', success: true, data: 'done' }),
      })
      expect(getRegisteredTools()).toContain('test_tool')
    })
  })

  describe('unregisterTool', () => {
    it('removes a registered tool', () => {
      registerTool({
        name: 'temp_tool',
        description: 'Temporary',
        execute: async () => ({ toolName: 'temp_tool', success: true }),
      })
      expect(getRegisteredTools()).toContain('temp_tool')
      unregisterTool('temp_tool')
      expect(getRegisteredTools()).not.toContain('temp_tool')
    })
  })

  describe('executeToolCall', () => {
    it('returns error for unknown tool', async () => {
      const result = await executeToolCall('nonexistent', {}, 'visitor')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Unknown tool')
    })

    it('executes a registered tool successfully', async () => {
      registerTool({
        name: 'greet',
        description: 'Says hello',
        execute: async (params) => ({
          toolName: 'greet',
          success: true,
          data: `Hello, ${params.name ?? 'world'}!`,
        }),
      })
      const result = await executeToolCall('greet', { name: 'Alice' }, 'visitor')
      expect(result.success).toBe(true)
      expect(result.data).toBe('Hello, Alice!')
    })

    it('handles tool execution errors', async () => {
      registerTool({
        name: 'failing_tool',
        description: 'Always fails',
        execute: async () => { throw new Error('Something broke') },
      })
      const result = await executeToolCall('failing_tool', {}, 'visitor')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Something broke')
    })
  })

  describe('executeToolCalls', () => {
    it('executes multiple tool calls in parallel', async () => {
      registerTool({
        name: 'add',
        description: 'Adds numbers',
        execute: async (params) => ({
          toolName: 'add',
          success: true,
          data: (params.a as number) + (params.b as number),
        }),
      })
      const results = await executeToolCalls([
        { name: 'add', parameters: { a: 1, b: 2 } },
        { name: 'add', parameters: { a: 10, b: 20 } },
      ], 'visitor')
      expect(results).toHaveLength(2)
      expect(results[0].data).toBe(3)
      expect(results[1].data).toBe(30)
    })
  })
})
