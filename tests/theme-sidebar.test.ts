import { describe, it, expect, vi } from 'vitest'

// Mock db to prevent connection error on import
vi.mock('@/lib/db', () => ({
  db: { select: () => ({ from: () => [] }) },
}))

import { aggregateThemes } from '@/app/dashboard/components/theme-sidebar'

describe('aggregateThemes', () => {
  it('counts theme occurrences across signals', () => {
    const rows = [
      { themes: ['ui', 'accessibility'] },
      { themes: ['ui', 'performance'] },
      { themes: ['performance', 'auth'] },
    ]

    const result = aggregateThemes(rows)

    expect(result).toEqual([
      { name: 'ui', count: 2 },
      { name: 'performance', count: 2 },
      { name: 'accessibility', count: 1 },
      { name: 'auth', count: 1 },
    ])
  })

  it('sorts themes by count descending', () => {
    const rows = [
      { themes: ['billing'] },
      { themes: ['auth', 'billing'] },
      { themes: ['auth', 'billing', 'ui'] },
    ]

    const result = aggregateThemes(rows)

    expect(result[0].name).toBe('billing')
    expect(result[0].count).toBe(3)
    expect(result[1].name).toBe('auth')
    expect(result[1].count).toBe(2)
    expect(result[2].name).toBe('ui')
    expect(result[2].count).toBe(1)
  })

  it('returns empty array for no signals', () => {
    expect(aggregateThemes([])).toEqual([])
  })

  it('handles null themes gracefully', () => {
    const rows = [
      { themes: ['ui'] },
      { themes: null },
      { themes: ['ui', 'auth'] },
    ]

    const result = aggregateThemes(rows)

    expect(result).toEqual([
      { name: 'ui', count: 2 },
      { name: 'auth', count: 1 },
    ])
  })

  it('counts duplicate themes within a single signal', () => {
    const rows = [
      { themes: ['billing', 'billing'] },
      { themes: ['billing'] },
    ]

    const result = aggregateThemes(rows)

    expect(result).toEqual([{ name: 'billing', count: 3 }])
  })
})
