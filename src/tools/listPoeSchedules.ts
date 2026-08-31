import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

export function registerListPoeSchedulesTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'listPoeSchedules',
        {
            description:
                'List PoE schedules for a site. PoE schedules cut and restore power to switch ports on a time range, ' +
                'which power-cycles whatever is attached. Requires OMADA_WEB_USERNAME/OMADA_WEB_PASSWORD.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listPoeSchedules', async ({ siteId }) => toToolResult(await client.listPoeSchedules(siteId)))
    );
}
