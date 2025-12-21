import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { describe, expect, it, vi } from 'vitest'
import { AppSidebar } from './app-sidebar'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode, href: string, className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

vi.mock('@/app/auth/actions', () => ({
  signOut: vi.fn(),
}))

describe('AppSidebar', () => {
  it('renders correctly', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<AppSidebar userEmail="test@example.com" />)
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    expect(screen.getByText('Pro Plan')).toBeDefined()
    expect(screen.getByText('test@example.com')).toBeDefined()
  })

  it('highlights active link', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<AppSidebar userEmail="test@example.com" />)
    const dashboardLink = screen.getAllByText('Dashboard').find(el => el.tagName === 'A') || screen.getByRole('link', { name: /dashboard/i })
    expect(dashboardLink).toHaveClass('bg-primary')
  })

  it('renders default values when userEmail is undefined', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<AppSidebar />)

    // Should show "U" as avatar initial when no email
    expect(screen.getByText('U')).toBeDefined()
    // Should show default email placeholder
    expect(screen.getByText('user@example.com')).toBeDefined()
  })

  it('renders user initial from email when provided', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<AppSidebar userEmail="alice@test.com" />)

    // Should show first letter of email uppercased
    expect(screen.getByText('A')).toBeDefined()
    expect(screen.getByText('alice@test.com')).toBeDefined()
  })

  it('shows inactive styling for non-active links', () => {
    vi.mocked(usePathname).mockReturnValue('/other-page')
    render(<AppSidebar userEmail="test@example.com" />)

    const dashboardLink = screen.getAllByText('Dashboard').find(el => el.tagName === 'A')
    expect(dashboardLink).not.toHaveClass('bg-primary')
    expect(dashboardLink).toHaveClass('text-muted-foreground')
  })
})
