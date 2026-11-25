import type { RequestHandler } from './request.js';
import type { SiteOperations } from './site.js';

const SITE_PLACEHOLDER = '{siteId}';

/**
 * Generic API operations for the Omada API.
 * Provides an escape hatch for any API call not explicitly covered.
 */
export class GenericOperations {
    constructor(
        private readonly request: RequestHandler,
        private readonly buildPath: (path: string, version?: string) => string,
        private readonly site: SiteOperations
    ) {}

    /**
     * Execute an arbitrary Omada API call.
     * A literal `{siteId}` in the path is replaced with the given site ID, or the configured default site,
     * so documented paths such as `/sites/{siteId}/nat/port-forwardings` can be passed as they appear.
     */
    public async genericApiCall(
        method: string,
        path: string,
        version = 'v1',
        body?: unknown,
        queryParams?: Record<string, unknown>,
        siteId?: string
    ): Promise<unknown> {
        const resolvedPath = path.includes(SITE_PLACEHOLDER)
            ? path.replaceAll(SITE_PLACEHOLDER, encodeURIComponent(this.site.resolveSiteId(siteId)))
            : path;
        const fullPath = this.buildPath(resolvedPath, version);
        return await this.request.request<unknown>({
            method,
            url: fullPath,
            data: body,
            params: queryParams,
        });
    }
}
