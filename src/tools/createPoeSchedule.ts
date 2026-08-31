import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';

const createSchema = z.object({
    siteId: z.string().min(1).optional(),
    data: z.record(z.string(), z.unknown()).describe('PoE schedule object. Binds a time range profile (see listTimeRanges) to switch ports.'),
});

export function registerCreatePoeScheduleTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'createPoeSchedule',
        {
            description:
                'Create a PoE schedule. Prefer a reboot schedule where the target is an Omada-managed device — cutting ' +
                'PoE is a hard power cut, and it will also drop anything else sharing the port, including a ' +
                'PoE-powered controller. Requires OMADA_WEB_USERNAME/OMADA_WEB_PASSWORD.',
            inputSchema: createSchema.shape,
        },
        wrapToolHandler('createPoeSchedule', async ({ siteId, data }) => toToolResult(await client.createPoeSchedule(data, siteId)))
    );
}
