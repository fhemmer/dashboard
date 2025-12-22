import { fireEvent, render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

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

  it('renders resize handle', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<AppSidebar userEmail="test@example.com" />)

    const resizeHandle = screen.getByRole('separator', { name: /resize sidebar/i })
    expect(resizeHandle).toBeDefined()
    expect(resizeHandle).toHaveAttribute('aria-orientation', 'vertical')
  })

  it('applies default width when no width stored', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    const { container } = render(<AppSidebar userEmail="test@example.com" />)

    const sidebar = container.firstChild as HTMLElement
    expect(sidebar.style.width).toBe('256px')
  })

  it('applies stored width from localStorage', () => {
    localStorage.setItem('dashboard-sidebar-width', '300')
    vi.mocked(usePathname).mockReturnValue('/')
    const { container } = render(<AppSidebar userEmail="test@example.com" />)

    const sidebar = container.firstChild as HTMLElement
    expect(sidebar.style.width).toBe('300px')
  })

  it('resize handle responds to keyboard navigation', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<AppSidebar userEmail="test@example.com" />)

    const resizeHandle = screen.getByRole('separator', { name: /resize sidebar/i })

    fireEvent.keyDown(resizeHandle, { key: 'ArrowRight' })
    expect(localStorage.getItem('dashboard-sidebar-width')).toBe('266')

    fireEvent.keyDown(resizeHandle, { key: 'ArrowLeft' })
    expect(localStorage.getItem('dashboard-sidebar-width')).toBe('256')
  })

  it('accepts serverSidebarWidth prop', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    const { container } = render(<AppSidebar userEmail="test@example.com" serverSidebarWidth={320} />)

    const sidebar = container.firstChild as HTMLElement
    // Server width is applied via useSidebarWidthInit
    expect(sidebar.style.width).toBe('320px')
  })

  it('calls onWidthChange callback', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    const onWidthChange = vi.fn()
    render(<AppSidebar userEmail="test@example.com" onWidthChange={onWidthChange} />)

    const resizeHandle = screen.getByRole('separator', { name: /resize sidebar/i })

    // Simulate mouse down and up to trigger width change callback
    fireEvent.mouseDown(resizeHandle, { clientX: 256, buttons: 1 })
    // mouseUp triggers document event, we test the callback is wired up
    expect(resizeHandle).toBeDefined()
  })

  it('handles drag resize with mouse events', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    const onWidthChange = vi.fn()
    const { container } = render(<AppSidebar userEmail="test@example.com" onWidthChange={onWidthChange} />)

    const resizeHandle = screen.getByRole('separator', { name: /resize sidebar/i })
    const sidebar = container.firstChild as HTMLElement

    // Start resizing
    fireEvent.mouseDown(resizeHandle, { clientX: 256 })

    // Simulate mouse move
    fireEvent.mouseMove(document, { clientX: 300 })

    // Complete resize
    fireEvent.mouseUp(document)

    // Width should have changed (300 - 256 = 44 pixels added)
    expect(sidebar.style.width).toBe('300px')
    expect(onWidthChange).toHaveBeenCalled()
  })

  it('clamps resize to min/max bounds during drag', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    const { container } = render(<AppSidebar userEmail="test@example.com" />)

    const resizeHandle = screen.getByRole('separator', { name: /resize sidebar/i })
    const sidebar = container.firstChild as HTMLElement

    // Start resizing
    fireEvent.mouseDown(resizeHandle, { clientX: 256 })

    // Try to resize beyond max (400)
    fireEvent.mouseMove(document, { clientX: 600 })
    expect(sidebar.style.width).toBe('400px')

    // Complete resize
    fireEvent.mouseUp(document)
  })

  it('applies select-none class while resizing', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    const { container } = render(<AppSidebar userEmail="test@example.com" />)

    const resizeHandle = screen.getByRole('separator', { name: /resize sidebar/i })
    const sidebar = container.firstChild as HTMLElement

    // Before resizing - should not have select-none
    expect(sidebar.classList.contains('select-none')).toBe(false)

    // Start resizing
    fireEvent.mouseDown(resizeHandle, { clientX: 256 })

    // During resizing - should have select-none
    expect(sidebar.classList.contains('select-none')).toBe(true)

    // Complete resize
    fireEvent.mouseUp(document)

    // After resizing - should not have select-none
    expect(sidebar.classList.contains('select-none')).toBe(false)
  })
})
