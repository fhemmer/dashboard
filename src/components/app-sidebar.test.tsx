import { fireEvent, render, screen } from '@testing-library/react'
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

vi.mock('next/image', () => ({
  default: ({ src, alt, className }: { src: string, alt: string, className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} data-testid="gravatar-image" />
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

  it('renders gravatar image when email is provided', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<AppSidebar userEmail="alice@test.com" />)

    // Should show gravatar image instead of initial
    const gravatarImage = screen.getByTestId('gravatar-image')
    expect(gravatarImage).toBeDefined()
    expect(gravatarImage).toHaveAttribute('src')
    expect(gravatarImage.getAttribute('src')).toContain('gravatar.com/avatar')
    expect(screen.getByText('alice@test.com')).toBeDefined()
  })

  it('shows inactive styling for non-active links', () => {
    vi.mocked(usePathname).mockReturnValue('/other-page')
    render(<AppSidebar userEmail="test@example.com" />)

    const dashboardLink = screen.getAllByText('Dashboard').find(el => el.tagName === 'A')
    expect(dashboardLink).not.toHaveClass('bg-primary')
    expect(dashboardLink).toHaveClass('text-muted-foreground')
  })

  it('renders displayName when provided', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<AppSidebar userEmail="test@example.com" displayName="John Doe" />)

    expect(screen.getByText('John Doe')).toBeDefined()
  })

  it('renders "User" when displayName is not provided', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<AppSidebar userEmail="test@example.com" />)

    expect(screen.getByText('User')).toBeDefined()
  })

  it('has dropdown menu trigger for user section', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<AppSidebar userEmail="test@example.com" displayName="John Doe" />)

    const userButton = screen.getByRole('button', { name: /john doe/i })
    expect(userButton).toBeDefined()
    expect(userButton).toHaveAttribute('aria-haspopup', 'menu')
  })

  it('opens dropdown menu when user section is clicked', async () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<AppSidebar userEmail="test@example.com" displayName="John Doe" />)

    const userButton = screen.getByRole('button', { name: /john doe/i })
    fireEvent.pointerDown(userButton, { pointerId: 1, buttons: 1 })
    fireEvent.pointerUp(userButton, { pointerId: 1, buttons: 1 })

    expect(await screen.findByText('Account Settings')).toBeDefined()
    expect(screen.getByText('Sign Out')).toBeDefined()
  })

  it('has account settings link pointing to /account', async () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<AppSidebar userEmail="test@example.com" />)

    const userButton = screen.getByRole('button', { name: /user/i })
    fireEvent.pointerDown(userButton, { pointerId: 1, buttons: 1 })
    fireEvent.pointerUp(userButton, { pointerId: 1, buttons: 1 })

    const accountLink = await screen.findByRole('link', { name: /account settings/i })
    expect(accountLink).toHaveAttribute('href', '/account')
  })
})
