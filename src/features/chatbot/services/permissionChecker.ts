import type { ChatbotRole, PermissionCheck } from '../types'

const MAX_MESSAGE_LENGTH = 4000

const TOOL_PERMISSIONS: Record<string, ChatbotRole[]> = {
  // Phase 2+ will register tool permissions here
}

export function checkToolPermission(toolName: string, role: ChatbotRole): PermissionCheck {
  const requiredRoles = TOOL_PERMISSIONS[toolName]

  if (!requiredRoles) {
    return {
      allowed: false,
      reason: `Unknown tool: ${toolName}. No tool is registered with that name.`,
      requiredRoles: [],
    }
  }

  if (requiredRoles.includes(role)) {
    return { allowed: true, requiredRoles }
  }

  return {
    allowed: false,
    reason: `Role '${role}' does not have permission to use '${toolName}'. Required roles: ${requiredRoles.join(', ')}`,
    requiredRoles,
  }
}

export function checkMessagePermission(content: string): PermissionCheck {
  if (!content.trim()) {
    return { allowed: false, reason: 'Message content is empty', requiredRoles: [] }
  }

  if (content.length > MAX_MESSAGE_LENGTH) {
    return {
      allowed: false,
      reason: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
      requiredRoles: [],
    }
  }

  return { allowed: true, requiredRoles: [] }
}
