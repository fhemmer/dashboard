import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from './badge'

describe('Badge', () => {
  it('renders correctly', () => {
    render(<Badge>Test Badge</Badge>)
    expect(screen.getByText('Test Badge')).toBeDefined()
  })

  it('applies variant classes', () => {
    const { container } = render(<Badge variant="destructive">Destructive</Badge>)
    expect(container.firstChild).toHaveClass('bg-destructive')
  })

  it('renders as a child when asChild is true', () => {
    render(
      <Badge asChild>
        <a href="#">Link Badge</a>
      </Badge>
    )
    const link = screen.getByRole('link')
    expect(link).toBeDefined()
    expect(link).toHaveTextContent('Link Badge')
  })
})
