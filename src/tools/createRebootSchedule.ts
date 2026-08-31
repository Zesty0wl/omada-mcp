import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';

const rebootScheduleSchema = z.object({
    siteId: z.string().min(1).optional(),
    name: z.string().min(1, 'name is required'),
    enabled: z.boolean().default(true).describe('Whether the schedule is active'),
    timingType: z.union([z.literal(1), z.literal(2), z.literal(3)]).describe('1 = daily, 2 = weekly, 3 = monthly'),
    hour: z.number().int().min(0).max(23).describe('Hour in the site timezone'),
    minute: z.number().int().min(0).max(59).default(0),
    dayOfWeek: z.number().int().min(0).max(6).optional().describe('0 = Sunday to 6 = Saturday. Required when timingType is 2 (weekly)'),
    dayOfMonth: z.number().int().min(1).max(31).default(1).describe('Used when timingType is 3 (monthly)'),
    monthOfYear: z.number().int().min(1).max(12).default(1),
    deviceMacs: z.array(z.string().min(1)).min(1, 'at least one device MAC is required').describe('MACs to reboot, e.g. ["1C-61-B4-DD-A2-EE"]'),
});

export function registerCreateRebootScheduleTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'createRebootSchedule',
        {
            description:
                'Create a reboot schedule targeting specific devices. Useful for capping the memory creep that makes ' +
                'access points degrade over long uptimes. Times are interpreted in the site timezone, so verify that ' +
                'first with getSiteSettings. Requires OMADA_WEB_USERNAME/OMADA_WEB_PASSWORD.',
            inputSchema: rebootScheduleSchema.shape,
        },
        wrapToolHandler('createRebootSchedule', async (args) => {
            const { siteId, name, enabled, timingType, hour, minute, dayOfWeek, dayOfMonth, monthOfYear, deviceMacs } = args;

            if (timingType === 2 && dayOfWeek === undefined) {
                throw new Error('dayOfWeek is required when timingType is 2 (weekly)');
            }

            return toToolResult(
                await client.createRebootSchedule(
                    {
                        name,
                        status: enabled,
                        occurrence: {
                            timingType,
                            hour,
                            minute,
                            dayOfWeek: dayOfWeek ?? 0,
                            dayOfMonth,
                            monthOfYear,
                        },
                        deviceMacs,
                        oswStackIds: [],
                    },
                    siteId
                )
            );
        })
    );
}
