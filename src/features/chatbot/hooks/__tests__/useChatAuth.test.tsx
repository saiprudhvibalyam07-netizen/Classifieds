import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useChatAuth } from '../useChatAuth'
import { SESSION_STORAGE_KEY } from '../../constants'

// Mock the auth hook
vi.mock('../../../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../../../../hooks/useAuth'
import { Mock } from 'vitest'

describe('useChatAuth', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns visitor role when no user is logged in', () => {
    (useAuth as Mock).mockReturnValue({
      user: null,
      profile: null,
      loading: false,
    })
    const { result } = renderHook(() => useChatAuth())
    expect(result.current.role).toBe('visitor')
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.userId).toBeNull()
  })

  it('creates a session ID for visitors', () => {
    (useAuth as Mock).mockReturnValue({
      user: null,
      profile: null,
      loading: false,
    })
    const { result } = renderHook(() => useChatAuth())
    expect(result.current.sessionId).toBeTruthy()
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBe(result.current.sessionId)
  })

  it('returns buyer role for buyer profile', () => {
    (useAuth as Mock).mockReturnValue({
      user: { id: 'user-1' },
      profile: { role: 'buyer' },
      loading: false,
    })
    const { result } = renderHook(() => useChatAuth())
    expect(result.current.role).toBe('buyer')
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.userId).toBe('user-1')
  })

  it('returns seller role for seller profile', () => {
    (useAuth as Mock).mockReturnValue({
      user: { id: 'user-2' },
      profile: { role: 'seller' },
      loading: false,
    })
    const { result } = renderHook(() => useChatAuth())
    expect(result.current.role).toBe('seller')
  })

  it('returns admin role for admin profile', () => {
    (useAuth as Mock).mockReturnValue({
      user: { id: 'user-3' },
      profile: { role: 'admin' },
      loading: false,
    })
    const { result } = renderHook(() => useChatAuth())
    expect(result.current.role).toBe('admin')
  })
})
