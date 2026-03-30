import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function GET() {
  const rows = await db.execute(sql`
    SELECT
      jsonb_array_elements_text(themes) AS name,
      count(*)::int AS count
    FROM signals
    WHERE themes IS NOT NULL AND jsonb_array_length(themes) > 0
    GROUP BY jsonb_array_elements_text(themes)
    ORDER BY count DESC
  `) as unknown as { rows: Array<{ name: string; count: number }> }

  return NextResponse.json({ themes: rows.rows })
}
