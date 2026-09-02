# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Why firmware is recorded

A large part of this server's behaviour depends on **which endpoints a given controller firmware actually routes**, not on the code. The same tool can work on one controller and return `-1600 Unsupported request path` on another. Two controllers on different firmware are, in practice, two different APIs.

So every release below records the controller firmware it was **developed and verified against**. When a change was driven by a discovery specific to a firmware version, that version is named inline. A matching endpoint dump is committed under [`docs/endpoints/`](docs/endpoints/) for each firmware we have run against — regenerate one for yours with `node scripts/dump-endpoints.mjs https://<controller>` and see [docs/endpoint-discovery.md](docs/endpoint-discovery.md).

**Verified firmware to date**

| Firmware | Controller | Open API | Endpoint dump | Releases verified |
|---|---|---|---|---|
| 6.2.14.12 | OC200 hardware controller | v3 | [`controller-api3-6.2.14.12.txt`](docs/endpoints/controller-api3-6.2.14.12.txt) | 0.6.0, 0.7.0 |
| not recorded | OC200 (per commit message) | — | — | 0.5.5+realtydev |
| not recorded | — | — | — | ≤ 0.5.5 |

---

## [0.7.0] — 2026-09-02

**Verified against:** the 0.6.0 hardware — OC200 hardware controller, firmware **6.2.14.12** (Open API v3), ER7206 v1.0 gateway, T1600G-28PS v3.0 and SG2008P v3.20 switches, EAP610 access points.

Driven by a live failure: `updateLanNetwork` could not change the DNS servers a network hands out. Checking every endpoint this server calls against the controller's own OpenAPI document (`docs/openapi/`) and probing the controller with bogus IDs showed the same two mistakes repeated across a dozen tools, so this release fixes the class rather than the instance.

### Fixed

