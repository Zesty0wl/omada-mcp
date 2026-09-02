import type { OmadaApiResponse, OmadaDeviceInfo, UpdateClientInput } from '../types/index.js';

import type { InternalRequestHandler } from './internalRequest.js';
import type { RequestHandler } from './request.js';
import type { SiteOperations } from './site.js';

/** Login for a device that still carries non-default credentials at adoption time. */
export interface AdoptCredentials {
    username?: string;
    password?: string;
}

/** Device families that have their own `general-config` endpoint. */
export type DeviceKind = 'ap' | 'switch' | 'gateway';

/** Resolves a device by MAC or ID within a site. The facade supplies DeviceOperations.getDevice. */
export type DeviceLookup = (identifier: string, siteId?: string) => Promise<OmadaDeviceInfo | undefined>;

/** URL segment of each device family's general-config endpoint. */
const GENERAL_CONFIG_SEGMENT: Record<DeviceKind, string> = {
    ap: 'aps',
    switch: 'switches',
    gateway: 'gateways',
};

/**
 * Sent as `mode` on PATCH /clients/{mac}/ratelimit. Firmware 6.2.14.12 rejects a body without it
 * ("Parameter [mode] could not be null") although the Open API document does not list the field
 * or its values. Callers can override it with `rateLimitMode`.
 */
const DEFAULT_RATE_LIMIT_MODE = 0;

interface ClientDetail {
    ipSetting?: { netId?: string };
}

/**
 * Device and client action operations for the Omada API.
 * Covers reboot, adopt, block/unblock, LED, firmware and client settings.
 */
export class ActionOperations {
    private internalRequest?: InternalRequestHandler;

    constructor(
        private readonly request: RequestHandler,
        private readonly site: SiteOperations,
        private readonly buildPath: (path: string, version?: string) => string,
        private readonly findDevice: DeviceLookup
    ) {}

    /**
     * Set the internal request handler for web UI API access (needed for WAN connect/disconnect).
     */
    public setInternalRequest(internalRequest: InternalRequestHandler): void {
        this.internalRequest = internalRequest;
    }

