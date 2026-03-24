import { describe, it, expect } from 'vitest'
import {
  formatDateRange,
  formatRelativeTime,
} from '@/app/dashboard/components/synthesis-header'
import { strengthColor } from '@/app/dashboard/components/signal-card'

// ---------------------------------------------------------------------------
// formatDateRange
// ---------------------------------------------------------------------------

describe('formatDateRange', () => {
  it('formats date range as "Mon DD - Mon DD, YYYY"', () => {
    const start = new Date('2026-03-17T09:00:00Z')
    const end = new Date('2026-03-24T09:00:00Z')
    const result = formatDateRange(start, end)

    expect(result).toContain('Mar 17')
    expect(result).toContain('Mar 24')
    expect(result).toContain('2026')
    expect(result).toContain(' - ')
  })

  it('handles cross-month ranges', () => {
    const start = new Date('2026-01-28T09:00:00Z')
    const end = new Date('2026-02-04T09:00:00Z')
    const result = formatDateRange(start, end)

    expect(result).toContain('Jan 28')
    expect(result).toContain('Feb 4')
  })
})

// ---------------------------------------------------------------------------
// formatRelativeTime
// ---------------------------------------------------------------------------

describe('formatRelativeTime', () => {
  it('returns "just now" for very recent dates', () => {
    const now = new Date()
    expect(formatRelativeTime(now)).toBe('just now')
  })

  it('returns minutes ago for recent dates', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
    expect(formatRelativeTime(fiveMinAgo)).toBe('5m ago')
  })

  it('returns hours ago for dates within 24 hours', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000)
    expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago')
  })

  it('returns days ago for older dates', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago')
  })
})

// ---------------------------------------------------------------------------
// strengthColor
// ---------------------------------------------------------------------------

describe('strengthColor', () => {
  it('returns gray color for strength 1-2', () => {
    expect(strengthColor(1)).toContain('bg-gray')
    expect(strengthColor(2)).toContain('bg-gray')
  })

  it('returns blue color for strength 3-4', () => {
    expect(strengthColor(3)).toContain('bg-blue')
    expect(strengthColor(4)).toContain('bg-blue')
  })

  it('returns red color for strength 5+', () => {
    expect(strengthColor(5)).toContain('bg-red')
    expect(strengthColor(8)).toContain('bg-red')
  })
})
