import { vi } from 'vitest'

vi.mock('../../../lib/supabase', () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn(),
  }

  const mockChain = {
    ...mockQuery,
    from: vi.fn().mockReturnValue(mockQuery),
    rpc: vi.fn().mockReturnThis(),
  }

  return {
    supabase: mockChain,
  }
})
