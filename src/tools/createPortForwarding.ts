import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { buildPortForwardingBody, portForwardingFields } from './portForwardingSchema.js';

const createPortForwardingSchema = z.object({
    siteId: z.string().min(1).optional(),
    ...portForwardingFields,
});

export function registerCreatePortForwardingTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'createPortForwarding',
        {
            description:
                'Create a NAT port forwarding rule on the gateway, e.g. external TCP 32400 to 192.168.1.10:32400. ' +
                'Copy interfaceWanPortId from an existing rule in listPortForwardings. Check listPortForwardings first so the external port is not already in use.',
            inputSchema: createPortForwardingSchema.shape,
            annotations: {
                destructiveHint: true,
            },
        },
        wrapToolHandler('createPortForwarding', async ({ siteId, ...data }) =>
            toToolResult(await client.createPortForwarding(buildPortForwardingBody(data), siteId))
        )
    );
}
