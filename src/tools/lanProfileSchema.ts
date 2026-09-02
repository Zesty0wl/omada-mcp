import { z } from 'zod';

const bandCtrlSchema = z.object({
    egressEnable: z.boolean().describe('Limit egress'),
    egressLimit: z.number().int().optional().describe('Egress limit in egressUnit'),
    egressUnit: z.number().int().min(1).max(2).optional().describe('1 = Kbps, 2 = Mbps'),
    ingressEnable: z.boolean().describe('Limit ingress'),
    ingressLimit: z.number().int().optional().describe('Ingress limit in ingressUnit'),
    ingressUnit: z.number().int().min(1).max(2).optional().describe('1 = Kbps, 2 = Mbps'),
});

const stormCtrlSchema = z.object({
    unknownUnicastEnable: z.boolean(),
    unknownUnicast: z.number().int().optional(),
    multicastEnable: z.boolean(),
    multicast: z.number().int().optional(),
    broadcastEnable: z.boolean(),
    broadcast: z.number().int().optional(),
    action: z.number().int().min(0).max(1).describe('0 = drop, 1 = shut the port down'),
    recoverTime: z.number().int().min(1).max(3600).optional().describe('Seconds before a shut-down port recovers (default 3600)'),
});

/** Fields shared by createLanProfile and updateLanProfile; mirrors POST/PATCH /sites/{siteId}/lan-profiles. */
export const lanProfileFields = {
    name: z.string().min(1, 'Profile name is required').describe('1-128 characters'),
    nativeNetworkId: z.string().min(1).describe('Native (PVID, untagged) network ID'),
    tagNetworkIds: z.array(z.string().min(1)).default([]).describe('Tagged network IDs'),
    untagNetworkIds: z.array(z.string().min(1)).optional().describe('Further untagged network IDs'),
    voiceNetworkId: z.string().optional().describe('Voice VLAN network ID'),
    poe: z
        .union([z.number().int().min(0).max(2), z.boolean()])
        .default(2)
        .describe('PoE: 0 = on, 1 = off, 2 = do not modify (default). true/false are accepted as on/off'),
    dot1x: z
        .number()
        .int()
        .min(0)
        .max(2)
        .default(1)
        .describe('802.1X port control: 0 = force unauthorized, 1 = force authorized (default), 2 = auto'),
    bandWidthCtrlType: z
        .number()
        .int()
        .min(0)
        .max(2)
        .default(0)
        .describe('Bandwidth control: 0 = off (default), 1 = rate limit (fill bandCtrl), 2 = storm control (fill stormCtrl)'),
    bandCtrl: bandCtrlSchema.optional().describe('Rate limits, used when bandWidthCtrlType is 1'),
    stormCtrl: stormCtrlSchema.optional().describe('Storm control, used when bandWidthCtrlType is 2'),
    spanningTreeEnable: z.boolean().default(false).describe('Enable spanning tree'),
    loopbackDetectEnable: z.boolean().default(false).describe('Enable loopback detection'),
    portIsolationEnable: z.boolean().default(false).describe('Enable port isolation'),
    lldpMedEnable: z.boolean().default(true).describe('Enable LLDP-MED'),
    eeeEnable: z.boolean().optional().describe('Enable Energy Efficient Ethernet'),
    flowControlEnable: z.boolean().optional().describe('Enable flow control'),
    loopbackDetectVlanBasedEnable: z.boolean().optional().describe('VLAN-based loopback detection'),
    dhcpL2RelaySettings: z
        .object({
            enable: z.boolean(),
            format: z.number().int().min(0).max(1).optional().describe('0 = normal, 1 = private'),
        })
        .optional()
        .describe('DHCP L2 relay'),
};

export type LanProfileInput = z.infer<z.ZodObject<typeof lanProfileFields>>;

/**
 * Translate tool input into the request body of POST/PATCH /sites/{siteId}/lan-profiles.
 * The controller wants `poe` as 0/1/2; a boolean from older callers is mapped to on/off.
 */
export function buildLanProfileBody(input: LanProfileInput): Record<string, unknown> {
    const { poe, ...rest } = input;
    const body: Record<string, unknown> = { ...rest };
    if (typeof poe === 'boolean') {
        body.poe = poe ? 0 : 1;
    } else if (poe !== undefined) {
        body.poe = poe;
    }
    return body;
}
