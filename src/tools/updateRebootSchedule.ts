import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';

const updateSchema = z.object({
    siteId: z.string().min(1).optional(),
    scheduleId: z.string().min(1, 'scheduleId is required'),
    data: z
        .record(z.string(), z.unknown())
        .describe(
            'Full schedule object. The controller replaces the record, so send every field — fetch the current one with listRebootSchedules first.'
        ),
});

export function registerUpdateRebootScheduleTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'updateRebootSchedule',
        {
            description:
                'Update an existing reboot schedule. This is a replace (PUT), not a merge: read the schedule with ' +
                'listRebootSchedules, change the fields you want, and send the whole object back. ' +
                'Requires OMADA_WEB_USERNAME/OMADA_WEB_PASSWORD.',
            inputSchema: updateSchema.shape,
        },
        wrapToolHandler('updateRebootSchedule', async ({ siteId, scheduleId, data }) =>
            toToolResult(await client.updateRebootSchedule(scheduleId, data, siteId))
        )
    );
}
