import { z } from 'zod';

/**
 * Fields of an Omada NAT port forwarding rule (PortForwardingConfig in docs/openapi/04-site-setting.json).
 * Field names match the controller's, as returned by listPortForwardings.
 */
export const portForwardingFields = {
    name: z.string().min(1).max(64).describe('Rule name, 1-64 characters'),
    status: z.boolean().describe('true to enable the rule'),
    interfaceWanPortId: z
        .array(z.string().min(1))
        .min(1)
        .describe(
            'WAN port IDs the rule listens on, e.g. ["2_<id>"]. Copy them from an existing rule in listPortForwardings, or from getInternetInfo'
        ),
    externalPort: z.string().min(1).optional().describe('External (source) port or range, e.g. "32400" or "8000-8010". Required unless dMZ is true'),
    forwardIp: z.string().min(1).describe('LAN IP to forward to'),
    forwardPort: z.string().min(1).optional().describe('Internal (destination) port or range. Required unless dMZ is true'),
    protocol: z
        .union([z.literal(0), z.literal(1), z.literal(2)])
        .optional()
        .describe('0 = TCP and UDP, 1 = TCP, 2 = UDP. Required unless dMZ is true'),
    from: z
        .union([z.literal(0), z.literal(1)])
        .optional()
        .describe('Source restriction: 0 = any source (default), 1 = only limitedAddresses'),
    limitedAddresses: z.array(z.string().min(1)).optional().describe('Allowed source IPs or subnets, used when from is 1'),
    dMZ: z.boolean().optional().describe('Forward all ports to forwardIp (DMZ). Defaults to false'),
};

export const portForwardingFieldsSchema = z.object(portForwardingFields);
export type PortForwardingInput = z.infer<typeof portForwardingFieldsSchema>;

/** Fields the controller returns on a rule but does not accept back, or that are set by the URL. */
const READ_ONLY_FIELDS = ['id', 'site'] as const;

export function stripReadOnly(rule: Record<string, unknown>): Record<string, unknown> {
    const copy = { ...rule };
    for (const key of READ_ONLY_FIELDS) {
        delete copy[key];
    }
    return copy;
}

/** Build a full rule body, filling the flags the controller requires with their usual defaults. */
export function buildPortForwardingBody(input: Partial<PortForwardingInput> & Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = {
        from: 0,
        dMZ: false,
        existWanIp: false,
        existVirtualWan: false,
        ...input,
    };
    for (const [key, value] of Object.entries(body)) {
        if (value === undefined) {
            delete body[key];
        }
    }
    if (body['from'] === 0) {
        delete body['limitedAddresses'];
    }
    return body;
}
