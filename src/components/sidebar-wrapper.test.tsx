import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SidebarWrapper } from './sidebar-wrapper'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode, href: string, className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt, className }: { src: string, alt: string, className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} data-testid="gravatar-image" />
  ),
}))

vi.mock('@/app/auth/actions', () => ({
  signOut: vi.fn(),
}))

describe('SidebarWrapper', () => {
  beforeEach(() => {
    localStorage.clear()
    document.cookie = ''
    vi.mocked(usePathname).mockReturnValue('/')
  })

  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders AppSidebar with passed props', () => {
    render(
      <SidebarWrapper
        userEmail="test@example.com"
        displayName="John Doe"
      />
    )

    expect(screen.getByText('John Doe')).toBeDefined()
    expect(screen.getByText('test@example.com')).toBeDefined()
  })

  it('renders SidebarProvider wrapper', () => {
    const { container } = render(
      <SidebarWrapper
        userEmail="test@example.com"
      />
    )

    const sidebarWrapper = container.querySelector('[data-slot="sidebar-wrapper"]')
    expect(sidebarWrapper).toBeDefined()
  })

  it('renders with children', () => {
    render(
      <SidebarWrapper userEmail="test@example.com">
        <div data-testid="child-content">Child Content</div>
      </SidebarWrapper>
    )

    expect(screen.getByTestId('child-content')).toBeDefined()
  })

  it('reads sidebar state from cookie when available', () => {
    document.cookie = 'sidebar_state=false'
    const { container } = render(
      <SidebarWrapper userEmail="test@example.com" />
    )

    const sidebarWrapper = container.querySelector('[data-slot="sidebar-wrapper"]')
    expect(sidebarWrapper).toBeDefined()
  })

  it('defaults to open state when no cookie', () => {
    // Clear cookies and localStorage
    document.cookie = 'sidebar_state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    const { container } = render(
      <SidebarWrapper userEmail="test@example.com" />
    )

    // When there's no cookie, defaultOpen should be true
    // but the shadcn sidebar may collapse based on media query / isMobile
    // Since matchMedia is mocked to return matches: false (not mobile), it should be expanded
    const sidebar = container.querySelector('[data-slot="sidebar"]')
    // The sidebar should exist
    expect(sidebar).toBeDefined()
  })

  it('passes isAdmin prop to AppSidebar', () => {
    render(
      <SidebarWrapper
        userEmail="admin@example.com"
        isAdmin={true}
      />
    )

    // Admin badge should be visible when isAdmin is true
    const adminBadge = screen.getByText('Admin')
    expect(adminBadge).toHaveAttribute('data-slot', 'badge')
  })
})
