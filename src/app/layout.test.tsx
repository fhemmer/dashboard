import { createClient } from '@/lib/supabase/server'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import RootLayout from './layout'

vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: 'geist-sans' }),
  Geist_Mono: () => ({ variable: 'geist-mono' }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { email: 'test@example.com' } }, error: null }),
    },
  })),
}))

vi.mock('@/components/app-sidebar', () => ({
  AppSidebar: () => <div data-testid="sidebar">Sidebar</div>,
}))

vi.mock('@/components/header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}))

describe('RootLayout', () => {
  it('renders correctly with children when logged in', async () => {
    const Layout = await RootLayout({ children: <div data-testid="child">Child Content</div> })
    render(Layout)
    expect(screen.getByTestId('sidebar')).toBeDefined()
    expect(screen.getByTestId('header')).toBeDefined()
    expect(screen.getByTestId('child')).toBeDefined()
  })

  it('renders only children when logged out', async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const Layout = await RootLayout({ children: <div data-testid="child">Child Content</div> })
    render(Layout)
    expect(screen.queryByTestId('sidebar')).toBeNull()
    expect(screen.queryByTestId('header')).toBeNull()
    expect(screen.getByTestId('child')).toBeDefined()
  })
})
