import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActionOperations } from '../../src/omadaClient/action.js';
import type { RequestHandler } from '../../src/omadaClient/request.js';
import type { SiteOperations } from '../../src/omadaClient/site.js';
import type { OmadaApiResponse, OmadaDeviceInfo } from '../../src/types/index.js';

const ok: OmadaApiResponse<unknown> = { errorCode: 0, result: undefined };

describe('ActionOperations', () => {
    let actionOps: ActionOperations;
    let mockRequest: RequestHandler;
    let mockSite: SiteOperations;
    let findDevice: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockRequest = {
            get: vi.fn().mockResolvedValue(ok),
            post: vi.fn().mockResolvedValue(ok),
            patch: vi.fn().mockResolvedValue(ok),
            ensureSuccess: vi.fn((response: OmadaApiResponse<unknown>) => {
                if (response.errorCode === 0) {
                    return response.result;
                }
                throw new Error(response.msg ?? 'API Error');
            }),
        } as unknown as RequestHandler;

        mockSite = {
            resolveSiteId: vi.fn((siteId?: string) => siteId ?? 'default-site'),
        } as unknown as SiteOperations;

        findDevice = vi.fn();
        const buildPath = (path: string, version = 'v1') => `/openapi/${version}/test-omadac${path}`;
        actionOps = new ActionOperations(mockRequest, mockSite, buildPath, findDevice);
    });

    describe('adoptDevice', () => {
        it('posts to start-adopt with an empty body when no credentials are given', async () => {
            await actionOps.adoptDevice('AA-BB-CC-DD-EE-FF', 'site-1');

            expect(mockRequest.post).toHaveBeenCalledWith('/openapi/v1/test-omadac/sites/site-1/devices/AA-BB-CC-DD-EE-FF/start-adopt', {});
        });

        it('forwards adoption credentials', async () => {
            await actionOps.adoptDevice('AA-BB-CC-DD-EE-FF', 'site-1', { username: 'admin', password: 'secret' });

            expect(mockRequest.post).toHaveBeenCalledWith(expect.stringContaining('/start-adopt'), { username: 'admin', password: 'secret' });
        });
    });

    describe('setDeviceLed', () => {
        it('looks up the device family and patches its general-config', async () => {
            findDevice.mockResolvedValue({ mac: 'AA', type: 'ap' } as OmadaDeviceInfo);

            await actionOps.setDeviceLed('AA', 1, 'site-1');

            expect(findDevice).toHaveBeenCalledWith('AA', 'site-1');
            expect(mockRequest.patch).toHaveBeenCalledWith('/openapi/v1/test-omadac/sites/site-1/aps/AA/general-config', { ledSetting: 1 });
        });

        it('uses an explicit deviceType without a lookup', async () => {
            await actionOps.setDeviceLed('AA', 0, 'site-1', 'gateway');

            expect(findDevice).not.toHaveBeenCalled();
            expect(mockRequest.patch).toHaveBeenCalledWith('/openapi/v1/test-omadac/sites/site-1/gateways/AA/general-config', { ledSetting: 0 });
        });

        it('maps switches to the switches segment and uses the default site', async () => {
            findDevice.mockResolvedValue({ mac: 'AA', type: 'switch' } as OmadaDeviceInfo);

            await actionOps.setDeviceLed('AA', 2);

            expect(mockRequest.patch).toHaveBeenCalledWith('/openapi/v1/test-omadac/sites/default-site/switches/AA/general-config', {
                ledSetting: 2,
            });
        });

        it('rejects a device that is not in the site', async () => {
            findDevice.mockResolvedValue(undefined);

            await expect(actionOps.setDeviceLed('AA', 1)).rejects.toThrow('was not found');
            expect(mockRequest.patch).not.toHaveBeenCalled();
        });

        it('rejects device types without a general-config endpoint', async () => {
            findDevice.mockResolvedValue({ mac: 'AA', type: 'olt' } as OmadaDeviceInfo);

            await expect(actionOps.setDeviceLed('AA', 1)).rejects.toThrow('general-config');
        });
    });

    describe('getFirmwareDetails', () => {
        it('reads latest-firmware-info', async () => {
            vi.mocked(mockRequest.get).mockResolvedValue({ errorCode: 0, result: { curFwVer: '1.4.3' } });

            const result = await actionOps.getFirmwareDetails('AA', 'site-1');

            expect(mockRequest.get).toHaveBeenCalledWith('/openapi/v1/test-omadac/sites/site-1/devices/AA/latest-firmware-info');
            expect(result).toEqual({ curFwVer: '1.4.3' });
        });
    });

    describe('startFirmwareUpgrade', () => {
        it('posts to start-online-upgrade', async () => {
            await actionOps.startFirmwareUpgrade('AA', 'site-1');

            expect(mockRequest.post).toHaveBeenCalledWith('/openapi/v1/test-omadac/sites/site-1/devices/AA/start-online-upgrade', {});
        });
    });

    describe('updateClient', () => {
        it('renames through the name endpoint', async () => {
            const applied = await actionOps.updateClient('AA', { name: 'NAS' }, 'site-1');

            expect(mockRequest.patch).toHaveBeenCalledWith('/openapi/v1/test-omadac/sites/site-1/clients/AA/name', { name: 'NAS' });
            expect(applied).toEqual({ name: 'NAS' });
        });

        it('sends rate limits with the mode field the controller requires', async () => {
            const applied = await actionOps.updateClient('AA', { upLimit: 10, upUnit: 2, downLimit: 512 }, 'site-1');

            expect(mockRequest.patch).toHaveBeenCalledWith('/openapi/v1/test-omadac/sites/site-1/clients/AA/ratelimit', {
                mode: 0,
                enable: true,
                upEnable: true,
                downEnable: true,
                upLimit: 10,
                upUnit: 2,
                downLimit: 512,
                downUnit: 1,
            });
            expect(applied.rateLimit).toMatchObject({ enable: true });
        });

        it('disables the rate limit and honours an explicit mode', async () => {
            await actionOps.updateClient('AA', { rateLimitEnable: false, rateLimitMode: 1 }, 'site-1');

            expect(mockRequest.patch).toHaveBeenCalledWith(expect.stringContaining('/ratelimit'), {
                mode: 1,
                enable: false,
                upEnable: false,
                downEnable: false,
            });
        });

        it('reserves a fixed IP through clients/config, reading the network from the client', async () => {
            vi.mocked(mockRequest.get).mockResolvedValue({ errorCode: 0, result: { ipSetting: { netId: 'net-1' } } });

            await actionOps.updateClient('AA', { fixedIp: '10.0.0.5' }, 'site-1');

            expect(mockRequest.get).toHaveBeenCalledWith('/openapi/v1/test-omadac/sites/site-1/clients/AA');
            expect(mockRequest.post).toHaveBeenCalledWith('/openapi/v1/test-omadac/sites/site-1/clients/config', {
                macList: ['AA'],
                ipSetting: { useFixedAddr: true, netId: 'net-1', ipList: [{ mac: 'AA', ip: '10.0.0.5' }] },
            });
        });

        it('uses a supplied networkId without reading the client', async () => {
            await actionOps.updateClient('AA', { fixedIp: '10.0.0.5', networkId: 'net-9' }, 'site-1');

            expect(mockRequest.get).not.toHaveBeenCalled();
            expect(mockRequest.post).toHaveBeenCalledWith(
                expect.stringContaining('/clients/config'),
                expect.objectContaining({ ipSetting: expect.objectContaining({ netId: 'net-9' }) })
            );
        });

        it('releases a reservation', async () => {
            await actionOps.updateClient('AA', { useFixedAddr: false }, 'site-1');

            expect(mockRequest.post).toHaveBeenCalledWith(expect.stringContaining('/clients/config'), {
                macList: ['AA'],
                ipSetting: { useFixedAddr: false },
            });
        });

        it('requires fixedIp when reserving', async () => {
            await expect(actionOps.updateClient('AA', { useFixedAddr: true }, 'site-1')).rejects.toThrow('fixedIp is required');
        });

        it('fails when the client has no network to infer', async () => {
            vi.mocked(mockRequest.get).mockResolvedValue({ errorCode: 0, result: {} });

            await expect(actionOps.updateClient('AA', { fixedIp: '10.0.0.5' }, 'site-1')).rejects.toThrow('networkId is required');
        });

        it('rejects an empty update', async () => {
            await expect(actionOps.updateClient('AA', {}, 'site-1')).rejects.toThrow('nothing to update');
        });
    });

    describe('setGatewayWanConnect', () => {
        it('requires the internal API', async () => {
            await expect(actionOps.setGatewayWanConnect('AA', '2', 'connect', 'site-1')).rejects.toThrow('OMADA_WEB_USERNAME');
        });

        it('posts an internetState command over the internal API', async () => {
            const internal = { post: vi.fn().mockResolvedValue(ok), ensureSuccess: vi.fn((r: OmadaApiResponse<unknown>) => r.result) };
            actionOps.setInternalRequest(internal as never);

            await actionOps.setGatewayWanConnect('AA', '2', 'disconnect', 'site-1');

            expect(internal.post).toHaveBeenCalledWith('/sites/site-1/cmd/gateways/AA/internetState', { portId: 2, operation: 0 });
        });

        it('rejects a non-numeric port', async () => {
            actionOps.setInternalRequest({ post: vi.fn(), ensureSuccess: vi.fn() } as never);

            await expect(actionOps.setGatewayWanConnect('AA', 'wan2', 'connect', 'site-1')).rejects.toThrow('WAN port number');
        });
    });
});
