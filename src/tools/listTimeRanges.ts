import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

export function registerListTimeRangesTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'listTimeRanges',
        {
            description:
                'List time range profiles for a site. These are the reusable schedule primitive that PoE schedules, ' +
                'WLAN schedules and ACL rules bind to. Requires OMADA_WEB_USERNAME/OMADA_WEB_PASSWORD.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listTimeRanges', async ({ siteId }) => toToolResult(await client.listTimeRanges(siteId)))
    );
}
