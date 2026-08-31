import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

export function registerGetSiteSettingsTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'getSiteSettings',
        {
            description:
                'Get full site settings: timezone and DST, NTP servers, mesh, band steering, airtime fairness, roaming, ' +
                'LED, auto-upgrade, alerts and remote logging. Check the timezone here before trusting any schedule ' +
                'time. Requires OMADA_WEB_USERNAME/OMADA_WEB_PASSWORD.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getSiteSettings', async ({ siteId }) => toToolResult(await client.getSiteSettings(siteId)))
    );
}
