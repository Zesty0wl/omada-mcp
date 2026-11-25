import { describe, expect, it, vi } from 'vitest';

import { GenericOperations } from '../../src/omadaClient/generic.js';
import type { RequestHandler } from '../../src/omadaClient/request.js';
import type { SiteOperations } from '../../src/omadaClient/site.js';

function setup() {
    const request = { request: vi.fn().mockResolvedValue({ errorCode: 0 }) } as unknown as RequestHandler;
    const site = { resolveSiteId: vi.fn((siteId?: string) => siteId ?? 'default-site') } as unknown as SiteOperations;
    const buildPath = vi.fn((path: string, version = 'v1') => `/openapi/${version}/omadac${path}`);
    return { ops: new GenericOperations(request, buildPath, site), request };
}

describe('GenericOperations.genericApiCall', () => {
    it('replaces {siteId} with the configured site on every call', async () => {
        const { ops, request } = setup();

        await ops.genericApiCall('GET', '/sites/{siteId}/nat/port-forwardings');
        await ops.genericApiCall('GET', '/sites/{siteId}/nat/port-forwardings');

        expect(vi.mocked(request.request).mock.calls.map((call) => call[0].url)).toEqual([
            '/openapi/v1/omadac/sites/default-site/nat/port-forwardings',
            '/openapi/v1/omadac/sites/default-site/nat/port-forwardings',
        ]);
    });

    it('uses an explicit siteId when given', async () => {
        const { ops, request } = setup();

        await ops.genericApiCall('POST', '/sites/{siteId}/lan-networks', 'v2', { name: 'IoT' }, undefined, 'other');

        expect(request.request).toHaveBeenCalledWith({
            method: 'POST',
            url: '/openapi/v2/omadac/sites/other/lan-networks',
            data: { name: 'IoT' },
            params: undefined,
        });
    });

    it('leaves paths without the placeholder untouched', async () => {
        const { ops, request } = setup();

        await ops.genericApiCall('GET', '/sites/abc/devices');

        expect(vi.mocked(request.request).mock.calls[0]?.[0].url).toBe('/openapi/v1/omadac/sites/abc/devices');
    });
});
