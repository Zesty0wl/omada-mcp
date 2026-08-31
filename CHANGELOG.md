# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Why firmware is recorded

A large part of this server's behaviour depends on **which endpoints a given controller firmware actually routes**, not on the code. The same tool can work on one controller and return `-1600 Unsupported request path` on another. Two controllers on different firmware are, in practice, two different APIs.

So every release below records the controller firmware it was **developed and verified against**. When a change was driven by a discovery specific to a firmware version, that version is named inline. A matching endpoint dump is committed under [`docs/endpoints/`](docs/endpoints/) for each firmware we have run against — regenerate one for yours with `node scripts/dump-endpoints.mjs https://<controller>` and see [docs/endpoint-discovery.md](docs/endpoint-discovery.md).

**Verified firmware to date**

| Firmware | Controller | Open API | Endpoint dump | Releases verified |
|---|---|---|---|---|
| 6.2.14.12 | OC200 hardware controller | v3 | [`controller-api3-6.2.14.12.txt`](docs/endpoints/controller-api3-6.2.14.12.txt) | 0.6.0 |
| not recorded | OC200 (per commit message) | — | — | 0.5.5+realtydev |
| not recorded | — | — | — | ≤ 0.5.5 |

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
