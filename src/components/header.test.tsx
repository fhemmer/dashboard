import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Header } from './header'

describe('Header', () => {
  it('renders correctly', () => {
    render(<Header />)
    expect(screen.getByPlaceholderText('Search...')).toBeDefined()
    expect(screen.getByText('Sign In')).toBeDefined()
  })
})
