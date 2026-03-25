import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSelectWhere = vi.fn()
const mockDeleteWhere = vi.fn()
const mockTxSelectWhere = vi.fn()
const mockTxDeleteWhere = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: mockSelectWhere,
      }),
    }),
    delete: () => ({
      where: mockDeleteWhere,
    }),
    transaction: async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        select: () => ({
          from: () => ({
            where: mockTxSelectWhere,
          }),
        }),
        delete: () => ({
          where: mockTxDeleteWhere,
        }),
      }
      return fn(tx)
    },
  },
}))

vi.mock('@/lib/schema', () => ({
  inputs: { id: 'id' },
  signals: { id: 'id', evidence: 'evidence' },
}))

vi.mock('drizzle-orm', () => ({
  eq: (...args: unknown[]) => args,
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { DELETE } from '@/app/api/inputs/[id]/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(id: string) {
  const request = new NextRequest(`http://localhost/api/inputs/${id}`, {
    method: 'DELETE',
  })
  const params = Promise.resolve({ id })
  return { request, params }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DELETE /api/inputs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 for invalid UUID format', async () => {
    const { request, params } = makeRequest('not-a-uuid')

    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid UUID format')
    expect(mockSelectWhere).not.toHaveBeenCalled()
  })

  it('returns 404 when input not found', async () => {
    const id = '00000000-0000-0000-0000-000000000001'
    const { request, params } = makeRequest(id)

    mockSelectWhere.mockResolvedValueOnce([])

    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Input not found')
  })

  it('returns 409 when input is referenced in signals', async () => {
    const id = '00000000-0000-0000-0000-000000000002'
    const { request, params } = makeRequest(id)

    // First select (outside tx): input exists
    mockSelectWhere.mockResolvedValueOnce([{ id }])
    // Second select (inside tx): dependent signals found
    mockTxSelectWhere.mockResolvedValueOnce([{ id: 'signal-1' }])

    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('Input is referenced in synthesized signals')
    expect(mockTxDeleteWhere).not.toHaveBeenCalled()
  })

  it('returns 200 on successful deletion', async () => {
    const id = '00000000-0000-0000-0000-000000000003'
    const { request, params } = makeRequest(id)

    // First select (outside tx): input exists
    mockSelectWhere.mockResolvedValueOnce([{ id }])
    // Second select (inside tx): no dependent signals
    mockTxSelectWhere.mockResolvedValueOnce([])
    // Delete (inside tx) succeeds
    mockTxDeleteWhere.mockResolvedValueOnce(undefined)

    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockTxDeleteWhere).toHaveBeenCalled()
  })
})
