import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('merges class names correctly', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('handles conditional classes', () => {
    const includeB = true;
    const includeC = false;
    expect(cn('a', includeB && 'b', includeC && 'c')).toBe('a b')
  })

  it('merges tailwind classes correctly', () => {
    expect(cn('px-2 py-2', 'p-4')).toBe('p-4')
  })

  it('handles undefined and null', () => {
    expect(cn('a', undefined, null, 'b')).toBe('a b')
  })

  it('handles arrays of classes', () => {
    expect(cn(['a', 'b'], 'c')).toBe('a b c')
  })
})
