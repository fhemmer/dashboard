import { fireEvent, render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppSidebar } from './app-sidebar'
import { SidebarProvider } from './ui/sidebar'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ children, ...props }: { children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
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

// Wrapper component that provides SidebarProvider context
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      {children}
    </SidebarProvider>
  )
}

describe('AppSidebar', () => {
  beforeEach(() => {
    localStorage.clear()
    document.cookie = ''
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('renders correctly', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<AppSidebar userEmail="test@example.com" />, { wrapper: TestWrapper })
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    expect(screen.getByText('test@example.com')).toBeDefined()
  })

  it('highlights active link', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<AppSidebar userEmail="test@example.com" />, { wrapper: TestWrapper })
    // Get all Dashboard links - there's the logo header and the menu item
    const dashboardButtons = screen.getAllByRole('link', { name: /dashboard/i })
    // The second one (index 1) is the menu item with data-active
    const menuButton = dashboardButtons[1]
    expect(menuButton).toHaveAttribute('data-active', 'true')
  })

  it('renders default values when userEmail is undefined', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<AppSidebar />, { wrapper: TestWrapper })

    // Should show "U" as avatar initial when no email
    expect(screen.getByText('U')).toBeDefined()
    // Should show default email placeholder
    expect(screen.getByText('user@example.com')).toBeDefined()
  })

  it('renders gravatar image when email is provided', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<AppSidebar userEmail="alice@test.com" />, { wrapper: TestWrapper })

    // Should show gravatar image instead of initial
    const gravatarImage = screen.getByTestId('gravatar-image')
    expect(gravatarImage).toBeDefined()
    expect(gravatarImage).toHaveAttribute('src')
    expect(gravatarImage.getAttribute('src')).toContain('gravatar.com/avatar')
    expect(screen.getByText('alice@test.com')).toBeDefined()
  })

  it('shows inactive styling for non-active links', () => {
    vi.mocked(usePathname).mockReturnValue('/other-page')
    render(<AppSidebar userEmail="test@example.com" />, { wrapper: TestWrapper })

    // Get all Dashboard links - there's the logo header and the menu item
    const dashboardButtons = screen.getAllByRole('link', { name: /dashboard/i })
    // The second one (index 1) is the menu item with data-active
    const menuButton = dashboardButtons[1]
    expect(menuButton).toHaveAttribute('data-active', 'false')
  })

  it('renders displayName when provided', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<AppSidebar userEmail="test@example.com" displayName="John Doe" />, { wrapper: TestWrapper })

    expect(screen.getByText('John Doe')).toBeDefined()
  })

  it('renders "User" when displayName is not provided', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<AppSidebar userEmail="test@example.com" />, { wrapper: TestWrapper })

    expect(screen.getByText('User')).toBeDefined()
  })

  it('has dropdown menu trigger for user section', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<AppSidebar userEmail="test@example.com" displayName="John Doe" />, { wrapper: TestWrapper })

    const userButton = screen.getByRole('button', { name: /john doe/i })
    expect(userButton).toBeDefined()
    expect(userButton).toHaveAttribute('aria-haspopup', 'menu')
  })

  it('opens dropdown menu when user section is clicked', async () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<AppSidebar userEmail="test@example.com" displayName="John Doe" />, { wrapper: TestWrapper })

    const userButton = screen.getByRole('button', { name: /john doe/i })
    fireEvent.pointerDown(userButton, { pointerId: 1, buttons: 1 })
    fireEvent.pointerUp(userButton, { pointerId: 1, buttons: 1 })

    expect(await screen.findByText('Account Settings')).toBeDefined()
    expect(screen.getByText('Sign Out')).toBeDefined()
  })

  it('has account settings link pointing to /account', async () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<AppSidebar userEmail="test@example.com" />, { wrapper: TestWrapper })

    const userButton = screen.getByRole('button', { name: /user/i })
    fireEvent.pointerDown(userButton, { pointerId: 1, buttons: 1 })
    fireEvent.pointerUp(userButton, { pointerId: 1, buttons: 1 })

    const accountLink = await screen.findByRole('menuitem', { name: /account settings/i })
    expect(accountLink).toHaveAttribute('href', '/account')
  })

  it('renders sidebar rail for collapse interaction', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<AppSidebar userEmail="test@example.com" />, { wrapper: TestWrapper })

    const rail = screen.getByRole('button', { name: /toggle sidebar/i })
    expect(rail).toBeDefined()
  })

  it('uses icon collapsible mode', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    const { container } = render(<AppSidebar userEmail="test@example.com" />, { wrapper: TestWrapper })

    const sidebar = container.querySelector('[data-slot="sidebar"]')
    expect(sidebar).toBeDefined()
  })

  describe('Admin navigation', () => {
    it('does not render admin section label when adminNavigation is empty but shows badge', () => {
      vi.mocked(usePathname).mockReturnValue('/')
      render(<AppSidebar userEmail="admin@example.com" isAdmin={true} />, { wrapper: TestWrapper })

      // Admin section label should not render since adminNavigation is now empty
      // But Admin badge should still be visible
      const adminElements = screen.getAllByText('Admin')
      expect(adminElements.length).toBe(1) // Only the badge, not the section label
      expect(adminElements[0]).toHaveAttribute('data-slot', 'badge')
    })

    it('renders Expenditures in main navigation', () => {
      vi.mocked(usePathname).mockReturnValue('/')
      render(<AppSidebar userEmail="user@example.com" isAdmin={false} />, { wrapper: TestWrapper })

      // Expenditures should be visible for all users
      expect(screen.getByText('Expenditures')).toBeDefined()
    })

    it('highlights active Expenditures link', () => {
      vi.mocked(usePathname).mockReturnValue('/expenditures')
      render(<AppSidebar userEmail="user@example.com" isAdmin={false} />, { wrapper: TestWrapper })

      const expendituresLink = screen.getByRole('link', { name: /expenditures/i })
      expect(expendituresLink).toHaveAttribute('data-active', 'true')
    })
  })

  describe('Admin badge', () => {
    it('renders Admin badge when isAdmin is true', () => {
      vi.mocked(usePathname).mockReturnValue('/')
      render(<AppSidebar userEmail="admin@example.com" displayName="Admin User" isAdmin={true} />, { wrapper: TestWrapper })

      expect(screen.getByText('Admin')).toBeDefined()
    })

    it('does not render Admin badge when isAdmin is false', () => {
      vi.mocked(usePathname).mockReturnValue('/')
      render(<AppSidebar userEmail="user@example.com" displayName="Regular User" isAdmin={false} />, { wrapper: TestWrapper })

      expect(screen.queryByText('Admin')).toBeNull()
    })

    it('does not render Admin badge when isAdmin is undefined', () => {
      vi.mocked(usePathname).mockReturnValue('/')
      render(<AppSidebar userEmail="user@example.com" displayName="Regular User" />, { wrapper: TestWrapper })

      expect(screen.queryByText('Admin')).toBeNull()
    })
  })
})
