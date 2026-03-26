import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import * as z from 'zod/v4'
import { eq, and, desc, gte } from 'drizzle-orm'
import { db } from '../db.js'
import { signals, syntheses } from '../schema.js'

export function registerGetSignals(server: McpServer) {
  server.registerTool(
    'get_signals',
    {
      title: 'Get Signals',
      description:
        'List signals from the latest synthesis, optionally filtered by status, theme, or minimum strength score',
      inputSchema: z.object({
        status: z
          .enum(['new', 'acknowledged', 'in_progress', 'resolved'])
          .optional()
          .describe('Filter by signal status'),
        theme: z.string().optional().describe('Filter by theme tag (case-sensitive)'),
        min_strength: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .describe('Minimum strength score (1-10)'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .default(20)
          .describe('Maximum number of signals to return (default 20)'),
      }),
    },
    async ({ status, theme, min_strength, limit }) => {
      try {
        // Step 1: Get latest synthesis
        const [latest] = await db
          .select()
          .from(syntheses)
          .orderBy(desc(syntheses.createdAt))
          .limit(1)

        if (!latest) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No syntheses found. Run a synthesis first.',
              },
            ],
          }
        }

        // Step 2: Build signal query with filters
        const conditions = [eq(signals.synthesisId, latest.id)]

        if (status) {
          conditions.push(eq(signals.status, status))
        }
        if (min_strength !== undefined) {
          conditions.push(gte(signals.strength, min_strength))
        }

        let results = await db
          .select()
          .from(signals)
          .where(and(...conditions))
          .orderBy(desc(signals.strength))
          .limit(limit)

        // Step 3: Theme filtering in JS (JSONB @> not expressible in Drizzle without raw SQL)
        if (theme) {
          results = results.filter(
            (s) => s.themes && (s.themes as string[]).includes(theme)
          )
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  synthesisId: latest.id,
                  synthesisDate: latest.createdAt,
                  signalCount: results.length,
                  signals: results,
                },
                null,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error fetching signals: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        }
      }
    }
  )
}
