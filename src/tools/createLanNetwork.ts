import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { buildLanNetworkBody, type LanNetworkInput, lanNetworkFields } from './lanNetworkSchema.js';

const createLanNetworkSchema = z.object({
    siteId: z.string().min(1).optional(),
    ...lanNetworkFields,
});

export function registerCreateLanNetworkTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'createLanNetwork',
        {
            description:
                'Create a LAN network (VLAN or gateway interface) with optional DHCP settings, including the DNS servers handed to clients. ' +
                'For an interface network supply gatewaySubnet and interfaceIds (copy them from getLanNetworkList). Lease time is in minutes.',
            inputSchema: createLanNetworkSchema.shape,
            annotations: {
                destructiveHint: true,
            },
        },
        wrapToolHandler('createLanNetwork', async ({ siteId, ...data }) =>
            toToolResult(await client.createLanNetwork(buildLanNetworkBody(data as LanNetworkInput), siteId))
        )
    );
}