- **Wrong HTTP method.** The controller routes `PATCH`, not `PUT`, for `updateLanNetwork` (v2), `updateLanProfile` and `updateFirewallSetting`, and `DELETE` for a LAN network exists only on the v1 path. All four answered `-1600 Unsupported request path` — the same code as a missing endpoint, which is how they had been written off as unsupported.
- **Wrong path.** `adoptDevice` (`/cmd/adopts` → `/devices/{mac}/start-adopt`), `getFirmwareDetails` (`/devices/{mac}/firmware` → `/devices/{mac}/latest-firmware-info`), `startFirmwareUpgrade` (`…/firmware/upgrade` → `…/start-online-upgrade`), `listRoutes` (`/setting/routes` → `/routing/static-routings`), `listLogs` (`/sites/{id}/logs` → `/sites/{id}/logs/events`, which also needs a time window — the last 7 days by default), `setDeviceLed` (`/devices/{mac}/led-setting` → the family's `/aps|switches|gateways/{mac}/general-config`, family looked up automatically), and the Open API fallbacks of `listEvents` (`/logs/events`), `getSwitchPorts` (`portList` from the switch detail) and the firewall ACL tools (`/acls/osg-acls`, `/acls/{id}`).
- **`updateClient`** called `PATCH /clients/{mac}`, which does not exist. It now writes each group through its own endpoint: name → `/clients/{mac}/name`, fixed IP → `/clients/config`, rate limit → `/clients/{mac}/ratelimit`.
  *Firmware 6.2.14.12:* the rate-limit route rejects a body without `mode` ("Parameter [mode] could not be null") although the OpenAPI document omits the field. The tool sends `mode: 0` unless `rateLimitMode` is given; the accepted values could not be confirmed.
- **`updateSwitchPort`** called an undocumented `PATCH /switches/{mac}/ports/{port}` that answers `-1 General error` even for a no-op body. It now fans out to the documented per-attribute endpoints (profile, profile override, PoE, status, name) and refuses the profile-only fields (STP, isolation, loopback detection, LLDP-MED, speed/duplex) with a pointer to `updateLanProfile`.
- **`setGatewayWanConnect`** had no route on either API. It now sends what the controller's own WAN page sends, over the internal API: `POST /cmd/gateways/{mac}/internetState` with `{ portId, operation }` (1 = connect, 0 = disconnect). Requires web credentials. Verified to reach the controller's parameter validation; not exercised against a live WAN.

### Added

- **`listPortForwardings`** — the configured NAT port forwarding rules (`GET /sites/{siteId}/nat/port-forwardings`): name, status, WAN port, external and internal port, target IP, protocol, source restriction. Verified on 6.2.14.12.

### Changed

- **`createLanNetwork` / `updateLanNetwork`** input now mirrors the controller's `dhcpSettingsVO`: DHCP pools (`ipRangePool`, or the `ipRangeStart`/`ipRangeEnd` shorthand), `dhcpns` auto/manual, `priDns`/`sndDns`, custom options, plus `interfaceIds`, `vlanType`, `application`, `domain` and `mldSnoopEnable`. Lease time is in **minutes** — the old description said seconds. The DHCP block used to be sent as `dhcpSettings` with `leaseTime`, names the controller does not read.
- **`createLanProfile` / `updateLanProfile`** now carry every field the controller requires (`dot1x`, `bandWidthCtrlType`, `untagNetworkIds`, `voiceNetworkId`, `bandCtrl`, `stormCtrl`, …). `poe` is the controller's 0 = on / 1 = off / 2 = do not modify; a boolean is still accepted and mapped.
- **`listLogs` / `listEvents`** accept `timeStart`, `timeEnd` (epoch ms) and `module` (System / Device / Client).
- **`adoptDevice`** accepts optional `username` / `password` for a device with non-default credentials. **`setDeviceLed`** accepts an optional `deviceType` to skip the device lookup.
- `RequestHandler` gained `patch()`.

### Documented

- **`-1600` also means wrong HTTP method.** `PUT` on a `PATCH`-only route returns exactly the same `-1600 Unsupported request path` as a nonexistent path. Check the method against `docs/openapi/` before concluding an endpoint is absent. Recorded in [docs/endpoint-discovery.md](docs/endpoint-discovery.md).
- The switch port write tools (`setSwitchPort*`, `batchSetSwitchPort*`) **work** on 6.2.14.12 — verified with a no-op rename of a real port. 0.6.0 listed them as broken; that entry was wrong.
- `createLanNetwork` → `getLanNetworkList` → `deleteLanNetwork` verified as a full round trip on 6.2.14.12 (interface network with a DHCP pool and manual DNS). The controller creates a matching LAN profile alongside the network and removes it with the network.
- `getCableTestResults` and `getSwitchStackDetail` route on 6.2.14.12 after all (0.6.0 listed them as absent): the cable-test endpoint returns an empty result set until a test has run, and the stack endpoint answers "This switch stack is not existed" for an unknown ID rather than `-1600`. `getPortForwardingStatus` (the insight endpoint) still answers `-1001 Invalid request parameters` for both `User` and `UPnP`; `startCableTest` was not exercised.

---

## [0.6.0] — 2026-08-31

First release of the [Zesty0wl](https://github.com/Zesty0wl/omada-mcp) fork, taken from [realtydev/omada-mcp](https://github.com/realtydev/omada-mcp) at `376e242`.

**Verified against:** OC200 hardware controller, firmware **6.2.14.12** (Open API v3), managing an ER7206 v1.0 gateway, T1600G-28PS v3.0 and SG2008P v3.20 switches, and EAP610 v2.0/v3.0 plus EAP610-Outdoor v1.0 access points.

### Added

- **Reboot schedule tools** — `listRebootSchedules`, `createRebootSchedule`, `updateRebootSchedule`, `deleteRebootSchedule`.
  *Firmware 6.2.14.12:* backed by `/setting/service/rebootSchedules` on the internal API. Absent from the Open API entirely.
- **PoE schedule tools** — `listPoeSchedules`, `createPoeSchedule`, `updatePoeSchedule`, `deletePoeSchedule`, backed by `/setting/service/poeSchedules`.
- **Time range tool** — `listTimeRanges` (`/setting/profiles/timeranges`), the scheduling primitive that PoE, WLAN and ACL schedules bind to.
- **Site settings tools** — `getSiteSettings`, `updateSiteSettings`, and `setSiteTimeZone`.
  *Firmware 6.2.14.12:* `PATCH /setting` validates the `site` block as a unit and rejects a lone `timeZone` with `-1001 Parameter [region] is null`. `setSiteTimeZone` sends `region` and `scenario` alongside it.
  *Firmware 6.2.14.12 — DST is independent of the timezone.* Setting `timeZone` to `Europe/London` on a live controller left `site.dst.enable` at `false` and did **not** change any schedule's `nextExecute`; the schedule continued to resolve to 06:00 UTC (07:00 BST) with `notInDst: true`. Omada stores DST as separate manual recurring rules, so an IANA zone alone does not make schedules observe summer time. Documented in the README and the `setSiteTimeZone` description; configuring the DST rules themselves is not yet exposed as a tool.
- **`scripts/dump-endpoints.mjs`** — enumerates a controller's entire internal API surface with no credentials, labelling output by firmware version.
- **[`docs/endpoint-discovery.md`](docs/endpoint-discovery.md)** — the discovery method, the Open API vs internal API distinction, and the error codes that distinguish a missing endpoint (`-1600`) from a wrong argument (`-1001`).
- **[`docs/endpoints/controller-api3-6.2.14.12.txt`](docs/endpoints/controller-api3-6.2.14.12.txt)** — 224 internal endpoints scraped from 225 UI modules.
- `PUT` and `PATCH` methods on `InternalRequestHandler`.
- **`getRfPlanning`** — reads the AI RF Planning configuration (what earlier Omada versions called WLAN Optimization): which bands are re-planned, whether channel width, band and power are deployed, excluded APs, and its own `scheduleEnable` + `occurrence`.
  *Firmware 6.2.14.12:* RF Planning carries its schedule on its own object at `/rfPlanning`, not in the `setting/service/*` schedule collections — which is why it is easy to miss when auditing what is scheduled on a site.
  **Read only.** No write path has been confirmed: `PUT`/`POST`/`PATCH` on `/sites/{siteId}/rfPlanning`, on `/cmd/rfPlanning` and on several other bases all return `-1600`. The one path that exists, `PATCH /sites/{siteId}/setting/wlans/rfPlanning`, returns `-1001 "must not be null"` for every payload tried — including the exact field list the web UI assembles, and the unmodified current object. Configure RF Planning in the web UI until the real request is captured from the browser.
- `tests/omadaClient/schedule.test.ts` — 18 tests covering path construction, id encoding, the missing-credentials error, controller error propagation, and `setSiteTimeZone`'s region/scenario handling. Raises `schedule.ts` coverage from 2% to 88% and the project total from 65% to 69%.

### Changed

- **Extended the internal-API fallback** from firewall ACLs (upstream's only use) to `getSwitchPorts` and `listEvents`.
  *Firmware 6.2.14.12:* both return `-1600` on the Open API, so both were dead tools before this change.
- **Rewrote the README** with full fork lineage, the compatibility matrix below, and the previously undocumented `OMADA_WEB_USERNAME` / `OMADA_WEB_PASSWORD` variables.
- Bumped version to 0.6.0.

### Fixed

- **`tests/tools/index.test.ts` failed on a clean checkout.** It asserted a 45-tool manifest while 60 tools were registered, so `npm test` was red before any change in this fork. The manifest now matches the registered set (72).

### Documented, not fixed

*Firmware 6.2.14.12:* these return `-1600` on the Open API and no internal equivalent was located. They remain registered but non-functional on this firmware, and are listed in the README compatibility matrix:

`listRoutes` · `getPortForwardingStatus` · `getFirmwareDetails` · `startFirmwareUpgrade` · `getCableTestResults` · `startCableTest` · `listLogs` · `getSwitchStackDetail` · `updateSwitchPort` · all `setSwitchPort*` · all `batchSetSwitchPort*`

Switch port *state* remains readable via `getSwitch` or `getSwitchPorts`; only configuration writes are unavailable.

### Known issues inherited from upstream

- `src/tools/getDevicesStats.ts` is dead code — it duplicates `listDevicesStats.ts`, exports an identically named function, and is never imported. Left in place to keep this release's diff reviewable.

---

## [0.5.5+realtydev] — 2026-02-19 (unreleased upstream)

Changes made in [realtydev/omada-mcp](https://github.com/realtydev/omada-mcp) on top of 0.5.5, never published to npm or tagged.

**Verified against:** not recorded by that fork. Its final commit message references an OC200; no firmware version was stated.

### Added
- Full CRUD: LAN network and profile create/update/delete, firewall settings and ACL rules.
- Switch port management: per-port and batch profile, PoE, name, status and override tools.
- Cable testing (`startCableTest`, `getCableTestResults`) and `getSwitch`.
- Internal web UI API support (`InternalAuthManager`, `InternalRequestHandler`) with `OMADA_WEB_USERNAME` / `OMADA_WEB_PASSWORD`, used for firewall ACLs and IP groups on OC200. **Never documented in the README** — this fork documents it.

---

## [0.5.5] and earlier — [MiguelTVMS/tplink-omada-mcp](https://github.com/MiguelTVMS/tplink-omada-mcp)

The original project: MCP server scaffolding, stdio/HTTP/SSE transports, Open API OAuth client, read tools, logging, and the Vitest suite.

**Verified against:** not recorded. See that repository's history for details.
