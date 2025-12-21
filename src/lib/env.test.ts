import { describe, expect, it, vi } from 'vitest'

describe('env', () => {
  it('should export env object when variables are set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PROJECT_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-key')
    vi.stubEnv('SUPABASE_SECRET_SERVICE_ROLE_KEY', 'test-secret')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:5001')

    // Import dynamically to ensure env variables are set before parsing
    const { env } = await import('./env')

    expect(env).toBeDefined()
    expect(env.NEXT_PUBLIC_SUPABASE_PROJECT_URL).toBe('https://example.supabase.co')
  })
})
