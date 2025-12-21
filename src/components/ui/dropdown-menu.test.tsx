import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from './dropdown-menu'

// Mock ResizeObserver which is used by Radix UI
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

describe('DropdownMenu', () => {
  it('renders correctly when triggered', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              Profile
              <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuCheckboxItem checked>
            Show Sidebar
          </DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup value="light">
            <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>More Tools</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Tool 1</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    )

    const trigger = screen.getByText('Open Menu')
    fireEvent.pointerDown(trigger, {
      pointerId: 1,
      buttons: 1,
    })
    fireEvent.pointerUp(trigger, {
      pointerId: 1,
      buttons: 1,
    })

    expect(await screen.findByText('My Account')).toBeDefined()
    expect(screen.getByText('Profile')).toBeDefined()
    expect(screen.getByText('⌘P')).toBeDefined()
    expect(screen.getByText('Show Sidebar')).toBeDefined()
    expect(screen.getByText('Light')).toBeDefined()
    expect(screen.getByText('Dark')).toBeDefined()
    expect(screen.getByText('More Tools')).toBeDefined()
  })

  it('renders DropdownMenuGroup with data-slot attribute', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup data-testid="menu-group">
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )

    const trigger = screen.getByText('Open Menu')
    fireEvent.pointerDown(trigger, { pointerId: 1, buttons: 1 })
    fireEvent.pointerUp(trigger, { pointerId: 1, buttons: 1 })

    expect(await screen.findByText('Item 1')).toBeDefined()
    expect(screen.getByText('Item 2')).toBeDefined()
    expect(screen.getByTestId('menu-group')).toBeDefined()
  })

  it('renders destructive variant correctly', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem variant="destructive" data-testid="destructive-item">
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )

    const trigger = screen.getByText('Open Menu')
    fireEvent.pointerDown(trigger, { pointerId: 1, buttons: 1 })
    fireEvent.pointerUp(trigger, { pointerId: 1, buttons: 1 })

    const item = await screen.findByTestId('destructive-item')
    expect(item).toBeDefined()
    expect(item.getAttribute('data-variant')).toBe('destructive')
  })

  it('renders inset label correctly', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel inset data-testid="inset-label">Inset Label</DropdownMenuLabel>
          <DropdownMenuItem inset data-testid="inset-item">Inset Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )

    const trigger = screen.getByText('Open Menu')
    fireEvent.pointerDown(trigger, { pointerId: 1, buttons: 1 })
    fireEvent.pointerUp(trigger, { pointerId: 1, buttons: 1 })

    expect(await screen.findByTestId('inset-label')).toBeDefined()
    expect(screen.getByTestId('inset-item')).toBeDefined()
  })

  it('renders submenu with sub trigger and content', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger inset data-testid="sub-trigger">
              Submenu
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent data-testid="sub-content">
              <DropdownMenuItem>Sub Item</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    )

    const trigger = screen.getByText('Open Menu')
    fireEvent.pointerDown(trigger, { pointerId: 1, buttons: 1 })
    fireEvent.pointerUp(trigger, { pointerId: 1, buttons: 1 })

    expect(await screen.findByTestId('sub-trigger')).toBeDefined()
  })
})
