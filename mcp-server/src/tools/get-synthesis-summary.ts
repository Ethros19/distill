import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import * as z from 'zod/v4'
import { eq, desc } from 'drizzle-orm'
import { db } from '../db.js'
import { syntheses, signals } from '../schema.js'

export function registerGetSynthesisSummary(server: McpServer) {
  server.registerTool(
    'get_synthesis_summary',
    {
      title: 'Get Synthesis Summary',
      description:
        'Get the latest synthesis overview including metadata and top signals ranked by strength. Optionally include the full digest markdown.',
      inputSchema: z.object({
        include_digest: z
          .boolean()
          .optional()
          .default(false)
          .describe('Include the full digest markdown text'),
        top_signals: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .default(5)
          .describe('Number of top signals to include (1-20, default 5)'),
      }),
    },
    async ({ include_digest, top_signals }) => {
      try {
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
                text: 'No syntheses found. Run a synthesis from the dashboard first.',
              },
            ],
          }
        }

        const signalRows = await db
          .select()
          .from(signals)
          .where(eq(signals.synthesisId, latest.id))
          .orderBy(desc(signals.strength))
          .limit(top_signals)

        const result = {
          synthesis: {
            id: latest.id,
            createdAt: latest.createdAt,
            periodStart: latest.periodStart,
            periodEnd: latest.periodEnd,
            inputCount: latest.inputCount,
            signalCount: latest.signalCount,
            trigger: latest.trigger,
            digestMarkdown: include_digest
              ? latest.digestMarkdown
              : undefined,
          },
          topSignals: signalRows.map((s) => ({
            id: s.id,
            statement: s.statement,
            strength: s.strength,
            status: s.status,
            themes: s.themes,
          })),
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error fetching synthesis summary: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        }
      }
    },
  )
}
