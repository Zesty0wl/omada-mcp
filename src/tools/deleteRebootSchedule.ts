import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';

const deleteSchema = z.object({
    siteId: z.string().min(1).optional(),
    scheduleId: z.string().min(1, 'scheduleId is required'),
});

export function registerDeleteRebootScheduleTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'deleteRebootSchedule',
        {
            description: 'Delete a reboot schedule by id. Requires OMADA_WEB_USERNAME/OMADA_WEB_PASSWORD.',
            inputSchema: deleteSchema.shape,
        },
        wrapToolHandler('deleteRebootSchedule', async ({ siteId, scheduleId }) => toToolResult(await client.deleteRebootSchedule(scheduleId, siteId)))
    );
}
