import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';

const rateUnitSchema = z.union([z.literal(1), z.literal(2)]);

const updateClientSchema = z.object({
    siteId: z.string().min(1).optional(),
    clientMac: z.string().min(1, 'clientMac is required'),
    name: z.string().min(1).max(128).optional().describe('Display name'),
    useFixedAddr: z.boolean().optional().describe('Reserve (true) or release (false) a fixed DHCP address. Implied true when fixedIp is given'),
    fixedIp: z.string().optional().describe('Address to reserve, e.g. "192.168.10.50"'),
    networkId: z.string().optional().describe('LAN network ID the reservation belongs to. Read from the client when omitted'),
    rateLimitEnable: z.boolean().optional().describe('Turn the per-client rate limit on or off. Implied true when a limit is given'),
    upLimit: z.number().int().min(1).max(1024).optional().describe('Upload limit, 1-1024 in upUnit'),
    upUnit: rateUnitSchema.optional().describe('Upload unit: 1 = Kbps (default), 2 = Mbps'),
    downLimit: z.number().int().min(1).max(1024).optional().describe('Download limit, 1-1024 in downUnit'),
    downUnit: rateUnitSchema.optional().describe('Download unit: 1 = Kbps (default), 2 = Mbps'),
    rateLimitId: z.string().optional().describe('Rate limit profile ID, instead of custom limits'),
    rateLimitMode: z
        .number()
        .int()
        .optional()
        .describe('Sent as "mode" with the rate limit. The controller requires it but does not document its values; default 0'),
});

export function registerUpdateClientTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'updateClient',
        {
            description:
                'Update client settings: display name, fixed DHCP address, and per-client rate limits. Each group is written through its own ' +
                'Open API endpoint (name, clients/config, ratelimit); the result lists what was applied.',
            inputSchema: updateClientSchema.shape,
            annotations: {
                destructiveHint: true,
            },
        },
        wrapToolHandler('updateClient', async ({ siteId, clientMac, ...data }) => toToolResult(await client.updateClient(clientMac, data, siteId)))
    );
}
