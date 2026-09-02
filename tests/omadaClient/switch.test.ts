import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RequestHandler } from '../../src/omadaClient/request.js';
import type { SiteOperations } from '../../src/omadaClient/site.js';
import { SwitchOperations } from '../../src/omadaClient/switch.js';
import type { OmadaApiResponse } from '../../src/types/index.js';

const ok: OmadaApiResponse<unknown> = { errorCode: 0, result: undefined };

describe('SwitchOperations', () => {
    let switchOps: SwitchOperations;
    let mockRequest: RequestHandler;

    beforeEach(() => {
        mockRequest = {
            put: vi.fn().mockResolvedValue(ok),
            ensureSuccess: vi.fn((response: OmadaApiResponse<unknown>) => {
                if (response.errorCode === 0) {
                    return response.result;
                }
                throw new Error(response.msg ?? 'API Error');
            }),
        } as unknown as RequestHandler;

        const mockSite = { resolveSiteId: vi.fn((siteId?: string) => siteId ?? 'default-site') } as unknown as SiteOperations;
        const buildPath = (path: string, version = 'v1') => `/openapi/${version}/test-omadac${path}`;
        switchOps = new SwitchOperations(mockRequest, mockSite, buildPath);
    });

    describe('updateSwitchPort', () => {
        const base = '/openapi/v1/test-omadac/sites/site-1/switches/AA/ports/3';

        it('fans out to the per-attribute endpoints in order', async () => {
            const applied = await switchOps.updateSwitchPort(
                'AA',
                3,
                { profileId: 'p1', profileOverrideEnable: true, poe: false, status: true, name: 'Uplink' },
                'site-1'
            );

            const calls = vi.mocked(mockRequest.put).mock.calls.map(([path, body]) => [String(path).replace(base, ''), body]);
            expect(calls).toEqual([
                ['/profile', { profileId: 'p1' }],
                ['/profile-override', { profileOverrideEnable: true }],
                ['/poe-mode', { poeMode: 0 }],
                ['/status', { status: 1 }],
                ['/name', { name: 'Uplink' }],
            ]);
            expect(applied).toEqual({ profileId: 'p1', profileOverrideEnable: true, poe: false, status: true, name: 'Uplink' });
        });

        it('writes only the supplied fields', async () => {
            const applied = await switchOps.updateSwitchPort('AA', 3, { poe: true }, 'site-1');

            expect(mockRequest.put).toHaveBeenCalledTimes(1);
            expect(mockRequest.put).toHaveBeenCalledWith(`${base}/poe-mode`, { poeMode: 1 });
            expect(applied).toEqual({ poe: true });
        });

        it('rejects an empty update without calling the controller', async () => {
            await expect(switchOps.updateSwitchPort('AA', 3, {}, 'site-1')).rejects.toThrow('nothing to update');
            expect(mockRequest.put).not.toHaveBeenCalled();
        });

        it('stops at the first failure', async () => {
            vi.mocked(mockRequest.put).mockResolvedValueOnce({ errorCode: -1001, msg: 'bad profile' });

            await expect(switchOps.updateSwitchPort('AA', 3, { profileId: 'nope', name: 'x' }, 'site-1')).rejects.toThrow('bad profile');
            expect(mockRequest.put).toHaveBeenCalledTimes(1);
        });
    });
});
