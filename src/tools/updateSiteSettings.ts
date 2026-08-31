import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';

const updateSchema = z.object({
    siteId: z.string().min(1).optional(),
    data: z
        .record(z.string(), z.unknown())
        .describe(
            'Sections to patch, e.g. { "airtimeFairness": { "enable5g": true } }. Only the sections you include are ' +
                'modified. Changing anything inside "site" also requires "region" and "scenario" — use setSiteTimeZone for that.'
        ),
});

export function registerUpdateSiteSettingsTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'updateSiteSettings',
        {
            description:
                'Patch site settings. Only the sections supplied are changed. Read the current values with ' +
                'getSiteSettings first. Requires OMADA_WEB_USERNAME/OMADA_WEB_PASSWORD.',
            inputSchema: updateSchema.shape,
        },
        wrapToolHandler('updateSiteSettings', async ({ siteId, data }) => toToolResult(await client.updateSiteSettings(data, siteId)))
    );
}
