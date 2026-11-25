import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';

const deletePortForwardingSchema = z.object({
    siteId: z.string().min(1).optional(),
    portForwardingId: z.string().min(1, 'portForwardingId is required (the id from listPortForwardings)'),
});

export function registerDeletePortForwardingTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'deletePortForwarding',
        {
            description:
                'Delete a NAT port forwarding rule by its id from listPortForwardings. To stop a rule temporarily, disable it with updatePortForwarding instead.',
            inputSchema: deletePortForwardingSchema.shape,
            annotations: {
                destructiveHint: true,
            },
        },
        wrapToolHandler('deletePortForwarding', async ({ siteId, portForwardingId }) =>
            toToolResult(await client.deletePortForwarding(portForwardingId, siteId))
        )
    );
}
