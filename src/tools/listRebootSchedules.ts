import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

export function registerListRebootSchedulesTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'listRebootSchedules',
        {
            description:
                'List reboot schedules for a site, including which devices each one targets and the next execution time. ' +
                'nextExecute is a millisecond epoch in UTC — compare it against the site timezone, since a site left on ' +
                'UTC will run schedules an hour early during summer time. Requires OMADA_WEB_USERNAME/OMADA_WEB_PASSWORD.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listRebootSchedules', async ({ siteId }) => toToolResult(await client.listRebootSchedules(siteId)))
    );
}
