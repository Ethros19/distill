import { NextRequest, NextResponse } from 'next/server'
import { getStreams, saveStreams, type StreamConfig } from '@/lib/stream-config'

export async function GET() {
  const streams = await getStreams()
  return NextResponse.json({ streams })
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const { streams } = body as { streams?: StreamConfig[] }

  if (!Array.isArray(streams) || streams.length === 0) {
    return NextResponse.json(
      { error: 'streams must be a non-empty array' },
      { status: 422 },
    )
  }

  // Validate each stream
  const ids = new Set<string>()
  for (const s of streams) {
    if (!s.id || typeof s.id !== 'string' || !/^[a-z0-9-]+$/.test(s.id)) {
      return NextResponse.json(
        { error: `Invalid stream id: "${s.id}". Use lowercase letters, numbers, and hyphens.` },
        { status: 422 },
      )
    }
    if (ids.has(s.id)) {
      return NextResponse.json(
        { error: `Duplicate stream id: "${s.id}"` },
        { status: 422 },
      )
    }
    ids.add(s.id)
    if (!s.label || typeof s.label !== 'string') {
      return NextResponse.json(
        { error: `Stream "${s.id}" missing label` },
        { status: 422 },
      )
    }
    if (!s.hex || typeof s.hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(s.hex)) {
      return NextResponse.json(
        { error: `Stream "${s.id}" has invalid hex color: "${s.hex}"` },
        { status: 422 },
      )
    }
  }

  await saveStreams(streams)
  return NextResponse.json({ ok: true })
}
