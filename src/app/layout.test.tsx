import { createClient } from '@/lib/supabase/server'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RootLayout from './layout'

vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: 'geist-sans' }),
  Geist_Mono: () => ({ variable: 'geist-mono' }),
  Inter: () => ({ variable: 'inter' }),
  Roboto: () => ({ variable: 'roboto' }),
  Nunito: () => ({ variable: 'nunito' }),
  Open_Sans: () => ({ variable: 'open-sans' }),
  Lato: () => ({ variable: 'lato' }),
}))

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123', email: 'test@example.com' } }, error: null }),
    },
    from: mockFrom,
  })),
}))

vi.mock('@/components/sidebar-wrapper', () => ({
  SidebarWrapper: ({ displayName, serverSidebarWidth }: { displayName?: string; serverSidebarWidth?: number | null }) => (
    <div data-testid="sidebar" data-display-name={displayName || ''} data-sidebar-width={serverSidebarWidth ?? ''}>Sidebar</div>
  ),
}))

vi.mock('@/components/header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}))

describe('RootLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ single: mockSingle })
    mockSingle.mockResolvedValue({ data: { display_name: 'Test User', sidebar_width: 256 } })
  })

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
      from: mockFrom,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const Layout = await RootLayout({ children: <div data-testid="child">Child Content</div> })
    render(Layout)
    expect(screen.queryByTestId('sidebar')).toBeNull()
    expect(screen.queryByTestId('header')).toBeNull()
    expect(screen.getByTestId('child')).toBeDefined()
  })

  it('fetches and passes displayName to AppSidebar', async () => {
    mockSingle.mockResolvedValue({ data: { display_name: 'John Doe', sidebar_width: 256 } })

    const Layout = await RootLayout({ children: <div data-testid="child">Child Content</div> })
    render(Layout)

    const sidebar = screen.getByTestId('sidebar')
    expect(sidebar.getAttribute('data-display-name')).toBe('John Doe')
  })

  it('passes undefined displayName when profile has no display_name', async () => {
    mockSingle.mockResolvedValue({ data: { display_name: null, sidebar_width: null } })

    const Layout = await RootLayout({ children: <div data-testid="child">Child Content</div> })
    render(Layout)

    const sidebar = screen.getByTestId('sidebar')
    expect(sidebar.getAttribute('data-display-name')).toBe('')
  })

  it('passes sidebar width to SidebarWrapper', async () => {
    mockSingle.mockResolvedValue({ data: { display_name: 'Test User', sidebar_width: 320 } })

    const Layout = await RootLayout({ children: <div data-testid="child">Child Content</div> })
    render(Layout)

    const sidebar = screen.getByTestId('sidebar')
    expect(sidebar.getAttribute('data-sidebar-width')).toBe('320')
  })
})