    /**
     * Reboot a device by MAC address (v1 API).
     */
    public async rebootDevice(deviceMac: string, siteId?: string): Promise<unknown> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/devices/${encodeURIComponent(deviceMac)}/reboot`);
        const response = await this.request.post<OmadaApiResponse<unknown>>(path, {});
        return this.request.ensureSuccess(response);
    }

    /**
     * Adopt a pending device by MAC address (v1 API).
     * OperationId: adoptDevice — POST /sites/{siteId}/devices/{deviceMac}/start-adopt.
     * The previous `/cmd/adopts` path returns -1600.
     */
    public async adoptDevice(deviceMac: string, siteId?: string, credentials: AdoptCredentials = {}): Promise<unknown> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/devices/${encodeURIComponent(deviceMac)}/start-adopt`);
        const body: Record<string, string> = {};
        if (credentials.username) {
            body.username = credentials.username;
        }
        if (credentials.password) {
            body.password = credentials.password;
        }
        const response = await this.request.post<OmadaApiResponse<unknown>>(path, body);
        return this.request.ensureSuccess(response);
    }

    /**
     * Block a client by MAC address (v1 API).
     */
    public async blockClient(clientMac: string, siteId?: string): Promise<unknown> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/clients/${encodeURIComponent(clientMac)}/block`);
        const response = await this.request.post<OmadaApiResponse<unknown>>(path, {});
        return this.request.ensureSuccess(response);
    }

    /**
     * Unblock a client by MAC address (v1 API).
     */
    public async unblockClient(clientMac: string, siteId?: string): Promise<unknown> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/clients/${encodeURIComponent(clientMac)}/unblock`);
        const response = await this.request.post<OmadaApiResponse<unknown>>(path, {});
        return this.request.ensureSuccess(response);
    }

    /**
     * Reconnect a client by MAC address (v1 API).
     */
    public async reconnectClient(clientMac: string, siteId?: string): Promise<unknown> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/clients/${encodeURIComponent(clientMac)}/reconnect`);
        const response = await this.request.post<OmadaApiResponse<unknown>>(path, {});
        return this.request.ensureSuccess(response);
    }

    /**
     * Update a client's settings (v1 API).
     *
     * There is no single "modify client" endpoint — `PATCH /clients/{mac}` returns -1600 — so each
     * group of fields goes to its own route: name → PATCH /clients/{mac}/name (updateClientName),
     * fixed IP → POST /clients/config (batchModifyClientSetting), rate limit →
     * PATCH /clients/{mac}/ratelimit (updateClientRateLimitSetting). Returns the groups applied.
     */
    public async updateClient(clientMac: string, input: UpdateClientInput, siteId?: string): Promise<Record<string, unknown>> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const clientBase = `/sites/${encodeURIComponent(resolvedSiteId)}/clients/${encodeURIComponent(clientMac)}`;
        const applied: Record<string, unknown> = {};

        if (input.name !== undefined) {
            const response = await this.request.patch<OmadaApiResponse<unknown>>(this.buildPath(`${clientBase}/name`), { name: input.name });
            this.request.ensureSuccess(response);
            applied.name = input.name;
        }

        if (input.useFixedAddr !== undefined || input.fixedIp !== undefined) {
            const useFixedAddr = input.useFixedAddr ?? true;
            const ipSetting: Record<string, unknown> = { useFixedAddr };
            if (useFixedAddr) {
                if (!input.fixedIp) {
                    throw new Error('updateClient: fixedIp is required when useFixedAddr is true.');
                }
                ipSetting.netId = input.networkId ?? (await this.lookupClientNetworkId(clientBase, clientMac));
                ipSetting.ipList = [{ mac: clientMac, ip: input.fixedIp }];
            }
            const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/clients/config`);
            const response = await this.request.post<OmadaApiResponse<unknown>>(path, { macList: [clientMac], ipSetting });
            this.request.ensureSuccess(response);
            applied.ipSetting = ipSetting;
        }

        const rateLimit = buildRateLimitBody(input);
        if (rateLimit) {
            const response = await this.request.patch<OmadaApiResponse<unknown>>(this.buildPath(`${clientBase}/ratelimit`), rateLimit);
            this.request.ensureSuccess(response);
            applied.rateLimit = rateLimit;
        }

        if (Object.keys(applied).length === 0) {
            throw new Error('updateClient: nothing to update. Supply name, a fixed IP setting, or rate limit fields.');
        }
        return applied;
    }

    private async lookupClientNetworkId(clientBase: string, clientMac: string): Promise<string> {
        const response = await this.request.get<OmadaApiResponse<ClientDetail>>(this.buildPath(clientBase));
        const netId = this.request.ensureSuccess(response).ipSetting?.netId;
        if (!netId) {
            throw new Error(`updateClient: networkId is required to reserve an address for ${clientMac} and could not be read from the client.`);
        }
        return netId;
    }

    /**
     * Set a device's LED mode (v1 API).
     *
     * The Open API has no device-generic LED route (`/devices/{mac}/led-setting` returns -1600);
     * the setting lives in each family's general config: PATCH /aps|switches|gateways/{mac}/general-config.
     * The family is looked up from the site's device list unless `deviceType` is given.
     *
     * @param ledSetting - 0 = off, 1 = on, 2 = use site settings
     */
    public async setDeviceLed(deviceMac: string, ledSetting: number, siteId?: string, deviceType?: DeviceKind): Promise<unknown> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const kind = deviceType ?? (await this.resolveDeviceKind(deviceMac, resolvedSiteId));
        const path = this.buildPath(
            `/sites/${encodeURIComponent(resolvedSiteId)}/${GENERAL_CONFIG_SEGMENT[kind]}/${encodeURIComponent(deviceMac)}/general-config`
        );
        const response = await this.request.patch<OmadaApiResponse<unknown>>(path, { ledSetting });
        return this.request.ensureSuccess(response);
    }

    private async resolveDeviceKind(deviceMac: string, resolvedSiteId: string): Promise<DeviceKind> {
        const device = await this.findDevice(deviceMac, resolvedSiteId);
        if (!device) {
            throw new Error(`Device ${deviceMac} was not found in site ${resolvedSiteId}. Pass deviceType explicitly if it is not adopted there.`);
        }
        const type = device.type;
        if (type === 'ap' || type === 'switch' || type === 'gateway') {
            return type;
        }
        throw new Error(`Device ${deviceMac} reports type "${String(type)}", which has no general-config endpoint. Pass deviceType explicitly.`);
    }

    /**
     * Get the latest firmware information for a device (v1 API).
     * OperationId: getFirmwareInfo — GET /sites/{siteId}/devices/{deviceMac}/latest-firmware-info.
     * The previous `/devices/{mac}/firmware` path returns -1600.
     */
    public async getFirmwareDetails(deviceMac: string, siteId?: string): Promise<unknown> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/devices/${encodeURIComponent(deviceMac)}/latest-firmware-info`);
        const response = await this.request.get<OmadaApiResponse<unknown>>(path);
        return this.request.ensureSuccess(response);
    }

    /**
     * Start an online firmware upgrade for a device (v1 API).
     * OperationId: onlineUpgrade — POST /sites/{siteId}/devices/{deviceMac}/start-online-upgrade.
     * The previous `/devices/{mac}/firmware/upgrade` path returns -1600.
     */
    public async startFirmwareUpgrade(deviceMac: string, siteId?: string): Promise<unknown> {
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/devices/${encodeURIComponent(deviceMac)}/start-online-upgrade`);
        const response = await this.request.post<OmadaApiResponse<unknown>>(path, {});
        return this.request.ensureSuccess(response);
    }

    /**
     * Connect or disconnect a gateway WAN port (internal web UI API only).
     *
     * Sends what the controller's own WAN page sends: POST /sites/{siteId}/cmd/gateways/{mac}/internetState
     * with `{ portId, operation }`, operation 1 = connect, 0 = disconnect. The Open API has no route for
     * this on firmware 6.2.14.12 — both `/cmd/gateways/{mac}/internetState` and the previous
     * `/gateways/{mac}/wan/{port}/{action}` return -1600.
     *
     * @param portId - WAN port number as reported by getInternetInfo / the gateway's wan-status (e.g. "2")
     */
    public async setGatewayWanConnect(gatewayMac: string, portId: string, action: 'connect' | 'disconnect', siteId?: string): Promise<unknown> {
        if (!this.internalRequest) {
            throw new Error(
                'setGatewayWanConnect requires the internal web UI API. Set OMADA_WEB_USERNAME and OMADA_WEB_PASSWORD to enable it; ' +
                    'the Open API has no WAN connect route.'
            );
        }
        const port = Number.parseInt(portId, 10);
        if (Number.isNaN(port)) {
            throw new Error(`setGatewayWanConnect: portId must be the WAN port number (got "${portId}").`);
        }
        const resolvedSiteId = this.site.resolveSiteId(siteId);
        const path = `/sites/${encodeURIComponent(resolvedSiteId)}/cmd/gateways/${encodeURIComponent(gatewayMac)}/internetState`;
        const response = await this.internalRequest.post<OmadaApiResponse<unknown>>(path, { portId: port, operation: action === 'connect' ? 1 : 0 });
        return this.internalRequest.ensureSuccess(response);
    }
}

/**
 * Build the PATCH /clients/{mac}/ratelimit body, or undefined when no rate limit field was supplied.
 */
function buildRateLimitBody(input: UpdateClientInput): Record<string, unknown> | undefined {
    const requested =
        input.rateLimitEnable !== undefined || input.upLimit !== undefined || input.downLimit !== undefined || input.rateLimitId !== undefined;
    if (!requested) {
        return undefined;
    }

    const enable = input.rateLimitEnable ?? true;
    const body: Record<string, unknown> = {
        mode: input.rateLimitMode ?? DEFAULT_RATE_LIMIT_MODE,
        enable,
        upEnable: enable && input.upLimit !== undefined,
        downEnable: enable && input.downLimit !== undefined,
    };
    if (input.upLimit !== undefined) {
        body.upLimit = input.upLimit;
        body.upUnit = input.upUnit ?? 1;
    }
    if (input.downLimit !== undefined) {
        body.downLimit = input.downLimit;
        body.downUnit = input.downUnit ?? 1;
    }
    if (input.rateLimitId) {
        body.rateLimitId = input.rateLimitId;
    }
    return body;
}
