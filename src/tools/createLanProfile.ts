import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { buildLanProfileBody, type LanProfileInput, lanProfileFields } from './lanProfileSchema.js';

const createLanProfileSchema = z.object({
    siteId: z.string().min(1).optional(),
    ...lanProfileFields,
});

export function registerCreateLanProfileTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'createLanProfile',
        {
            description:
                'Create a switch port LAN profile: native/tagged/untagged networks, PoE, 802.1X, bandwidth or storm control, STP, ' +
                'loopback detection, isolation and LLDP-MED.',
            inputSchema: createLanProfileSchema.shape,
            annotations: {
                destructiveHint: true,
            },
        },
        wrapToolHandler('createLanProfile', async ({ siteId, ...data }) =>
            toToolResult(await client.createLanProfile(buildLanProfileBody(data as LanProfileInput), siteId))
        )
    );
}
