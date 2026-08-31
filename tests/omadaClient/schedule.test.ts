import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { InternalRequestHandler } from '../../src/omadaClient/internalRequest.js';
import { ScheduleOperations } from '../../src/omadaClient/schedule.js';
import type { SiteOperations } from '../../src/omadaClient/site.js';
import type { OmadaApiResponse } from '../../src/types/index.js';

describe('ScheduleOperations', () => {
    let scheduleOps: ScheduleOperations;
    let mockInternal: InternalRequestHandler;
    let mockSite: SiteOperations;

    const ok = <T>(result: T): OmadaApiResponse<T> => ({ errorCode: 0, result });

    beforeEach(() => {
        mockInternal = {
            get: vi.fn(),
            post: vi.fn(),
            put: vi.fn(),
            patch: vi.fn(),
            delete: vi.fn(),
            ensureSuccess: vi.fn((response: OmadaApiResponse<unknown>) => {
                if (response.errorCode === 0) {
                    return response.result;
                }
                throw new Error(response.msg ?? 'Internal API request failed');
            }),
        } as unknown as InternalRequestHandler;

        mockSite = {
            resolveSiteId: vi.fn((siteId?: string) => siteId ?? 'default-site'),
        } as unknown as SiteOperations;

        scheduleOps = new ScheduleOperations(mockSite);
    });

    describe('without web credentials', () => {
        it('reports the internal API as unavailable', () => {
            expect(scheduleOps.hasInternalApi).toBe(false);
        });

        it.each([
            ['listRebootSchedules', () => scheduleOps.listRebootSchedules()],
            ['listPoeSchedules', () => scheduleOps.listPoeSchedules()],
            ['listTimeRanges', () => scheduleOps.listTimeRanges()],
            ['getSiteSettings', () => scheduleOps.getSiteSettings()],
        ])('%s throws an error naming the required env vars', async (_name, call) => {
            await expect(call()).rejects.toThrow(/OMADA_WEB_USERNAME and OMADA_WEB_PASSWORD/);
        });
    });

    describe('with web credentials', () => {
        beforeEach(() => {
            scheduleOps.setInternalRequest(mockInternal);
        });

        it('reports the internal API as available', () => {
            expect(scheduleOps.hasInternalApi).toBe(true);
        });

        it('lists reboot schedules from the service collection', async () => {
            const schedules = { totalRows: 1, data: [{ id: 'abc', name: 'Weekly' }] };
            vi.mocked(mockInternal.get).mockResolvedValue(ok(schedules));

            const result = await scheduleOps.listRebootSchedules('site-123');

            expect(mockInternal.get).toHaveBeenCalledWith('/sites/site-123/setting/service/rebootSchedules', {
                currentPage: 1,
                currentPageSize: 100,
            });
            expect(result).toEqual(schedules);
        });

        it('falls back to the default site when none is given', async () => {
            vi.mocked(mockInternal.get).mockResolvedValue(ok({ data: [] }));

            await scheduleOps.listPoeSchedules();

            expect(mockSite.resolveSiteId).toHaveBeenCalledWith(undefined);
            expect(mockInternal.get).toHaveBeenCalledWith('/sites/default-site/setting/service/poeSchedules', expect.any(Object));
        });

        it('creates a reboot schedule with POST', async () => {
            vi.mocked(mockInternal.post).mockResolvedValue(ok({ id: 'new-id' }));
            const body = { name: 'Weekly', status: true, deviceMacs: ['AA-BB-CC-DD-EE-FF'] };

            await scheduleOps.createRebootSchedule(body, 'site-123');

            expect(mockInternal.post).toHaveBeenCalledWith('/sites/site-123/setting/service/rebootSchedules', body);
        });

        it('updates a reboot schedule with PUT and the id appended', async () => {
            vi.mocked(mockInternal.put).mockResolvedValue(ok({}));

            await scheduleOps.updateRebootSchedule('sched-1', { name: 'Renamed' }, 'site-123');

            expect(mockInternal.put).toHaveBeenCalledWith('/sites/site-123/setting/service/rebootSchedules/sched-1', {
                name: 'Renamed',
            });
        });

        it('deletes a reboot schedule with DELETE', async () => {
            vi.mocked(mockInternal.delete).mockResolvedValue(ok({}));

            await scheduleOps.deleteRebootSchedule('sched-1', 'site-123');

            expect(mockInternal.delete).toHaveBeenCalledWith('/sites/site-123/setting/service/rebootSchedules/sched-1');
        });

        it('encodes ids that contain URL-unsafe characters', async () => {
            vi.mocked(mockInternal.delete).mockResolvedValue(ok({}));

            await scheduleOps.deletePoeSchedule('a/b c', 'site-123');

            expect(mockInternal.delete).toHaveBeenCalledWith('/sites/site-123/setting/service/poeSchedules/a%2Fb%20c');
        });

        it('reads time ranges from the profiles collection', async () => {
            vi.mocked(mockInternal.get).mockResolvedValue(ok({ data: [] }));

            await scheduleOps.listTimeRanges('site-123');

            expect(mockInternal.get).toHaveBeenCalledWith('/sites/site-123/setting/profiles/timeranges', expect.any(Object));
        });

        it('propagates controller errors', async () => {
            vi.mocked(mockInternal.get).mockResolvedValue({ errorCode: -1600, msg: 'Unsupported request path.' });

            await expect(scheduleOps.listRebootSchedules('site-123')).rejects.toThrow('Unsupported request path.');
        });

        describe('setSiteTimeZone', () => {
            it('sends region and scenario alongside timeZone', async () => {
                // The controller validates the `site` block as a unit and rejects a lone
                // timeZone with -1001 "Parameter [region] is null".
                vi.mocked(mockInternal.get).mockResolvedValue(
                    ok({ site: { timeZone: 'UTC', region: 'United Kingdom', scenario: 'Home', key: 'site-123' } })
                );
                vi.mocked(mockInternal.patch).mockResolvedValue(ok({}));

                await scheduleOps.setSiteTimeZone('Europe/London', 'site-123');

                expect(mockInternal.patch).toHaveBeenCalledWith('/sites/site-123/setting', {
                    site: { timeZone: 'Europe/London', region: 'United Kingdom', scenario: 'Home' },
                });
            });

            it('does not send unrelated site fields back', async () => {
                vi.mocked(mockInternal.get).mockResolvedValue(
                    ok({ site: { timeZone: 'UTC', region: 'United Kingdom', scenario: 'Home', ntpEnable: true } })
                );
                vi.mocked(mockInternal.patch).mockResolvedValue(ok({}));

                await scheduleOps.setSiteTimeZone('Europe/London');

                const [, body] = vi.mocked(mockInternal.patch).mock.calls[0] as [string, { site: Record<string, unknown> }];
                expect(Object.keys(body.site).sort()).toEqual(['region', 'scenario', 'timeZone']);
            });

            it('tolerates a settings payload with no site block', async () => {
                vi.mocked(mockInternal.get).mockResolvedValue(ok({}));
                vi.mocked(mockInternal.patch).mockResolvedValue(ok({}));

                await scheduleOps.setSiteTimeZone('Europe/London', 'site-123');

                expect(mockInternal.patch).toHaveBeenCalledWith('/sites/site-123/setting', {
                    site: { timeZone: 'Europe/London', region: undefined, scenario: undefined },
                });
            });
        });

        it('patches only the supplied site settings sections', async () => {
            vi.mocked(mockInternal.patch).mockResolvedValue(ok({}));

            await scheduleOps.updateSiteSettings({ airtimeFairness: { enable5g: true } }, 'site-123');

            expect(mockInternal.patch).toHaveBeenCalledWith('/sites/site-123/setting', {
                airtimeFairness: { enable5g: true },
            });
        });
    });
});
