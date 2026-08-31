import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

export function registerGetRfPlanningTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'getRfPlanning',
        {
            description:
                'Get the AI RF Planning configuration — what earlier Omada versions called WLAN Optimization. ' +
                'Covers which bands are re-planned, whether channel width, band and transmit power are deployed, ' +
                'excluded APs, and its own schedule (scheduleEnable + occurrence). Note RF Planning keeps its ' +
                'schedule here rather than in the reboot/PoE schedule collections. ' +
                'Requires OMADA_WEB_USERNAME/OMADA_WEB_PASSWORD.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getRfPlanning', async ({ siteId }) => toToolResult(await client.getRfPlanning(siteId)))
    );
}
