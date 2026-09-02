import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

export function registerListPortForwardingsTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'listPortForwardings',
        {
            description:
                'List the configured port forwarding rules for a site: name, enabled status, WAN port, external and internal port, ' +
                'target IP, protocol and any source restriction.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listPortForwardings', async ({ siteId }) => toToolResult(await client.listPortForwardings(siteId)))
    );
}
