import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { buildLanNetworkBody, type LanNetworkInput, lanNetworkFields } from './lanNetworkSchema.js';

const updateLanNetworkSchema = z.object({
    siteId: z.string().min(1).optional(),
    networkId: z.string().min(1, 'networkId is required'),
    ...lanNetworkFields,
});

export function registerUpdateLanNetworkTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'updateLanNetwork',
        {
            description:
                'Update a LAN network: VLAN, gateway subnet, interfaces and DHCP settings such as the DNS servers handed to clients. ' +
                'The controller validates the whole object, so start from the network as returned by getLanNetworkList and change what you need. ' +
                'Lease time is in minutes.',
            inputSchema: updateLanNetworkSchema.shape,
            annotations: {
                destructiveHint: true,
            },
        },
        wrapToolHandler('updateLanNetwork', async ({ siteId, networkId, ...data }) =>
            toToolResult(await client.updateLanNetwork(networkId, buildLanNetworkBody(data as LanNetworkInput), siteId))
        )
    );
}
