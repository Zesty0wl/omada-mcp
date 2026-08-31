# Discovering Omada API endpoints

Omada controllers expose two HTTP APIs, and the difference between them is the single most important thing to understand when working on this server.

| | Open API | Internal web UI API |
|---|---|---|
| Base path | `/openapi/v1/{omadacId}` | `/{omadacId}/api/v2` |
| Auth | OAuth 2.0 `client_credentials` → bearer token | `POST /login` → session cookie + `Csrf-Token` header |
| Credentials | `OMADA_CLIENT_ID` / `OMADA_CLIENT_SECRET` | `OMADA_WEB_USERNAME` / `OMADA_WEB_PASSWORD` |
| Documented | Yes, by TP-Link | No |
| Stable | Intended to be | May change between firmware releases |
| Coverage | **Much narrower than its documentation implies** | Everything the web UI can do |

The Open API is the right default. But large parts of the product — reboot and PoE schedules, site settings, switch port configuration, firewall ACLs, events — simply are not routed on it for some controllers, returning `-1600 Unsupported request path`. When that happens the internal API is the only option.

There is no OpenAPI/Swagger document on the controller. `/doc.html`, `/swagger-ui.html`, `/v2/api-docs`, `/openapi.json` and friends all 404; `/openapi/doc` returns 401 but that is just the Open API auth gate, and authenticating still yields 404.

## The method

The web UI is a jQuery single-page app whose screens are lazily loaded modules. Each module contains the API paths it calls **as plain string literals**. Enumerating the modules therefore enumerates the API — and the bundles are served without authentication.

1. **Fetch the root document.** `GET /` lists the eagerly loaded bundles in `<script src="...">` tags.

2. **Find the manifest.** One of those bundles is `js/su/configJson-<hash>.js`. It contains a JSON map of every lazily loaded module:

   ```js
   "rebootSchedule": {
       "controller": "./modules/settings/services_settings/reboot_schedule/controllers-81d9f11a3d.js",
       "view":       "./modules/settings/services_settings/reboot_schedule/view-a78da5cada.html"
   }
   ```

3. **Resolve the module paths.** Despite the `./` prefix and the fact that every other bundle lives under `/js/`, modules are served from the **root**: `/modules/settings/services_settings/reboot_schedule/controllers-<hash>.js`. Getting this wrong yields 404s that look like the module does not exist.

4. **Download and scrape.** Grep each module for path-shaped string literals.

## Just run the script

```bash
node scripts/dump-endpoints.mjs https://192.168.1.10
```

No credentials needed. It reads `/api/info` for the firmware version and writes `docs/endpoints/controller-api<N>-<firmware>.txt`, so dumps from different firmware sit side by side and diff cleanly.

```
controller: 6.2.14.12 (api v3)
manifest:   /js/su/configJson-9cdc9a57dd.js
modules:    225
endpoints:  224
written:    docs/endpoints/controller-api3-6.2.14.12.txt
```

Each entry records which UI module uses the path, which tells you what screen to open if you need to watch the real request:

```
/setting/service/rebootSchedules
    modules: settings/services_settings/reboot_schedule
```

## Confirming an endpoint and its shape

The dump gives you paths, not verbs or payloads. To get those, grep the module that owns the path — the UI states both:

```bash
grep -oE '.{90}rebootSchedules.{140}' <module>.js
```

which yields, in this case, `POST` to create, `PUT` to update, `DELETE` with the id appended.

Then probe it. **The controller's error codes distinguish "wrong path" from "wrong parameters", which is the key diagnostic:**

| Code | Meaning |
|---|---|
| `0` | Success |
| `-1600` | **Unsupported request path** — the endpoint does not exist on this firmware/API |
| `-1001` | **Invalid request parameters** — the endpoint *does* exist; your arguments are wrong |
| `-30109` | Invalid username or password (internal API login) |
| `-39006` | Device does not exist |
| `-7131` | Controller ID does not exist |

A `-1001` is good news. It means you have found a real endpoint and only need to work out its arguments — often the message names the missing fields directly:

```json
{"errorCode":-1001,"msg":"Parameter [region] is null\nParameter [scenario] is null\n"}
```

That single response is what revealed that site settings `PATCH` validates the `site` block as a unit and requires `region` and `scenario` alongside `timeZone`.

Conversely, do not conclude a feature is missing because a guessed path returns `-1600`. Reboot schedules were initially declared absent on that basis; the real path was `/setting/service/rebootSchedules` (plural) while the guesses had been `rebootSchedule`, `setting/reboot` and `setting/service/reboot`. **Mine the manifest before concluding anything is unsupported.**

## Safe probing

Read endpoints are safe to probe freely. For writes, probe without changing state by aiming at an object that cannot exist:

```bash
# Does this endpoint exist, and does my app have write permission?
curl -sk -X PATCH ".../sites/<siteId>/lan-networks/000000000000000000000000" \
     -H "Authorization: AccessToken=$TOKEN" -d '{"name":"probe"}'
```

`-1001`/not-found means the path exists and you are authorised — validation was reached. A permission error means your Open API app was created read-only. Nothing is modified either way.

## Caveats

- This API is undocumented and TP-Link may change it in any firmware release. That is precisely why dumps are committed per firmware version.
- A path appearing in the UI source does not guarantee your hardware supports it; a controller managing no switches may still ship switch modules.
- Scraped paths are templates. Placeholders appear as `${...}` fragments or are concatenated at runtime, so some entries are partial.
- The scraper's path prefixes are a heuristic (see `PATH_RE` in the script). Widen it if you are hunting something it misses.
