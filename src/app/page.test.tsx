import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Home from './page'

vi.mock('@/modules/news', () => ({
  NewsWidget: () => <div data-testid="news-widget">News Widget</div>,
}))

vi.mock('@/modules/github-prs', () => ({
  PRWidget: () => <div data-testid="pr-widget">PR Widget</div>,
}))

describe('Home Page', () => {
  it('renders the dashboard with widgets', () => {
    render(<Home />)

    expect(screen.getByText('Dashboard')).toBeDefined()
    expect(screen.getByText('Your personal dashboard overview.')).toBeDefined()
    expect(screen.getByTestId('news-widget')).toBeDefined()
    expect(screen.getByTestId('pr-widget')).toBeDefined()
  })
})
