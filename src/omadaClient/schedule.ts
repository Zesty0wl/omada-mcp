import type { OmadaApiResponse, PaginatedResult } from '../types/index.js';
import { logger } from '../utils/logger.js';

import type { InternalRequestHandler } from './internalRequest.js';
import type { SiteOperations } from './site.js';

/**
 * Scheduling and site-level settings operations.
 *
 * Every endpoint in this module lives on the Omada internal (web UI) API. The
 * public Open API does not expose reboot schedules, PoE schedules, time ranges
 * or site settings on any controller tested (verified against OC200 firmware
 * 6.2.14.12, where the equivalent Open API paths return -1600 "Unsupported
 * request path"). These therefore require OMADA_WEB_USERNAME and
 * OMADA_WEB_PASSWORD to be configured.
 */
export class ScheduleOperations {
    private internalRequest?: InternalRequestHandler;

    constructor(private readonly site: SiteOperations) {}

    /**
     * Set the internal request handler for web UI API access.
     */
    public setInternalRequest(internalRequest: InternalRequestHandler): void {
        this.internalRequest = internalRequest;
    }

    /**
     * Check whether the internal API is available for use.
     */
    public get hasInternalApi(): boolean {
        return this.internalRequest !== undefined;
    }

    /**
     * Throw a consistent, actionable error when web credentials are missing.
     */
    private requireInternal(operation: string): InternalRequestHandler {
        if (!this.internalRequest) {
            throw new Error(
                `${operation} requires the internal web UI API. ` +
                    'Set OMADA_WEB_USERNAME and OMADA_WEB_PASSWORD environment variables to enable it.'
            );
        }

        return this.internalRequest;
    }

    /**
     * Build the site-scoped internal path for a service settings collection.
     */
    private servicePath(siteId: string | undefined, collection: string, id?: string): string {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const base = `/sites/${encodeURIComponent(resolvedSiteId)}/setting/service/${collection}`;
        return id ? `${base}/${encodeURIComponent(id)}` : base;
    }

    // ---------------------------------------------------------------- reboot

    /**
     * List reboot schedules for a site.
     */
    public async listRebootSchedules(siteId?: string): Promise<PaginatedResult<unknown>> {
        const req = this.requireInternal('listRebootSchedules');
        logger.info('Using internal API for listRebootSchedules');
        const response = await req.get<OmadaApiResponse<PaginatedResult<unknown>>>(this.servicePath(siteId, 'rebootSchedules'), {
            currentPage: 1,
            currentPageSize: 100,
        });
        return req.ensureSuccess(response);
    }

    /**
     * Create a reboot schedule.
     *
     * @param data - Schedule body. Shape: { name, status, occurrence: { timingType, hour,
     *   minute, dayOfWeek, dayOfMonth, monthOfYear }, deviceMacs: string[], oswStackIds: string[] }.
     *   timingType 1 = daily, 2 = weekly, 3 = monthly. dayOfWeek is 0 (Sun) to 6 (Sat).
     */
    public async createRebootSchedule(data: Record<string, unknown>, siteId?: string): Promise<unknown> {
        const req = this.requireInternal('createRebootSchedule');
        const response = await req.post<OmadaApiResponse<unknown>>(this.servicePath(siteId, 'rebootSchedules'), data);
        return req.ensureSuccess(response);
    }

    /**
     * Update an existing reboot schedule. The controller expects a full object (PUT).
     */
    public async updateRebootSchedule(scheduleId: string, data: Record<string, unknown>, siteId?: string): Promise<unknown> {
        const req = this.requireInternal('updateRebootSchedule');
        const response = await req.put<OmadaApiResponse<unknown>>(this.servicePath(siteId, 'rebootSchedules', scheduleId), data);
        return req.ensureSuccess(response);
    }

    /**
     * Delete a reboot schedule.
     */
    public async deleteRebootSchedule(scheduleId: string, siteId?: string): Promise<unknown> {
        const req = this.requireInternal('deleteRebootSchedule');
        const response = await req.delete<OmadaApiResponse<unknown>>(this.servicePath(siteId, 'rebootSchedules', scheduleId));
        return req.ensureSuccess(response);
    }

    // ------------------------------------------------------------------- PoE

