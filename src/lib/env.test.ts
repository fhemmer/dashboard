import { describe, expect, it, vi } from 'vitest'

describe('env', () => {
  it('should export env object when client variables are set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PROJECT_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-key')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:5001')

    // Import dynamically to ensure env variables are set before parsing
    const { env } = await import('./env')

    expect(env).toBeDefined()
    expect(env.NEXT_PUBLIC_SUPABASE_PROJECT_URL).toBe('https://example.supabase.co')
  })

  it('should export getServerEnv function for server-only variables', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PROJECT_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-key')
    vi.stubEnv('SUPABASE_SECRET_SERVICE_ROLE_KEY', 'test-secret')

    const { getServerEnv } = await import('./env')

    const serverEnv = getServerEnv()
    expect(serverEnv).toBeDefined()
    expect(serverEnv.SUPABASE_SECRET_SERVICE_ROLE_KEY).toBe('test-secret')
  })

  it('should cache getServerEnv result on subsequent calls', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PROJECT_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-key')
    vi.stubEnv('SUPABASE_SECRET_SERVICE_ROLE_KEY', 'test-secret')

    const { getServerEnv } = await import('./env')

    const firstCall = getServerEnv()
    const secondCall = getServerEnv()

    // Should return the same cached instance
    expect(firstCall).toBe(secondCall)
  })
})
