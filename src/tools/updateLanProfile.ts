import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { buildLanProfileBody, type LanProfileInput, lanProfileFields } from './lanProfileSchema.js';

const updateLanProfileSchema = z.object({
    siteId: z.string().min(1).optional(),
    profileId: z.string().min(1, 'profileId is required'),
    ...lanProfileFields,
});

export function registerUpdateLanProfileTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'updateLanProfile',
        {
            description:
                'Update a switch port LAN profile. The controller validates the whole profile, so start from the profile as returned by ' +
                'getLanProfileList and change what you need.',
            inputSchema: updateLanProfileSchema.shape,
            annotations: {
                destructiveHint: true,
            },
        },
        wrapToolHandler('updateLanProfile', async ({ siteId, profileId, ...data }) =>
            toToolResult(await client.updateLanProfile(profileId, buildLanProfileBody(data as LanProfileInput), siteId))
        )
    );
}