    /**
     * List PoE schedules for a site.
     */
    public async listPoeSchedules(siteId?: string): Promise<PaginatedResult<unknown>> {
        const req = this.requireInternal('listPoeSchedules');
        const response = await req.get<OmadaApiResponse<PaginatedResult<unknown>>>(this.servicePath(siteId, 'poeSchedules'), {
            currentPage: 1,
            currentPageSize: 100,
        });
        return req.ensureSuccess(response);
    }

    /**
     * Create a PoE schedule. PoE schedules bind a time range profile to switch ports,
     * cutting and restoring power on the schedule.
     */
    public async createPoeSchedule(data: Record<string, unknown>, siteId?: string): Promise<unknown> {
        const req = this.requireInternal('createPoeSchedule');
        const response = await req.post<OmadaApiResponse<unknown>>(this.servicePath(siteId, 'poeSchedules'), data);
        return req.ensureSuccess(response);
    }

    /**
     * Update an existing PoE schedule.
     */
    public async updatePoeSchedule(scheduleId: string, data: Record<string, unknown>, siteId?: string): Promise<unknown> {
        const req = this.requireInternal('updatePoeSchedule');
        const response = await req.put<OmadaApiResponse<unknown>>(this.servicePath(siteId, 'poeSchedules', scheduleId), data);
        return req.ensureSuccess(response);
    }

    /**
     * Delete a PoE schedule.
     */
    public async deletePoeSchedule(scheduleId: string, siteId?: string): Promise<unknown> {
        const req = this.requireInternal('deletePoeSchedule');
        const response = await req.delete<OmadaApiResponse<unknown>>(this.servicePath(siteId, 'poeSchedules', scheduleId));
        return req.ensureSuccess(response);
    }

    // ------------------------------------------------------------ time ranges

    /**
     * List time range profiles. These are the reusable schedule primitive that PoE
     * schedules, WLAN schedules and ACL rules bind to.
     */
    public async listTimeRanges(siteId?: string): Promise<unknown> {
        const req = this.requireInternal('listTimeRanges');
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const response = await req.get<OmadaApiResponse<unknown>>(`/sites/${encodeURIComponent(resolvedSiteId)}/setting/profiles/timeranges`, {
            currentPage: 1,
            currentPageSize: 100,
        });
        return req.ensureSuccess(response);
    }

    // --------------------------------------------------------- site settings

    /**
     * Get the full site settings object (timezone, mesh, band steering, roaming,
     * airtime fairness, LED, auto-upgrade and more).
     */
    public async getSiteSettings(siteId?: string): Promise<Record<string, unknown>> {
        const req = this.requireInternal('getSiteSettings');
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const response = await req.get<OmadaApiResponse<Record<string, unknown>>>(`/sites/${encodeURIComponent(resolvedSiteId)}/setting`);
        return req.ensureSuccess(response);
    }

    /**
     * Patch site settings. Only the sections included in `data` are modified.
     *
     * Note: the controller validates the `site` section as a unit. When changing any
     * field inside `site`, `region` and `scenario` must be sent alongside it or the
     * request fails with -1001. Use setSiteTimeZone() which handles this for you.
     */
    public async updateSiteSettings(data: Record<string, unknown>, siteId?: string): Promise<unknown> {
        const req = this.requireInternal('updateSiteSettings');
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const response = await req.patch<OmadaApiResponse<unknown>>(`/sites/${encodeURIComponent(resolvedSiteId)}/setting`, data);
        return req.ensureSuccess(response);
    }

    /**
     * Set the site timezone, preserving the region and scenario the controller requires.
     *
     * Controllers left on "UTC" run scheduled tasks an hour early during British Summer
     * Time (and equivalently in other DST regions), so an IANA zone such as
     * "Europe/London" is almost always what you want.
     */
    public async setSiteTimeZone(timeZone: string, siteId?: string): Promise<unknown> {
        const current = await this.getSiteSettings(siteId);
        const site = (current.site ?? {}) as Record<string, unknown>;

        return await this.updateSiteSettings(
            {
                site: {
                    timeZone,
                    region: site.region,
                    scenario: site.scenario,
                },
            },
            siteId
        );
    }
}
