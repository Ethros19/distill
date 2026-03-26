import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import * as z from 'zod/v4'
import { eq, inArray } from 'drizzle-orm'
import { db } from '../db.js'
import { signals, inputs } from '../schema.js'

export function registerGetSignalDetail(server: McpServer) {
  server.registerTool(
    'get_signal_detail',
    {
      title: 'Get Signal Detail',
      description:
        'Fetch a single signal by ID with its full details and resolved evidence inputs',
      inputSchema: z.object({
        id: z.string().uuid().describe('Signal UUID'),
      }),
    },
    async ({ id }) => {
      try {
        // Step 1: Fetch signal
        const [signal] = await db
          .select()
          .from(signals)
          .where(eq(signals.id, id))

        if (!signal) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Signal not found with id: ${id}`,
              },
            ],
            isError: true,
          }
        }

        // Step 2: Resolve evidence inputs (two-query pattern)
        const evidenceIds = (signal.evidence ?? []) as string[]
        const evidenceInputs =
          evidenceIds.length > 0
            ? await db
                .select()
                .from(inputs)
                .where(inArray(inputs.id, evidenceIds))
            : []

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { ...signal, evidenceInputs },
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
              text: `Error fetching signal detail: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        }
      }
    }
  )
}
