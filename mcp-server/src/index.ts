#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerGetSignals } from './tools/get-signals.js'
import { registerGetSignalDetail } from './tools/get-signal-detail.js'
import { registerGetThemes } from './tools/get-themes.js'
import { registerSearchInputs } from './tools/search-inputs.js'
import { registerGetSynthesisSummary } from './tools/get-synthesis-summary.js'

const server = new McpServer(
  { name: 'distill', version: '1.0.0' },
  { capabilities: { logging: {} } }
)

registerGetSignals(server)
registerGetSignalDetail(server)
registerGetThemes(server)
registerSearchInputs(server)
registerGetSynthesisSummary(server)

const transport = new StdioServerTransport()
await server.connect(transport)
