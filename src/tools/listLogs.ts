import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';

const listLogsSchema = z.object({
    siteId: z.string().min(1).optional(),
    page: z.number().int().min(1).optional().default(1).describe('Page number (default: 1)'),
    pageSize: z.number().int().min(1).max(1000).optional().default(10).describe('Page size (default: 10, max: 1000)'),
    timeStart: z.number().int().optional().describe('Window start, epoch milliseconds (default: 7 days before timeEnd)'),
    timeEnd: z.number().int().optional().describe('Window end, epoch milliseconds (default: now)'),
    module: z.enum(['System', 'Device', 'Client']).optional().describe('Only this log module'),
});

export function registerListLogsTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'listLogs',
        {
            description:
                'Site event log over the Open API: device, client and system events with timestamps, newest first. Defaults to the last ' +
                '7 days. Works without web credentials; listEvents is the same data via the internal API when credentials are set.',
            inputSchema: listLogsSchema.shape,
        },
        wrapToolHandler('listLogs', async ({ siteId, page, pageSize, timeStart, timeEnd, module }) =>
            toToolResult(await client.listLogs(siteId, page, pageSize, { timeStart, timeEnd, module }))
        )
    );
}
