import { describe, expect, it } from 'vitest'
import { env, getServerEnv } from './env'

describe('env', () => {
  it('should export env object with client variables', () => {
    expect(env).toBeDefined()
    expect(env.NEXT_PUBLIC_SUPABASE_PROJECT_URL).toBeDefined()
    expect(typeof env.NEXT_PUBLIC_SUPABASE_PROJECT_URL).toBe('string')
    expect(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBeDefined()
    expect(typeof env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe('string')
  })

  it('should export getServerEnv function for server-only variables', () => {
    const serverEnv = getServerEnv()
    expect(serverEnv).toBeDefined()
    expect(serverEnv.SUPABASE_SECRET_SERVICE_ROLE_KEY).toBeDefined()
    expect(typeof serverEnv.SUPABASE_SECRET_SERVICE_ROLE_KEY).toBe('string')
  })
})
