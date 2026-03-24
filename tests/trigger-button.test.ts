import { describe, it, expect, vi, beforeEach } from 'vitest'
import { triggerSynthesis } from '@/app/dashboard/components/trigger-button'

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('triggerSynthesis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /api/synthesis', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'completed', synthesisId: 'synth-1' }),
    })

    await triggerSynthesis()

    expect(mockFetch).toHaveBeenCalledWith('/api/synthesis', { method: 'POST' })
  })

  it('returns ok: true on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'completed' }),
    })

    const result = await triggerSynthesis()

    expect(result).toEqual({ ok: true })
  })

  it('returns ok: false with error message on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'LLM provider unavailable' }),
    })

    const result = await triggerSynthesis()

    expect(result).toEqual({ ok: false, error: 'LLM provider unavailable' })
  })

  it('returns default error when API returns no error message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    })

    const result = await triggerSynthesis()

    expect(result).toEqual({ ok: false, error: 'Synthesis failed' })
  })
})
