import { describe, expect, it, vi } from 'vitest';

type Handler = (args: Record<string, unknown>, extra: unknown) => Promise<unknown>;

/** Registers a tool against a fake server, invokes its handler with `args`, and returns the mock client and result. */
async function invoke(register: (server: never, client: never) => void, client: Record<string, unknown>, args: Record<string, unknown>) {
    let pending: Promise<unknown> | undefined;
    const mockServer = {
        registerTool: vi.fn((_name: string, _schema: unknown, handler: Handler) => {
            pending = handler(args, {});
        }),
    };
    register(mockServer as never, client as never);
    return await pending;
}

const existingRule = {
    id: 'pf-1',
    site: 'site-1',
    name: 'Plex',
    status: true,
    from: 0,
    interfaceWanPortId: ['2_wan'],
    externalPort: '32400',
    forwardIp: '192.168.1.10',
    forwardPort: '32400',
    protocol: 1,
    existWanIp: false,
    existVirtualWan: false,
    dMZ: false,
};

describe('port forwarding write tools', () => {
    it('createPortForwarding fills the flags the controller requires', async () => {
        const { registerCreatePortForwardingTool } = await import('../../src/tools/createPortForwarding.js');
        const client = { createPortForwarding: vi.fn().mockResolvedValue({}) };

        await invoke(registerCreatePortForwardingTool, client, {
            siteId: 's',
            name: 'Plex',
            status: true,
            interfaceWanPortId: ['2_wan'],
            externalPort: '32400',
            forwardIp: '192.168.1.10',
            forwardPort: '32400',
            protocol: 1,
        });

        expect(client.createPortForwarding).toHaveBeenCalledWith(
            {
                name: 'Plex',
                status: true,
                from: 0,
                dMZ: false,
                existWanIp: false,
                existVirtualWan: false,
                interfaceWanPortId: ['2_wan'],
                externalPort: '32400',
                forwardIp: '192.168.1.10',
                forwardPort: '32400',
                protocol: 1,
            },
            's'
        );
    });

    it('updatePortForwarding merges changes into the current rule and drops read-only fields', async () => {
        const { registerUpdatePortForwardingTool } = await import('../../src/tools/updatePortForwarding.js');
        const client = {
            listPortForwardings: vi.fn().mockResolvedValue([existingRule]),
            updatePortForwarding: vi.fn().mockResolvedValue({}),
        };

        await invoke(registerUpdatePortForwardingTool, client, { portForwardingId: 'pf-1', status: false });

        const { id: _id, site: _site, ...rest } = existingRule;
        expect(client.listPortForwardings).toHaveBeenCalledWith(undefined);
        expect(client.updatePortForwarding).toHaveBeenCalledWith('pf-1', { ...rest, status: false }, undefined);
    });

    it('updatePortForwarding drops limitedAddresses when the source restriction is removed', async () => {
        const { registerUpdatePortForwardingTool } = await import('../../src/tools/updatePortForwarding.js');
        const client = {
            listPortForwardings: vi.fn().mockResolvedValue([{ ...existingRule, from: 1, limitedAddresses: ['203.0.113.0/24'] }]),
            updatePortForwarding: vi.fn().mockResolvedValue({}),
        };

        await invoke(registerUpdatePortForwardingTool, client, { portForwardingId: 'pf-1', from: 0 });

        const body = client.updatePortForwarding.mock.calls[0]?.[1] as Record<string, unknown>;
        expect(body['from']).toBe(0);
        expect(body).not.toHaveProperty('limitedAddresses');
    });

    it('updatePortForwarding reports an unknown rule id instead of writing', async () => {
        const { registerUpdatePortForwardingTool } = await import('../../src/tools/updatePortForwarding.js');
        const client = {
            listPortForwardings: vi.fn().mockResolvedValue([existingRule]),
            updatePortForwarding: vi.fn(),
        };

        await expect(invoke(registerUpdatePortForwardingTool, client, { portForwardingId: 'missing', status: false })).rejects.toThrow(
            'Port forwarding rule missing not found'
        );
        expect(client.updatePortForwarding).not.toHaveBeenCalled();
    });

    it('deletePortForwarding passes the rule id and site through', async () => {
        const { registerDeletePortForwardingTool } = await import('../../src/tools/deletePortForwarding.js');
        const client = { deletePortForwarding: vi.fn().mockResolvedValue({}) };

        await invoke(registerDeletePortForwardingTool, client, { siteId: 's', portForwardingId: 'pf-1' });

        expect(client.deletePortForwarding).toHaveBeenCalledWith('pf-1', 's');
    });
});
