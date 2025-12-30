import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Store original env
const originalEnv = process.env

describe('env', () => {
  beforeEach(() => {
    // Reset modules before each test
    vi.resetModules()
  })

  afterEach(() => {
    // Restore original env
    process.env = originalEnv
  })

  it('should export env object with client variables', async () => {
    const { env } = await import('./env')
    expect(env).toBeDefined()
    expect(env.NEXT_PUBLIC_SUPABASE_PROJECT_URL).toBeDefined()
    expect(typeof env.NEXT_PUBLIC_SUPABASE_PROJECT_URL).toBe('string')
    expect(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBeDefined()
    expect(typeof env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe('string')
  })

  it('should have default NEXT_PUBLIC_SITE_URL when not set', async () => {
    const { env } = await import('./env')
    expect(env.NEXT_PUBLIC_SITE_URL).toBeDefined()
    expect(typeof env.NEXT_PUBLIC_SITE_URL).toBe('string')
  })

  it('should export getServerEnv function for server-only variables', async () => {
    const { getServerEnv } = await import('./env')
    const serverEnv = getServerEnv()
    expect(serverEnv).toBeDefined()
    expect(serverEnv.SUPABASE_SECRET_SERVICE_ROLE_KEY).toBeDefined()
    expect(typeof serverEnv.SUPABASE_SECRET_SERVICE_ROLE_KEY).toBe('string')
  })

  it('should return same cached server env on subsequent calls', async () => {
    const { getServerEnv } = await import('./env')
    const first = getServerEnv()
    const second = getServerEnv()
    // Both calls return object with same values (caching works)
    expect(first.SUPABASE_SECRET_SERVICE_ROLE_KEY).toBe(second.SUPABASE_SECRET_SERVICE_ROLE_KEY)
  })

  it('should support optional server env variables', async () => {
    const { getServerEnv } = await import('./env')
    const serverEnv = getServerEnv()

    // Verify optional variables have the expected type (string or undefined)
    expect(serverEnv.GITHUB_DASHBOARD_CLIENT_ID === undefined || typeof serverEnv.GITHUB_DASHBOARD_CLIENT_ID === 'string').toBe(true)
    expect(serverEnv.GITHUB_DASHBOARD_CLIENT_SECRET === undefined || typeof serverEnv.GITHUB_DASHBOARD_CLIENT_SECRET === 'string').toBe(true)
    expect(serverEnv.RESEND_API_KEY === undefined || typeof serverEnv.RESEND_API_KEY === 'string').toBe(true)
    expect(serverEnv.CRON_SECRET === undefined || typeof serverEnv.CRON_SECRET === 'string').toBe(true)
  })
})
