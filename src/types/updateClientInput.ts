/**
 * Settings that updateClient can change. Each group maps to its own Open API endpoint:
 * name → PATCH /clients/{mac}/name, fixed IP → POST /clients/config, rate limit → PATCH /clients/{mac}/ratelimit.
 */
export interface UpdateClientInput {
    /** Display name, 1-128 characters. */
    name?: string;
    /** Reserve (true) or release (false) a fixed DHCP address for the client. Implied true when fixedIp is set. */
    useFixedAddr?: boolean;
    /** Address to reserve. Required when useFixedAddr is true. */
    fixedIp?: string;
    /** LAN network the reservation belongs to. Read from the client's current network when omitted. */
    networkId?: string;
    /** Turn the per-client rate limit on or off. Implied true when a limit is given. */
    rateLimitEnable?: boolean;
    /** Upload limit, 1-1024 in `upUnit`. */
    upLimit?: number;
    /** 1 = Kbps (default), 2 = Mbps. */
    upUnit?: 1 | 2;
    /** Download limit, 1-1024 in `downUnit`. */
    downLimit?: number;
    /** 1 = Kbps (default), 2 = Mbps. */
    downUnit?: 1 | 2;
    /** Rate limit profile ID, instead of custom limits. */
    rateLimitId?: string;
    /** Rate limit mode. The controller requires it although the Open API document omits it; defaults to 0. */
    rateLimitMode?: number;
}
