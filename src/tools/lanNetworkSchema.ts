import { z } from 'zod';

const dhcpRangeSchema = z.object({
    ipaddrStart: z.string().min(1).describe('Range start IP'),
    ipaddrEnd: z.string().min(1).describe('Range end IP'),
});

const dhcpOptionSchema = z.object({
    code: z.number().int().describe('DHCP option code'),
    type: z.number().int().min(0).max(2).describe('0 = string, 1 = IP address, 2 = hex array'),
    value: z.string().describe('Option value'),
});

export const dhcpSettingsSchema = z.object({
    enable: z.boolean().describe('Run a DHCP server on this network'),
    ipRangeStart: z.string().min(1).optional().describe('Pool start IP, e.g. "192.168.10.100" — shorthand for a single ipRangePool entry'),
    ipRangeEnd: z.string().min(1).optional().describe('Pool end IP, e.g. "192.168.10.200"'),
    ipRangePool: z
        .array(dhcpRangeSchema)
        .optional()
        .describe('DHCP pools. getLanNetworkList reports dhcpRangePoolSize, the most entries the controller accepts'),
    dhcpns: z
        .enum(['auto', 'manual'])
        .optional()
        .describe('DNS handed to clients: "auto" = the gateway itself, "manual" = priDns/sndDns. Implied "manual" when priDns is given'),
    priDns: z.string().optional().describe('Primary DNS server for clients (dhcpns "manual")'),
    sndDns: z.string().optional().describe('Secondary DNS server for clients (dhcpns "manual")'),
    leasetime: z.number().int().min(2).max(10080).optional().describe('Lease time in MINUTES, 2-10080 (controller default 120)'),
    leaseTime: z.number().int().optional().describe('Deprecated alias of leasetime. Minutes, not seconds'),
    gateway: z.string().optional().describe('DHCP gateway IP when it differs from the network gateway'),
    dhcpNextServer: z.string().optional().describe('Next-server (siaddr) IP for PXE'),
    options: z.array(dhcpOptionSchema).optional().describe('Custom DHCP options'),
});

export type DhcpSettingsInput = z.infer<typeof dhcpSettingsSchema>;

/** Fields shared by createLanNetwork and updateLanNetwork; mirrors POST/PATCH /sites/{siteId}/lan-networks (v2). */
export const lanNetworkFields = {
    name: z.string().min(1, 'Network name is required').describe('1-128 characters'),
    purpose: z.number().int().min(0).max(1).describe('0 = VLAN only (switch side), 1 = interface (gateway-routed network with a subnet)'),
    vlan: z.number().int().min(1).max(4090).describe('VLAN ID, 1-4090'),
    interfaceIds: z
        .array(z.string().min(1))
        .optional()
        .describe('Gateway LAN port IDs an interface network is bound to. Copy them from an existing network in getLanNetworkList'),
    vlanType: z.number().int().min(0).max(1).optional().describe('Interface networks: 0 = single VLAN (default), 1 = multiple (see vlans)'),
    vlans: z.string().optional().describe('Interface networks with vlanType 1: VLAN list, e.g. "200, 1-100"'),
    application: z.number().int().min(0).max(1).optional().describe('0 = gateway and switch (default), 1 = switch only'),
    gatewaySubnet: z.string().min(1).optional().describe('Gateway IP and mask in CIDR, e.g. "192.168.10.1/24". Required for interface networks'),
    domain: z.string().optional().describe('Domain name for the network'),
    igmpSnoopEnable: z.boolean().describe('Enable IGMP snooping'),
    mldSnoopEnable: z.boolean().optional().describe('Enable MLD snooping'),
    dhcpL2RelayEnable: z.boolean().optional().describe('Enable DHCP L2 relay'),
    dhcpSettings: dhcpSettingsSchema.optional().describe('DHCP server settings, including the DNS servers clients receive'),
};

export type LanNetworkInput = z.infer<z.ZodObject<typeof lanNetworkFields>>;

/**
 * Translate tool input into the request body of POST/PATCH /sites/{siteId}/lan-networks (v2).
 * The tool keeps the friendlier `dhcpSettings` / `ipRangeStart` / `leaseTime` names and maps them onto the
 * controller's `dhcpSettingsVO` / `ipRangePool` / `leasetime` fields.
 */
export function buildLanNetworkBody(input: LanNetworkInput): Record<string, unknown> {
    const { dhcpSettings, ...rest } = input;
    const body: Record<string, unknown> = { ...rest };
    if (dhcpSettings) {
        body.dhcpSettingsVO = buildDhcpSettings(dhcpSettings);
    }
    return body;
}

function buildDhcpSettings(input: DhcpSettingsInput): Record<string, unknown> {
    const { ipRangeStart, ipRangeEnd, ipRangePool, leasetime, leaseTime, ...rest } = input;
    const settings: Record<string, unknown> = { ...rest };

    const pool = ipRangePool ?? (ipRangeStart && ipRangeEnd ? [{ ipaddrStart: ipRangeStart, ipaddrEnd: ipRangeEnd }] : undefined);
    if (pool) {
        settings.ipRangePool = pool;
    }

    const lease = leasetime ?? leaseTime;
    if (lease !== undefined) {
        settings.leasetime = lease;
    }

    if (settings.dhcpns === undefined && (rest.priDns || rest.sndDns)) {
        settings.dhcpns = 'manual';
    }
    return settings;
}
