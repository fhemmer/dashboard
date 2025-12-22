import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Home from './page'

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      order: vi.fn().mockResolvedValue({
        data: [
          { id: '1-abc', name: 'Test Record 1', created_at: '2023-01-01T00:00:00Z' },
          { id: '2-def', name: 'Test Record 2', created_at: '2023-01-02T00:00:00Z' },
        ],
        error: null,
      }),
    })),
  })),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

vi.mock('@/modules/news', () => ({
  NewsWidget: () => <div data-testid="news-widget">News Widget</div>,
}))

vi.mock('@/modules/github-prs', () => ({
  PRWidget: () => <div data-testid="pr-widget">PR Widget</div>,
}))

describe('Home Page', () => {
  it('renders the dashboard with records', async () => {
    const Page = await Home()
    render(Page)

    expect(screen.getByText('Dashboard')).toBeDefined()
    expect(screen.getByText('Total Records')).toBeDefined()
    expect(screen.getByTestId('news-widget')).toBeDefined()

    // Check total records count in the card
    const totalRecordsCard = screen.getByText('Total Records').closest('[data-slot="card"]')
    expect(totalRecordsCard).toBeDefined()
    expect(totalRecordsCard?.textContent).toContain('2')

    expect(screen.getByText('Test Record 1')).toBeDefined()
    expect(screen.getByText('Test Record 2')).toBeDefined()
  })

  it('handles error when fetching records', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Fetch failed', details: '', hint: '', code: '' },
        }),
      })),
    } as unknown as ReturnType<typeof mockSupabase.from>)

    const Page = await Home()
    render(Page)

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
