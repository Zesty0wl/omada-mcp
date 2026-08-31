import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';

const updateSchema = z.object({
    siteId: z.string().min(1).optional(),
    scheduleId: z.string().min(1, 'scheduleId is required'),
    data: z.record(z.string(), z.unknown()).describe('Full PoE schedule object (replace, not merge).'),
});

export function registerUpdatePoeScheduleTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'updatePoeSchedule',
        {
            description: 'Update an existing PoE schedule (replace, not merge). Requires OMADA_WEB_USERNAME/OMADA_WEB_PASSWORD.',
            inputSchema: updateSchema.shape,
        },
        wrapToolHandler('updatePoeSchedule', async ({ siteId, scheduleId, data }) =>
            toToolResult(await client.updatePoeSchedule(scheduleId, data, siteId))
        )
    );
}
