import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';

/** Per-port settings the Open API does not expose; they live on the LAN profile instead. */
const PROFILE_ONLY_FIELDS = [
    'bandwidthLimitMode',
    'linkSpeed',
    'duplex',
    'spanningTreeEnable',
    'portIsolationEnable',
    'loopbackDetectEnable',
    'lldpMedEnable',
] as const;

const profileOnlyNote = 'Not settable per port over the Open API — put it on the port LAN profile (updateLanProfile) or use the web UI';

const updateSwitchPortSchema = z.object({
    siteId: z.string().min(1).optional(),
    switchMac: z.string().min(1, 'switchMac is required'),
    port: z.number().int().min(1).optional().describe('Port number, e.g. 3'),
    portId: z.string().optional().describe('Port number as a string (alias of port)'),
    profileId: z.string().min(1).optional().describe('LAN profile ID to assign'),
    profileOverrideEnable: z.boolean().optional().describe('Enable or disable profile override on the port'),
    poe: z.boolean().optional().describe('PoE on (true) or off (false)'),
    status: z.boolean().optional().describe('Port enabled (true) or shut down (false)'),
    name: z.string().min(1).max(128).optional().describe('Port name'),
    bandwidthLimitMode: z.number().int().optional().describe(profileOnlyNote),
    linkSpeed: z.number().int().optional().describe(profileOnlyNote),
    duplex: z.number().int().optional().describe(profileOnlyNote),
    spanningTreeEnable: z.boolean().optional().describe(profileOnlyNote),
    portIsolationEnable: z.boolean().optional().describe(profileOnlyNote),
    loopbackDetectEnable: z.boolean().optional().describe(profileOnlyNote),
    lldpMedEnable: z.boolean().optional().describe(profileOnlyNote),
});

export function registerUpdateSwitchPortTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'updateSwitchPort',
        {
            description:
                'Update a switch port: LAN profile, profile override, PoE, enabled/disabled and name, in one call. Each setting is written ' +
                'through its own Open API endpoint and the result lists what was applied. STP, isolation, loopback detection, LLDP-MED ' +
                'and speed/duplex are LAN profile settings — use updateLanProfile.',
            inputSchema: updateSwitchPortSchema.shape,
            annotations: {
                destructiveHint: true,
            },
        },
        wrapToolHandler(
            'updateSwitchPort',
            async ({ siteId, switchMac, port, portId, profileId, profileOverrideEnable, poe, status, name, ...rest }) => {
                const unsupported = PROFILE_ONLY_FIELDS.filter((field) => rest[field] !== undefined);
                if (unsupported.length > 0) {
                    throw new Error(
                        `updateSwitchPort: ${unsupported.join(', ')} cannot be set per port over the Open API. ` +
                            'Set them on the port LAN profile (updateLanProfile) or in the web UI.'
                    );
                }

                const portNumber = port ?? (portId !== undefined ? Number.parseInt(portId, 10) : Number.NaN);
                if (Number.isNaN(portNumber)) {
                    throw new Error('updateSwitchPort: port (a number) is required.');
                }

                return toToolResult(
                    await client.updateSwitchPort(switchMac, portNumber, { profileId, profileOverrideEnable, poe, status, name }, siteId)
                );
            }
        )
    );
}
