import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import * as z from 'zod/v4'
import { ilike, or, and, eq, desc } from 'drizzle-orm'
import { db } from '../db.js'
import { inputs } from '../schema.js'

export function registerSearchInputs(server: McpServer) {
  server.registerTool(
    'search_inputs',
    {
      title: 'Search Inputs',
      description:
        'Keyword search across raw feedback inputs. Searches both raw content and LLM-generated summaries using case-insensitive matching.',
      inputSchema: z.object({
        keyword: z.string().min(1).describe('Keyword to search in raw content and summary'),
        source: z.string().optional().describe('Filter by source (e.g. "email", "paste")'),
        limit: z.number().int().min(1).max(50).optional().default(20).describe('Max results to return (1-50, default 20)'),
      }),
    },
    async ({ keyword, source, limit }) => {
      try {
        // Sanitize keyword — escape % and _ to prevent SQL pattern injection
        const sanitized = keyword.replace(/%/g, '\\%').replace(/_/g, '\\_')
        const pattern = `%${sanitized}%`

        const searchCondition = or(
          ilike(inputs.rawContent, pattern),
          ilike(inputs.summary, pattern),
        )

        const whereCondition = source
          ? and(searchCondition, eq(inputs.source, source))
          : searchCondition

        const rows = await db
          .select()
          .from(inputs)
          .where(whereCondition)
          .orderBy(desc(inputs.createdAt))
          .limit(limit)

        const results = rows.map((row) => ({
          id: row.id,
          source: row.source,
          contributor: row.contributor,
          rawContent:
            row.rawContent.length > 500
              ? row.rawContent.slice(0, 500) + '...'
              : row.rawContent,
          summary: row.summary,
          type: row.type,
          themes: row.themes,
          urgency: row.urgency,
          createdAt: row.createdAt,
        }))

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { count: results.length, keyword, results },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error searching inputs: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        }
      }
    },
  )
}
