import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Supabase or other globals if needed
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    })),
  },
}))
