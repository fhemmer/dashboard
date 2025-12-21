import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from './card'

describe('Card', () => {
  it('renders all card components correctly', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
          <CardAction>Action</CardAction>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    )

    expect(screen.getByText('Title')).toBeDefined()
    expect(screen.getByText('Description')).toBeDefined()
    expect(screen.getByText('Action')).toBeDefined()
    expect(screen.getByText('Content')).toBeDefined()
    expect(screen.getByText('Footer')).toBeDefined()
  })

  it('applies custom class names', () => {
    const { container } = render(<Card className="custom-card" />)
    expect(container.firstChild).toHaveClass('custom-card')
  })
})
