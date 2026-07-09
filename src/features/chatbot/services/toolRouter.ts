import type { ChatbotRole } from '../types'
import { checkToolPermission } from './permissionChecker'
import { logger } from './logger'

interface ToolCallParams {
  name: string
  parameters: Record<string, unknown>
}

interface ToolCallResult {
  toolName: string
  success: boolean
  data?: unknown
  error?: string
}

interface ToolHandler {
  name: string
  description: string
  execute: (params: Record<string, unknown>, role: ChatbotRole) => Promise<ToolCallResult>
}

const handlers = new Map<string, ToolHandler>()

export function registerTool(handler: ToolHandler): void {
  handlers.set(handler.name, handler)
  logger.info('tool_registered', { details: { name: handler.name } })
}

export function unregisterTool(name: string): void {
  handlers.delete(name)
  logger.info('tool_unregistered', { details: { name } })
}

export function getRegisteredTools(): string[] {
  return Array.from(handlers.keys())
}

export async function executeToolCall(
  toolName: string,
  parameters: Record<string, unknown>,
  role: ChatbotRole
): Promise<ToolCallResult> {
  const handler = handlers.get(toolName)

  if (!handler) {
    logger.warn('tool_not_found', { details: { toolName } })
    return { toolName, success: false, error: `Unknown tool: ${toolName}` }
  }

  const permission = checkToolPermission(toolName, role)
  if (!permission.allowed && permission.requiredRoles.length > 0) {
    logger.warn('tool_permission_denied', { details: { toolName, role, reason: permission.reason } })
    return { toolName, success: false, error: permission.reason ?? 'Permission denied' }
  }

  try {
    logger.info('tool_execution_started', { details: { toolName } })
    const result = await handler.execute(parameters, role)
    logger.info('tool_execution_completed', { details: { toolName, success: result.success } })
    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tool execution failed'
    logger.error('tool_execution_failed', { details: { toolName, error: message } })
    return { toolName, success: false, error: message }
  }
}

export async function executeToolCalls(
  toolCalls: ToolCallParams[],
  role: ChatbotRole
): Promise<ToolCallResult[]> {
  return Promise.all(toolCalls.map((tc) => executeToolCall(tc.name, tc.parameters, role)))
}
