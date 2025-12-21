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
})
