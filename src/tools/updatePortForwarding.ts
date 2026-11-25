import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { buildPortForwardingBody, portForwardingFieldsSchema, stripReadOnly } from './portForwardingSchema.js';

const updatePortForwardingSchema = z.object({
    siteId: z.string().min(1).optional(),
    portForwardingId: z.string().min(1, 'portForwardingId is required (the id from listPortForwardings)'),
    ...portForwardingFieldsSchema.partial().shape,
});

export function registerUpdatePortForwardingTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'updatePortForwarding',
        {
            description:
                'Change a NAT port forwarding rule, e.g. enable or disable it, or change its ports or target IP. ' +
                'Pass only the fields to change: the tool reads the current rule and merges them, because the controller replaces the whole rule.',
            inputSchema: updatePortForwardingSchema.shape,
            annotations: {
                destructiveHint: true,
            },
        },
        wrapToolHandler('updatePortForwarding', async ({ siteId, portForwardingId, ...changes }) => {
            const rules = (await client.listPortForwardings(siteId)) as Record<string, unknown>[];
            const current = rules.find((rule) => rule['id'] === portForwardingId);
            if (!current) {
                throw new Error(`Port forwarding rule ${portForwardingId} not found; use listPortForwardings for valid ids`);
            }
            const body = buildPortForwardingBody({ ...stripReadOnly(current), ...changes });
            return toToolResult(await client.updatePortForwarding(portForwardingId, body, siteId));
        })
    );
}
