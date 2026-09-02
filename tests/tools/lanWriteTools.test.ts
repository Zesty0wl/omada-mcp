import { describe, expect, it, vi } from 'vitest';

type Handler = (args: Record<string, unknown>, extra: unknown) => Promise<unknown>;

/** Registers a tool against a fake server, invokes its handler with `args`, and returns the mock client. */
async function invoke(register: (server: never, client: never) => void, method: string, args: Record<string, unknown>) {
    const mockClient = { [method]: vi.fn().mockResolvedValue({ id: 'new' }) };
    let pending: Promise<unknown> | undefined;
    const mockServer = {
        registerTool: vi.fn((_name: string, _schema: unknown, handler: Handler) => {
            pending = handler(args, {});
        }),
    };
    register(mockServer as never, mockClient as never);
    await pending;
    return mockClient;
}

describe('LAN network write tools', () => {
    it('createLanNetwork maps dhcpSettings onto dhcpSettingsVO with a pool, DNS and lease time in minutes', async () => {
        const { registerCreateLanNetworkTool } = await import('../../src/tools/createLanNetwork.js');

        const client = await invoke(registerCreateLanNetworkTool, 'createLanNetwork', {
            siteId: 's',
            name: 'IoT',
            purpose: 1,
            vlan: 30,
            gatewaySubnet: '10.0.30.1/24',
            igmpSnoopEnable: false,
            dhcpSettings: {
                enable: true,
                ipRangeStart: '10.0.30.100',
                ipRangeEnd: '10.0.30.200',
                priDns: '1.1.1.1',
                sndDns: '1.0.0.1',
                leaseTime: 120,
            },
        });

        expect(client.createLanNetwork).toHaveBeenCalledWith(
            {
                name: 'IoT',
                purpose: 1,
                vlan: 30,
                gatewaySubnet: '10.0.30.1/24',
                igmpSnoopEnable: false,
                dhcpSettingsVO: {
                    enable: true,
                    ipRangePool: [{ ipaddrStart: '10.0.30.100', ipaddrEnd: '10.0.30.200' }],
                    dhcpns: 'manual',
                    priDns: '1.1.1.1',
                    sndDns: '1.0.0.1',
                    leasetime: 120,
                },
            },
            's'
        );
    });

    it('updateLanNetwork keeps an explicit pool and dhcpns and passes the network ID through', async () => {
        const { registerUpdateLanNetworkTool } = await import('../../src/tools/updateLanNetwork.js');

        const client = await invoke(registerUpdateLanNetworkTool, 'updateLanNetwork', {
            networkId: 'net-1',
            name: 'Default',
            purpose: 1,
            vlan: 1,
            igmpSnoopEnable: false,
            dhcpSettings: { enable: true, ipRangePool: [{ ipaddrStart: '10.0.0.50', ipaddrEnd: '10.0.0.254' }], dhcpns: 'auto', leasetime: 60 },
        });

        expect(client.updateLanNetwork).toHaveBeenCalledWith(
            'net-1',
            expect.objectContaining({
                dhcpSettingsVO: { enable: true, ipRangePool: [{ ipaddrStart: '10.0.0.50', ipaddrEnd: '10.0.0.254' }], dhcpns: 'auto', leasetime: 60 },
            }),
            undefined
        );
    });

    it('omits dhcpSettingsVO when no DHCP settings are given', async () => {
        const { registerCreateLanNetworkTool } = await import('../../src/tools/createLanNetwork.js');

        const client = await invoke(registerCreateLanNetworkTool, 'createLanNetwork', { name: 'Vlan', purpose: 0, vlan: 40, igmpSnoopEnable: true });

        expect(client.createLanNetwork).toHaveBeenCalledWith({ name: 'Vlan', purpose: 0, vlan: 40, igmpSnoopEnable: true }, undefined);
    });
});

describe('LAN profile write tools', () => {
    it('createLanProfile maps a boolean poe onto the controller enum', async () => {
        const { registerCreateLanProfileTool } = await import('../../src/tools/createLanProfile.js');

        const client = await invoke(registerCreateLanProfileTool, 'createLanProfile', {
            siteId: 's',
            name: 'Cameras',
            nativeNetworkId: 'net-1',
            tagNetworkIds: [],
            poe: true,
            dot1x: 1,
            bandWidthCtrlType: 0,
            spanningTreeEnable: false,
            loopbackDetectEnable: true,
            portIsolationEnable: false,
            lldpMedEnable: true,
        });

        expect(client.createLanProfile).toHaveBeenCalledWith(expect.objectContaining({ name: 'Cameras', poe: 0, dot1x: 1 }), 's');
    });

    it('updateLanProfile passes a numeric poe through and false as off', async () => {
        const { registerUpdateLanProfileTool } = await import('../../src/tools/updateLanProfile.js');

        const client = await invoke(registerUpdateLanProfileTool, 'updateLanProfile', { profileId: 'p1', name: 'A', nativeNetworkId: 'n', poe: 2 });
        expect(client.updateLanProfile).toHaveBeenCalledWith('p1', expect.objectContaining({ poe: 2 }), undefined);

        const client2 = await invoke(registerUpdateLanProfileTool, 'updateLanProfile', {
            profileId: 'p1',
            name: 'A',
            nativeNetworkId: 'n',
            poe: false,
        });
        expect(client2.updateLanProfile).toHaveBeenCalledWith('p1', expect.objectContaining({ poe: 1 }), undefined);
    });
});

describe('updateSwitchPort tool', () => {
    it('converts portId to a number and forwards the supported fields', async () => {
        const { registerUpdateSwitchPortTool } = await import('../../src/tools/updateSwitchPort.js');

        const client = await invoke(registerUpdateSwitchPortTool, 'updateSwitchPort', { switchMac: 'AA', portId: '7', poe: false, name: 'Cam' });

        expect(client.updateSwitchPort).toHaveBeenCalledWith(
            'AA',
            7,
            { profileId: undefined, profileOverrideEnable: undefined, poe: false, status: undefined, name: 'Cam' },
            undefined
        );
    });

    it('refuses profile-only fields before calling the controller', async () => {
        const { registerUpdateSwitchPortTool } = await import('../../src/tools/updateSwitchPort.js');

        const mockClient = { updateSwitchPort: vi.fn() };
        let pending: Promise<unknown> | undefined;
        const mockServer = {
            registerTool: vi.fn((_name: string, _schema: unknown, handler: Handler) => {
                pending = handler({ switchMac: 'AA', port: 1, spanningTreeEnable: true }, {});
            }),
        };
        registerUpdateSwitchPortTool(mockServer as never, mockClient as never);

        await expect(pending).rejects.toThrow('spanningTreeEnable');
        expect(mockClient.updateSwitchPort).not.toHaveBeenCalled();
    });
});
