import { logger } from './logger'
import type { PromptVersion } from '../types'

export type PromptRegistryStats = {
  totalPrompts: number
  totalVersions: number
  activePrompts: number
  archivedPrompts: number
  recentVersions: number
}

export interface PromptSearchResult {
  id: string
  name: string
  version: number
  createdAt: string
  isActive: boolean
  summary?: string
}

class PromptVersionComparison {
  static compareVersions(version1: PromptVersion, version2: PromptVersion): {
    differences: Array<{ path: string; old: unknown; new: unknown }>
    similarity: number
    conflicting: boolean
  } {
    const json1 = JSON.stringify(version1, null, 2)
    const json2 = JSON.stringify(version2, null, 2)

    const obj1 = JSON.parse(json1)
    const obj2 = JSON.parse(json2)

    const differences: Array<{ path: string; old: unknown; new: unknown }> = []

    const compare = (path: string, a: unknown, b: unknown) => {
      if (a === b) return

      if (typeof a !== typeof b) {
        differences.push({ path, old: a, new: b })
        return
      }

      if (typeof a === 'object' && a !== null && b !== null) {
        const keys = new Set([...Object.keys(a as Record<string, unknown>), ...Object.keys(b as Record<string, unknown>)])
        keys.forEach(key => {
          compare(`${path}.${key}`, (a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
        })
      } else {
        differences.push({ path, old: a, new: b })
      }
    }

    Object.keys(obj1).forEach(key => {
      if (!(key in obj2)) {
        compare(key, obj1[key], 'REMOVED')
      } else {
        compare(key, obj1[key], obj2[key])
      }
    })

    Object.keys(obj2).forEach(key => {
      if (!(key in obj1)) {
        compare(key, 'ADDED', obj2[key])
      }
    })

    const totalProperties = Object.keys(obj1).length + Object.keys(obj2).length
    const similarity = totalProperties > 0 ? (Object.keys(obj1).length + Object.keys(obj2).length - differences.length) / totalProperties : 1

    const conflicting = differences.some(d =>
      d.path.includes('content') || d.path.includes('instructions') ||
      d.path.includes('behavior') || d.path.includes('format'),
    )

    return { differences, similarity, conflicting }
  }
}

export class PromptRegistry {
  private static instance: PromptRegistry
  private prompts: Map<string, PromptVersion[]> = new Map()
  private activePrompts: Map<string, PromptVersion> = new Map()
  private versionHistory: Map<string, number[]> = new Map()

  private constructor() {}

  static getInstance(): PromptRegistry {
    if (!PromptRegistry.instance) {
      PromptRegistry.instance = new PromptRegistry()
    }
    return PromptRegistry.instance
  }

  registerPrompt(prompt: PromptVersion): PromptVersion {
    const existingPrompts = this.prompts.get(prompt.id) || []
    const existingVersion = existingPrompts.find(p => p.version === prompt.version)

    if (existingVersion) {
      logger.warn('prompt_version_already_exists', {
        details: { promptId: prompt.id, version: prompt.version },
      })
      return existingVersion
    }

    existingPrompts.push(prompt)
    this.prompts.set(prompt.id, existingPrompts)

    if (prompt.isActive) {
      this.activePrompts.set(prompt.id, prompt)
    }

    this.versionHistory.set(prompt.id, [...(this.versionHistory.get(prompt.id) || []), prompt.version])

    logger.info('prompt_registered', {
      details: { promptId: prompt.id, version: prompt.version, name: prompt.name, isActive: prompt.isActive },
    })

    return prompt
  }

  promotePrompt(promptId: string, targetStage?: PromptVersion['stage']): PromptVersion {
    const existingPrompts = this.prompts.get(promptId)
    if (!existingPrompts?.length) {
      throw new Error(`Prompt not found: ${promptId}`)
    }

    const nextVersion = Math.max(...existingPrompts.map(p => p.version)) + 1

    const newPrompt: PromptVersion = {
      ...existingPrompts[existingPrompts.length - 1],
      id: promptId,
      version: nextVersion,
      stage: targetStage,
      updatedAt: new Date().toISOString(),
      isActive: true,
    }

    existingPrompts.push(newPrompt)
    this.prompts.set(promptId, existingPrompts)
    this.activePrompts.set(promptId, newPrompt)

    this.versionHistory.set(promptId, [...(this.versionHistory.get(promptId) || []), nextVersion])

    logger.info('prompt_promoted', {
      details: { promptId, oldVersion: existingPrompts[existingPrompts.length - 2]?.version, newVersion: nextVersion },
    })

    return newPrompt
  }

  rollbackPrompt(promptId: string, targetVersion: number, rolledBackBy: string, reason?: string): boolean {
    const existingPrompts = this.prompts.get(promptId)
    if (!existingPrompts?.length) {
      logger.warn('prompt_not_found', {
        details: { promptId },
      })
      return false
    }

    const targetPrompt = existingPrompts.find(p => p.version === targetVersion)
    if (!targetPrompt) {
      logger.warn('prompt_version_not_found', {
        details: { promptId, targetVersion, availableVersions: existingPrompts.map(p => p.version) },
      })
      return false
    }

    this.activePrompts.set(promptId, targetPrompt)

    logger.info('prompt_rolled_back', {
      details: { promptId, targetVersion, rolledBackBy, reason },
    })

    return true
  }

  getActivePrompt(promptId: string): PromptVersion | undefined {
    return this.activePrompts.get(promptId)
  }

  getPromptHistory(promptId: string): PromptVersion[] {
    return this.prompts.get(promptId) || []
  }

  getAllPrompts(): Map<string, PromptVersion> {
    return new Map(this.activePrompts)
  }

  getStats(): PromptRegistryStats {
    const totalPrompts = this.prompts.size
    const totalVersions = Array.from(this.prompts.values()).reduce((sum, prompts) => sum + prompts.length, 0)
    const activePrompts = this.activePrompts.size
    const archivedPrompts = totalPrompts - activePrompts

    const recentVersions = Array.from(this.prompts.values())
      .filter(prompts => prompts.length > 0)
      .reduce((sum, prompts) => sum + Math.min(prompts.length, 5), 0)

    return {
      totalPrompts,
      totalVersions,
      activePrompts,
      archivedPrompts,
      recentVersions,
    }
  }

  searchPrompts(query: string): PromptSearchResult[] {
    const results: PromptSearchResult[] = []

    this.prompts.forEach((_prompts, id) => {
      const activePrompt = this.activePrompts.get(id)
      if (!activePrompt) return

      if (activePrompt.name.toLowerCase().includes(query.toLowerCase()) ||
          (activePrompt.description || '').toLowerCase().includes(query.toLowerCase()) ||
          (activePrompt.content || '').toLowerCase().includes(query.toLowerCase())) {
        results.push({
          id,
          name: activePrompt.name,
          version: activePrompt.version,
          createdAt: activePrompt.createdAt,
          isActive: activePrompt.isActive,
          summary: activePrompt.description || undefined,
        })
      }
    })

    return results
  }

  compareVersions(promptId: string, version1: number, version2: number): {
    comparison: ReturnType<typeof PromptVersionComparison.compareVersions>
    prompt1?: PromptVersion
    prompt2?: PromptVersion
  } {
    const existingPrompts = this.prompts.get(promptId)
    if (!existingPrompts?.length) {
      return { comparison: { differences: [], similarity: 0, conflicting: false } }
    }

    const prompt1 = existingPrompts.find(p => p.version === version1)
    const prompt2 = existingPrompts.find(p => p.version === version2)

    if (!prompt1 || !prompt2) {
      return {
        comparison: { differences: [], similarity: 0, conflicting: false },
        prompt1,
        prompt2,
      }
    }

    const comparison = PromptVersionComparison.compareVersions(prompt1, prompt2)

    logger.info('prompt_versions_compared', {
      details: { promptId, version1, version2, similarity: comparison.similarity, conflicting: comparison.conflicting, differenceCount: comparison.differences.length },
    })

    return { comparison, prompt1, prompt2 }
  }

  getVersionHistory(promptId: string): number[] {
    return this.versionHistory.get(promptId) || []
  }

  archivePrompt(promptId: string): boolean {
    const prompt = this.activePrompts.get(promptId)
    if (!prompt) {
      logger.warn('active_prompt_not_found', {
        details: { promptId },
      })
      return false
    }

    prompt.isActive = false
    this.activePrompts.delete(promptId)

    logger.info('prompt_archived', {
      details: { promptId, version: prompt.version, name: prompt.name },
    })

    return true
  }

  dispose(): void {
    this.prompts.clear()
    this.activePrompts.clear()
    this.versionHistory.clear()
  }
}
