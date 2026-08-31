import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';

const timeZoneSchema = z.object({
    siteId: z.string().min(1).optional(),
    timeZone: z.string().min(1, 'timeZone is required').describe('IANA timezone, e.g. "Europe/London" or "America/New_York"'),
});

export function registerSetSiteTimeZoneTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'setSiteTimeZone',
        {
            description:
                'Set the site timezone, handling the region and scenario fields the controller requires alongside it. ' +
                'A site left on "UTC" runs every scheduled task an hour early during summer time, so setting a real ' +
                'IANA zone fixes reboot, PoE and WLAN schedules in one go. Requires OMADA_WEB_USERNAME/OMADA_WEB_PASSWORD.',
            inputSchema: timeZoneSchema.shape,
        },
        wrapToolHandler('setSiteTimeZone', async ({ siteId, timeZone }) => toToolResult(await client.setSiteTimeZone(timeZone, siteId)))
    );
}
