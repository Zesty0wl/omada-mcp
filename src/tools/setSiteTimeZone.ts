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
                'IMPORTANT: on firmware tested, the timezone alone does NOT make schedules observe daylight saving. ' +
                'Omada keeps DST as a separate site setting (site.dst.enable, with manual recurring start/end rules) ' +
                'which is off by default, so a controller runs on standard offset year-round and a "06:00" schedule ' +
                'fires at 07:00 wall-clock during summer time. Check site.dst via getSiteSettings, and treat a ' +
                "schedule's notInDst flag as confirmation. Requires OMADA_WEB_USERNAME/OMADA_WEB_PASSWORD.",
            inputSchema: timeZoneSchema.shape,
        },
        wrapToolHandler('setSiteTimeZone', async ({ siteId, timeZone }) => toToolResult(await client.setSiteTimeZone(timeZone, siteId)))
    );
}
