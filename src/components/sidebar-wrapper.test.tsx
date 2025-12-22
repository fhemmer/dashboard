import { act, render, screen } from '@testing-library/react'
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

const mockUpdateSidebarWidth = vi.fn().mockResolvedValue({})

vi.mock('@/app/account/actions', () => ({
  updateSidebarWidth: (width: number) => mockUpdateSidebarWidth(width),
}))

describe('SidebarWrapper', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(usePathname).mockReturnValue('/')
    vi.useFakeTimers()
  })

  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.useRealTimers()
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

  it('passes serverSidebarWidth to AppSidebar', () => {
    const { container } = render(
      <SidebarWrapper
        userEmail="test@example.com"
        serverSidebarWidth={320}
      />
    )

    const sidebar = container.firstChild as HTMLElement
    expect(sidebar.style.width).toBe('320px')
  })

  it('renders with default width when no server width provided', () => {
    const { container } = render(
      <SidebarWrapper userEmail="test@example.com" />
    )

    const sidebar = container.firstChild as HTMLElement
    expect(sidebar.style.width).toBe('256px')
  })

  it('renders with null serverSidebarWidth', () => {
    const { container } = render(
      <SidebarWrapper
        userEmail="test@example.com"
        serverSidebarWidth={null}
      />
    )

    const sidebar = container.firstChild as HTMLElement
    expect(sidebar.style.width).toBe('256px')
  })

  it('debounces width change updates to database', async () => {
    render(
      <SidebarWrapper userEmail="test@example.com" />
    )

    // Trigger the onWidthChange callback by simulating resize
    const resizeHandle = screen.getByRole('separator', { name: /resize sidebar/i })

    // Simulate resize
    act(() => {
      resizeHandle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 256 }))
    })
    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    })

    // Before debounce timeout, should not have called
    expect(mockUpdateSidebarWidth).not.toHaveBeenCalled()

    // Advance timers past debounce delay
    act(() => {
      vi.advanceTimersByTime(600)
    })

    // After debounce, should have called with current width
    expect(mockUpdateSidebarWidth).toHaveBeenCalled()
  })
})
