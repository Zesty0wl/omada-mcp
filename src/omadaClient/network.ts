import type { OmadaApiResponse, PaginatedResult } from '../types/index.js';
import { logger } from '../utils/logger.js';

import type { InternalRequestHandler } from './internalRequest.js';
import type { RequestHandler } from './request.js';
import type { SiteOperations } from './site.js';

/**
 * Network-related operations for the Omada API.
 * Covers internet, LAN, WLAN, firewall, and port forwarding configurations.
 */
export class NetworkOperations {
    private internalRequest?: InternalRequestHandler;

    constructor(
        private readonly request: RequestHandler,
        private readonly site: SiteOperations,
        private readonly buildPath: (path: string, version?: string) => string
    ) {}

    /**
     * Set the internal request handler for web UI API access.
     * When configured, firewall ACL operations will use the internal API.
     */
    public setInternalRequest(internalRequest: InternalRequestHandler): void {
        this.internalRequest = internalRequest;
    }

    /**
     * Check whether the internal API is available for use.
     */
    private get hasInternalApi(): boolean {
        return this.internalRequest !== undefined;
    }

    /**
     * Get internet configuration info for a site.
     * OperationId: getInternet
     */
    public async getInternetInfo(siteId?: string): Promise<unknown> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/internet`);
        const response = await this.request.get<OmadaApiResponse<unknown>>(path);
        return this.request.ensureSuccess(response);
    }

    /**
     * Get port forwarding status for a specific type (User or UPnP).
     * OperationId: getPortForwardStatus
     *
     * @param type - Port forwarding type: 'User' or 'UPnP'
     * @param siteId - Optional site ID (uses default if not provided)
     * @param page - Page number (required by API, default: 1)
     * @param pageSize - Page size (required by API, range: 1-1000, default: 10)
     */
    public async getPortForwardingStatus(type: 'User' | 'UPnP', siteId?: string, page = 1, pageSize = 10): Promise<PaginatedResult<unknown>> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/insight/port-forwarding/${encodeURIComponent(type)}`);

        const response = await this.request.get<OmadaApiResponse<PaginatedResult<unknown>>>(path, {
            page,
            pageSize,
        });

        return this.request.ensureSuccess(response);
    }

    /**
     * Get LAN network list (v2 API) with pagination.
     * OperationId: getLanNetworkListV2
     */
    public async getLanNetworkList(siteId?: string): Promise<unknown[]> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/lan-networks`, 'v2');
        return await this.request.fetchPaginated<unknown>(path);
    }

    /**
     * Get LAN profile list with pagination.
     * OperationId: getLanProfileList
     */
    public async getLanProfileList(siteId?: string): Promise<unknown[]> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/lan-profiles`);
        return await this.request.fetchPaginated<unknown>(path);
    }

    /**
     * Get WLAN group list.
     * OperationId: getWlanGroupList
     */
    public async getWlanGroupList(siteId?: string): Promise<unknown[]> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/wireless-network/wlans`);
        const response = await this.request.get<OmadaApiResponse<unknown[]>>(path);
        return this.request.ensureSuccess(response);
    }

    /**
     * Get SSID list for a specific WLAN group.
     * OperationId: getSsidList
     *
     * @param wlanId - WLAN group ID (can be obtained from getWlanGroupList)
     */
    public async getSsidList(wlanId: string, siteId?: string): Promise<unknown[]> {
        if (!wlanId) {
            throw new Error('A wlanId must be provided. Use getWlanGroupList to get available WLAN group IDs.');
        }

        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/wireless-network/wlans/${encodeURIComponent(wlanId)}/ssids`);
        return await this.request.fetchPaginated<unknown>(path);
    }

    /**
     * Get detailed information for a specific SSID.
     * OperationId: getSsidDetail
     *
     * @param wlanId - WLAN group ID (can be obtained from getWlanGroupList)
     * @param ssidId - SSID ID (can be obtained from getSsidList)
     */
    public async getSsidDetail(wlanId: string, ssidId: string, siteId?: string): Promise<unknown> {
        if (!wlanId) {
            throw new Error('A wlanId must be provided. Use getWlanGroupList to get available WLAN group IDs.');
        }
        if (!ssidId) {
            throw new Error('An ssidId must be provided. Use getSsidList to get available SSID IDs.');
        }

        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = this.buildPath(
            `/sites/${encodeURIComponent(resolvedSiteId)}/wireless-network/wlans/${encodeURIComponent(wlanId)}/ssids/${encodeURIComponent(ssidId)}`
        );
        const response = await this.request.get<OmadaApiResponse<unknown>>(path);
        return this.request.ensureSuccess(response);
    }

    /**
     * Get firewall settings for a site.
     * OperationId: getFirewallSetting
     */
    public async getFirewallSetting(siteId?: string): Promise<unknown> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/firewall`);
        const response = await this.request.get<OmadaApiResponse<unknown>>(path);
        return this.request.ensureSuccess(response);
    }

    /**
     * Create a new LAN network (v2 API).
     */
    public async createLanNetwork(data: Record<string, unknown>, siteId?: string): Promise<unknown> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/lan-networks`, 'v2');
        const response = await this.request.post<OmadaApiResponse<unknown>>(path, data);
        return this.request.ensureSuccess(response);
    }

    /**
     * Update an existing LAN network (v2 API).
     */
    public async updateLanNetwork(networkId: string, data: Record<string, unknown>, siteId?: string): Promise<unknown> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/lan-networks/${encodeURIComponent(networkId)}`, 'v2');
        const response = await this.request.put<OmadaApiResponse<unknown>>(path, data);
        return this.request.ensureSuccess(response);
    }

    /**
     * Delete a LAN network (v2 API).
     */
    public async deleteLanNetwork(networkId: string, siteId?: string): Promise<unknown> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/lan-networks/${encodeURIComponent(networkId)}`, 'v2');
        const response = await this.request.delete<OmadaApiResponse<unknown>>(path);
        return this.request.ensureSuccess(response);
    }

    /**
     * Create a new LAN profile (v1 API).
     */
    public async createLanProfile(data: Record<string, unknown>, siteId?: string): Promise<unknown> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/lan-profiles`);
        const response = await this.request.post<OmadaApiResponse<unknown>>(path, data);
        return this.request.ensureSuccess(response);
    }

    /**
     * Update an existing LAN profile (v1 API).
     */
    public async updateLanProfile(profileId: string, data: Record<string, unknown>, siteId?: string): Promise<unknown> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/lan-profiles/${encodeURIComponent(profileId)}`);
        const response = await this.request.put<OmadaApiResponse<unknown>>(path, data);
        return this.request.ensureSuccess(response);
    }

    /**
     * Update firewall settings for a site (v1 API).
     */
    public async updateFirewallSetting(data: Record<string, unknown>, siteId?: string): Promise<unknown> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/firewall`);
        const response = await this.request.put<OmadaApiResponse<unknown>>(path, data);
        return this.request.ensureSuccess(response);
    }

    /**
     * Get paginated events for a site (v1 API).
     */
    public async listEvents(siteId?: string, page = 1, pageSize = 10): Promise<PaginatedResult<unknown>> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);

        if (this.hasInternalApi) {
            logger.info('Using internal API for listEvents');
            const path = `/sites/${encodeURIComponent(resolvedSiteId)}/events`;
            const response = await this.internalRequest!.get<OmadaApiResponse<PaginatedResult<unknown>>>(path, {
                currentPage: page,
                currentPageSize: pageSize,
            });
            return this.internalRequest!.ensureSuccess(response);
        }

        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/events`);
        const response = await this.request.get<OmadaApiResponse<PaginatedResult<unknown>>>(path, {
            page,
            pageSize,
        });
        return this.request.ensureSuccess(response);
    }

    /**
     * Get paginated logs for a site (v1 API).
     */
    public async listLogs(siteId?: string, page = 1, pageSize = 10): Promise<PaginatedResult<unknown>> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/logs`);
        const response = await this.request.get<OmadaApiResponse<PaginatedResult<unknown>>>(path, {
            page,
            pageSize,
        });
        return this.request.ensureSuccess(response);
    }

    /**
     * Get switch ports for a specific switch.
     *
     * Uses the internal web UI API when web credentials are configured. The Open API
     * switch port endpoints are absent on several controllers (OC200 firmware 6.2.x
     * returns -1600 "Unsupported request path"), so the internal API is preferred
     * whenever it is available.
     */
    public async getSwitchPorts(switchMac: string, siteId?: string): Promise<unknown> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);

        if (this.hasInternalApi) {
            logger.info('Using internal API for getSwitchPorts');
            const path = `/sites/${encodeURIComponent(resolvedSiteId)}/switches/${encodeURIComponent(switchMac)}/ports`;
            const response = await this.internalRequest!.get<OmadaApiResponse<unknown>>(path);
            return this.internalRequest!.ensureSuccess(response);
        }

        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/switches/${encodeURIComponent(switchMac)}/ports`);
        return await this.request.fetchPaginated<unknown>(path);
    }

    /**
     * Update a switch port configuration (v1 API).
     */
    public async updateSwitchPort(switchMac: string, portId: string, data: Record<string, unknown>, siteId?: string): Promise<unknown> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = this.buildPath(
            `/sites/${encodeURIComponent(resolvedSiteId)}/switches/${encodeURIComponent(switchMac)}/ports/${encodeURIComponent(portId)}`
        );
        const response = await this.request.request<OmadaApiResponse<unknown>>({ method: 'PATCH', url: path, data });
        return this.request.ensureSuccess(response);
    }

    /**
     * List firewall ACL rules for a site.
     * Uses the internal web UI API when web credentials are configured (required for OC200),
     * otherwise falls back to the Open API.
     */
    public async listFirewallAcls(siteId?: string): Promise<unknown> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);

        if (this.hasInternalApi) {
            logger.info('Using internal API for listFirewallAcls');
            const path = `/sites/${encodeURIComponent(resolvedSiteId)}/setting/firewall/acls`;
            const response = await this.internalRequest!.get<OmadaApiResponse<unknown>>(path, {
                type: 0,
                currentPage: 1,
                currentPageSize: 100,
            });
            return this.internalRequest!.ensureSuccess(response);
        }

        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/setting/firewall/acls`);
        return await this.request.fetchPaginated<unknown>(path);
    }

    /**
     * Create a firewall ACL rule.
     * Uses the internal web UI API when web credentials are configured (required for OC200),
     * otherwise falls back to the Open API.
     */
    public async createFirewallAcl(data: Record<string, unknown>, siteId?: string): Promise<unknown> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);

        if (this.hasInternalApi) {
            logger.info('Using internal API for createFirewallAcl');
            const path = `/sites/${encodeURIComponent(resolvedSiteId)}/setting/firewall/acls`;
            const response = await this.internalRequest!.post<OmadaApiResponse<unknown>>(path, data);
            return this.internalRequest!.ensureSuccess(response);
        }

        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/setting/firewall/acls`);
        const response = await this.request.post<OmadaApiResponse<unknown>>(path, data);
        return this.request.ensureSuccess(response);
    }

    /**
     * Delete a firewall ACL rule.
     * Uses the internal web UI API when web credentials are configured (required for OC200),
     * otherwise falls back to the Open API.
     */
    public async deleteFirewallAcl(aclId: string, siteId?: string): Promise<unknown> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);

        if (this.hasInternalApi) {
            logger.info('Using internal API for deleteFirewallAcl');
            const path = `/sites/${encodeURIComponent(resolvedSiteId)}/setting/firewall/acls/${encodeURIComponent(aclId)}`;
            const response = await this.internalRequest!.delete<OmadaApiResponse<unknown>>(path);
            return this.internalRequest!.ensureSuccess(response);
        }

        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/setting/firewall/acls/${encodeURIComponent(aclId)}`);
        const response = await this.request.delete<OmadaApiResponse<unknown>>(path);
        return this.request.ensureSuccess(response);
    }

    /**
     * List IP/Port groups for a site (internal API only).
     * These groups can be used as source/destination in firewall ACL rules.
     * Requires OMADA_WEB_USERNAME and OMADA_WEB_PASSWORD to be configured.
     */
    public async listIpGroups(siteId?: string): Promise<unknown> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);

        if (!this.hasInternalApi) {
            throw new Error(
                'listIpGroups requires the internal web UI API. ' +
                    'Set OMADA_WEB_USERNAME and OMADA_WEB_PASSWORD environment variables to enable it.'
            );
        }

        const path = `/sites/${encodeURIComponent(resolvedSiteId)}/setting/profiles/groups`;
        const response = await this.internalRequest!.get<OmadaApiResponse<unknown>>(path, {
            currentPage: 1,
            currentPageSize: 100,
        });
        return this.internalRequest!.ensureSuccess(response);
    }

    /**
     * List static routes for a site (v1 API).
     */
    public async listRoutes(siteId?: string): Promise<unknown[]> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/setting/routes`);
        return await this.request.fetchPaginated<unknown>(path);
    }
}
