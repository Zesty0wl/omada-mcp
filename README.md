# Omada MCP Server

MCP server for TP-Link Omada SDN controllers. Exposes 72 tools for reading and managing sites, devices, clients, networks, switch ports, firewalls, schedules and site settings over the Model Context Protocol.

## Lineage and attribution

This is a fork of a fork. Credit where it is due:

| Repo | Contribution |
|---|---|
| [MiguelTVMS/tplink-omada-mcp](https://github.com/MiguelTVMS/tplink-omada-mcp) | The original MCP server — transport, auth, tool scaffolding, read tools |
| [realtydev/omada-mcp](https://github.com/realtydev/omada-mcp) | Added full CRUD, switch port management, batch operations, cable testing, and the internal web UI API fallback for firewall ACLs. Last updated February 2026 |
| **[Zesty0wl/omada-mcp](https://github.com/Zesty0wl/omada-mcp)** (this repo) | Forked August 2026 from `realtydev` @ `376e242`. Adds scheduling and site settings, extends the internal-API fallback, and documents actual controller compatibility |

### What this fork adds

**New: scheduling and site settings (12 tools).** Reboot schedules, PoE schedules, time range profiles, and site settings including timezone. None of these exist in the Open API; they are internal-API only.

**Extended internal-API fallback.** Upstream routes only firewall ACLs through the internal web UI API. This fork extends that to `getSwitchPorts` and `listEvents`, which return `-1600 Unsupported request path` on the Open API of every controller tested.

**Documented `OMADA_WEB_USERNAME` / `OMADA_WEB_PASSWORD`.** Upstream reads these in `src/config.ts` but never documents them, so the internal-API code path is effectively unreachable unless you read the source. They are documented below.

**Honest compatibility matrix.** Upstream's README lists 60+ tools without noting that a large fraction return `-1600` on common hardware. See [Controller compatibility](#controller-compatibility).

**Test fixes.** `tests/tools/index.test.ts` asserted a stale 45-tool manifest against 60 registered tools, so the suite failed on a clean checkout. The manifest now matches the registered set.

## Quick start

```json
{
  "mcpServers": {
    "omada": {
      "command": "node",
      "args": ["/path/to/omada-mcp/dist/index.js"],
      "env": {
        "OMADA_BASE_URL": "https://192.168.1.10",
        "OMADA_CLIENT_ID": "your-client-id",
        "OMADA_CLIENT_SECRET": "your-client-secret",
        "OMADA_OMADAC_ID": "your-omadac-id",
        "OMADA_SITE_ID": "your-site-id",
        "OMADA_WEB_USERNAME": "controller-login",
        "OMADA_WEB_PASSWORD": "controller-password",
        "OMADA_STRICT_SSL": "false"
      }
    }
  }
}
```

Build first with `npm install && npm run build`.

### Getting your credentials

`OMADA_CLIENT_ID` / `OMADA_CLIENT_SECRET` come from **Settings → Platform Integration → Open API → Add New App**. Choose **Client Mode** (the server only ever uses the `client_credentials` grant — a redirect URL is never used) and grant a role with write access; read-only blocks every config tool.

`OMADA_OMADAC_ID` is available unauthenticated:

```bash
curl -sk https://<controller>/api/info
```

`OMADA_SITE_ID` is optional — omit it and call `listSites` to find it.

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OMADA_BASE_URL` | Yes | - | Controller URL |
| `OMADA_CLIENT_ID` | Yes | - | Open API client ID |
| `OMADA_CLIENT_SECRET` | Yes | - | Open API client secret |
| `OMADA_OMADAC_ID` | Yes | - | Controller ID |
| `OMADA_SITE_ID` | No | - | Default site ID |
| `OMADA_WEB_USERNAME` | No | - | **Controller web UI login.** Enables the internal API — required for schedules, site settings, firewall ACLs, IP groups, switch ports, events and WAN connect/disconnect |
| `OMADA_WEB_PASSWORD` | No | - | Controller web UI password |
| `OMADA_STRICT_SSL` | No | `true` | Set `false` for self-signed certificates |
| `OMADA_TIMEOUT` | No | `30000` | Request timeout (ms) |

Server transport variables (`MCP_SERVER_USE_HTTP`, `MCP_HTTP_PORT`, `MCP_HTTP_BIND_ADDR`, `MCP_SERVER_LOG_LEVEL`, `MCP_SERVER_LOG_FORMAT`, `MCP_SERVER_STATEFUL`, `MCP_HTTP_TRANSPORT`) are unchanged from upstream.

## Controller compatibility

Omada controllers expose two APIs: the documented **Open API** (`/openapi/v1/...`, OAuth) and the undocumented **internal web UI API** (`/{omadacId}/api/v2/...`, cookie + CSRF). Which endpoints exist on which varies by controller model and firmware — the Open API surface is considerably smaller than its documentation suggests.

Verified against **OC200 hardware controller, firmware 6.2.14.12** (ER7206 gateway, T1600G-28PS and SG2008P switches, EAP610 access points):

**Work over the Open API alone** — `listSites` `listDevices` `getDevice` `getSwitch` `listClients` `getClient` `listDevicesStats` `listMostActiveClients` `listClientsActivity` `listClientsPastConnections` `getInternetInfo` `getLanNetworkList` `getLanProfileList` `getWlanGroupList` `getSsidList` `getSsidDetail` `getFirewallSetting` `updateFirewallSetting` `searchDevices` `rebootDevice` `adoptDevice` `blockClient` `unblockClient` `reconnectClient` `updateClient` `setDeviceLed` `getFirmwareDetails` `startFirmwareUpgrade` `listRoutes` `listLogs` `listPortForwardings` `createPortForwarding` `updatePortForwarding` `deletePortForwarding` `getCableTestResults` `getSwitchStackDetail` `updateSwitchPort` `setSwitchPort*` `batchSetSwitchPort*` and the LAN network/profile write tools. `listEvents` and `getSwitchPorts` work here too, with reduced detail.

**Require `OMADA_WEB_USERNAME` / `OMADA_WEB_PASSWORD`** — all schedule and site settings tools, `listFirewallAcls`, `createFirewallAcl`, `deleteFirewallAcl`, `listIpGroups`, `setGatewayWanConnect`. `getSwitchPorts` and `listEvents` prefer the internal API when it is available.

**Not working on this hardware** — `getPortForwardingStatus`: the insight endpoint answers `-1001 Invalid request parameters` for both `User` and `UPnP` even with the documented page parameters; `listPortForwardings` returns the configured rules instead. `startCableTest` has not been exercised, because it disrupts the links it tests. `getCableTestResults` and `getSwitchStackDetail` do route on 6.2.14.12 — 0.6.0 listed them as absent — though this site has no stack to read.

**A note on `-1600`.** Earlier releases listed far more tools here. Most of them were calling the wrong HTTP method or path, not a missing endpoint: the controller answers `-1600 Unsupported request path` for `PUT` on a `PATCH`-only route exactly as it does for a path that does not exist. Every endpoint this server calls has since been checked against the controller's own OpenAPI document in [`docs/openapi/`](docs/openapi/) — see the [CHANGELOG](CHANGELOG.md) for what changed.

Your controller may differ. `genericApiCall` is the escape hatch for anything not covered.

### Discovering endpoints for your firmware

The controller ships no OpenAPI spec, but its web UI declares every endpoint it calls. Dump the full internal API surface for your firmware — no credentials needed:

```bash
node scripts/dump-endpoints.mjs https://192.168.1.10
```

```
controller: 6.2.14.12 (api v3)
manifest:   /js/su/configJson-9cdc9a57dd.js
modules:    225
endpoints:  224
written:    docs/endpoints/controller-api3-6.2.14.12.txt
```

Dumps are committed per firmware under [`docs/endpoints/`](docs/endpoints/). The method, the Open API vs internal API distinction, and the error codes that tell a missing endpoint (`-1600`) from a wrong argument (`-1001`) are all in **[docs/endpoint-discovery.md](docs/endpoint-discovery.md)**. That is how the schedule endpoints in this fork were found.

If you run different hardware or firmware, a dump and a compatibility correction is the most useful contribution you can make — see [CONTRIBUTING.md](CONTRIBUTING.md).

## Tools

### Scheduling and site settings (new in this fork — internal API)

| Tool | Description |
|---|---|
| `listRebootSchedules` | List reboot schedules, their target devices and next execution time |
| `createRebootSchedule` | Create a daily/weekly/monthly reboot schedule for specific devices |
| `updateRebootSchedule` | Replace an existing reboot schedule |
| `deleteRebootSchedule` | Delete a reboot schedule |
| `listPoeSchedules` | List PoE schedules |
| `createPoeSchedule` | Create a PoE schedule (power-cycles switch ports on a time range) |
| `updatePoeSchedule` | Replace an existing PoE schedule |
| `deletePoeSchedule` | Delete a PoE schedule |
| `listTimeRanges` | List time range profiles — the primitive PoE/WLAN/ACL schedules bind to |
| `getSiteSettings` | Timezone, DST, NTP, mesh, band steering, airtime fairness, roaming, LED, auto-upgrade |
| `updateSiteSettings` | Patch individual site settings sections |
| `setSiteTimeZone` | Set the site timezone, handling the required `region`/`scenario` fields |

> **Check your timezone *and* your DST setting before trusting any schedule.** Controllers commonly ship set to `UTC`. Worse, **Omada treats daylight saving as a separate setting from the timezone** — `site.dst.enable`, with manual recurring start/end rules — and it is off by default. Setting an IANA zone such as `Europe/London` does *not* on its own make schedules observe summer time: the controller stays on the standard offset year-round, so a "06:00" reboot fires at 07:00 wall-clock from March to October.
>
> Verify with `getSiteSettings` (check `site.timeZone` **and** `site.dst.enable`) and with `listRebootSchedules` — a schedule's `nextExecute` is a UTC epoch, and `notInDst: true` confirms DST is not being applied. `setSiteTimeZone` sets the zone; configuring the DST rules must currently be done in the web UI under Site Settings.

### Read tools

| Tool | Description |
|---|---|
| `listSites` | List all sites on the controller |
| `listDevices` | List devices for a site |
| `listClients` | List active clients for a site |
| `getDevice` | Details for a specific device |
| `getClient` | Details for a specific client |
| `getSwitch` | Full switch info including `portList` |
| `getSwitchPorts` | All ports for a switch (internal API) |
| `getSwitchStackDetail` | Switch stack configuration and status |
| `searchDevices` | Search devices globally across all sites |
| `listDevicesStats` | Device statistics with pagination and filtering |
| `listMostActiveClients` | Top clients by traffic |
| `listClientsActivity` | Client activity time series |
| `listClientsPastConnections` | Historical client connections |
| `getThreatList` | Security threat list |
| `getInternetInfo` | Internet / WAN configuration |
| `getPortForwardingStatus` | Port forwarding status (User/UPnP) — see compatibility notes |
| `listPortForwardings` | Configured port forwarding rules: name, status, WAN port, external/internal port, target IP |
| `getLanNetworkList` | LAN networks and VLAN settings |
| `getLanProfileList` | LAN profiles for switch ports |
| `getWlanGroupList` | WLAN groups |
| `getSsidList` | SSIDs in a WLAN group |
| `getSsidDetail` | Detailed SSID configuration |
| `getFirewallSetting` | Firewall settings and policies |
| `getFirmwareDetails` | Latest firmware info for a device (current version, available update) |
| `listEvents` | Paginated site events (internal API) |
| `listLogs` | Site event log over the Open API, filterable by time window and module |
| `listFirewallAcls` | Firewall ACL rules (internal API) |
| `listIpGroups` | IP/port groups for ACL rules (internal API) |
| `listRoutes` | Static routes |
| `getCableTestResults` | Cable test results |
| `getSwitchNetworks` | Switch VLAN trunking configuration |

### Write tools

| Tool | Description |
|---|---|
| `createLanNetwork` / `updateLanNetwork` / `deleteLanNetwork` | Manage LAN networks, including DHCP pools and the DNS servers handed to clients |
| `createPortForwarding` / `updatePortForwarding` / `deletePortForwarding` | Manage NAT port forwarding rules on the gateway. `updatePortForwarding` takes only the fields to change and merges them into the current rule |
| `createLanProfile` / `updateLanProfile` | Manage switch port LAN profiles (networks, PoE, 802.1X, STP, bandwidth/storm control) |
| `updateFirewallSetting` | Update firewall settings |
| `createFirewallAcl` / `deleteFirewallAcl` | Manage firewall ACL rules (internal API) |
| `updateSwitchPort` | Set profile, override, PoE, status and name on one port in a single call |
| `updateClient` | Rename a client, reserve a fixed IP, set per-client rate limits |
| `setSwitchNetworks` | Set switch VLAN trunking |

### Switch port tools

| Tool | Description |
|---|---|
| `setSwitchPortProfile` / `setSwitchPortPoe` / `setSwitchPortName` / `setSwitchPortStatus` / `setSwitchPortProfileOverride` | Single-port configuration |
| `batchSetSwitchPortProfile` / `batchSetSwitchPortPoe` / `batchSetSwitchPortStatus` / `batchSetSwitchPortName` | Multi-port configuration |
| `startCableTest` | Start a cable test on a switch |

### Action tools

| Tool | Description |
|---|---|
| `rebootDevice` | Reboot a device |
| `adoptDevice` | Adopt a device |
| `blockClient` / `unblockClient` | Block or unblock a client |
| `reconnectClient` | Reconnect a client |
| `setDeviceLed` | Set device LED behaviour |
| `startFirmwareUpgrade` | Start a firmware upgrade |
| `setGatewayWanConnect` | Connect or disconnect a gateway WAN port (internal API) |

### Generic

| Tool | Description |
|---|---|
| `genericApiCall` | Invoke any Omada Open API endpoint directly. `{siteId}` in the path is filled in with the `siteId` argument or the configured site |

## Documentation

| Document | Contents |
|---|---|
| [CHANGELOG.md](CHANGELOG.md) | Release history, with the controller firmware each release was verified against |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Dev setup, adding tools, reporting a new firmware version |
| [docs/endpoint-discovery.md](docs/endpoint-discovery.md) | How to enumerate a controller's API surface, and how to read its error codes |
| [docs/endpoints/](docs/endpoints/) | Committed endpoint dumps, one per firmware version |

## Updating from upstream

This fork keeps `upstream` pointed at [realtydev/omada-mcp](https://github.com/realtydev/omada-mcp). After cloning:

```bash
git remote add upstream https://github.com/realtydev/omada-mcp.git   # if not already set
git fetch upstream
git log --oneline HEAD..upstream/main        # what is new upstream
```

Merge and validate:

```bash
git checkout -b merge-upstream
git merge upstream/main
npm install && npm run check && npm test
```

Things to watch when merging:

- **`src/tools/index.ts`** conflicts on nearly every upstream change, since both sides add imports and `register*` calls. Keep both sets.
- **`tests/tools/index.test.ts`** asserts an exact tool manifest. Any tool added on either side must be added to `expectedTools`, or the suite fails.
- **New upstream tools may not work on your firmware.** Check them against your endpoint dump and update the [compatibility matrix](#controller-compatibility) rather than assuming they work.
- **Re-run the endpoint dump after a controller firmware upgrade**, not just after a code merge — TP-Link moves these paths between releases. Commit the new dump and add a firmware row to the changelog.

To update the server itself after pulling:

```bash
npm install && npm run build
```

then restart your MCP client so it reloads the tool list.

## Development

```bash
npm install
npm run dev      # live reload via tsx
npm run build    # compile TypeScript
npm run check    # lint + type check
npm test         # vitest
npm start        # run compiled server (stdio)
```

## Security notes

`OMADA_WEB_PASSWORD` is a full controller administrator credential — the internal API is the web UI's own API and inherits that account's privileges. Anything holding this value can reconfigure your network. Keep it out of version control, and give it its own password rather than reusing one shared with Wi-Fi or other services.

## Known issues inherited from upstream

- `src/tools/getDevicesStats.ts` is dead code: it duplicates `listDevicesStats.ts`, exports an identically named function, and is never imported.
- Several tools listed in upstream's README do not work on common hardware. See [Controller compatibility](#controller-compatibility).

## License

[MIT](LICENSE)
