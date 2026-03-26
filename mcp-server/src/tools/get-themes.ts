import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import * as z from 'zod/v4'
import { db } from '../db.js'
import { signals } from '../schema.js'

export function registerGetThemes(server: McpServer) {
  server.registerTool(
    'get_themes',
    {
      title: 'Get Themes',
      description:
        'Aggregate theme tags across all signals with counts and optional per-status breakdown',
      inputSchema: z.object({
        include_signal_counts: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            'Include per-status signal counts for each theme (default true)'
          ),
      }),
    },
    async ({ include_signal_counts }) => {
      try {
        const allSignals = await db
          .select({ themes: signals.themes, status: signals.status })
          .from(signals)

        const counts = new Map<
          string,
          { total: number; byStatus: Record<string, number> }
        >()

        for (const row of allSignals) {
          if (row.themes) {
            for (const theme of row.themes as string[]) {
              const entry = counts.get(theme) ?? {
                total: 0,
                byStatus: {},
              }
              entry.total++
              const status = row.status ?? 'new'
              entry.byStatus[status] = (entry.byStatus[status] ?? 0) + 1
              counts.set(theme, entry)
            }
          }
        }

        const sorted = [...counts.entries()]
          .sort((a, b) => b[1].total - a[1].total)
          .map(([name, data]) =>
            include_signal_counts
              ? { name, count: data.total, byStatus: data.byStatus }
              : { name }
          )

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { themeCount: sorted.length, themes: sorted },
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
              text: `Error fetching themes: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        }
      }
    }
  )
}
