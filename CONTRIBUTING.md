# Contributing

Contributions are welcome, particularly **verification against controllers and firmware we have not tested**. This server's behaviour depends heavily on which endpoints a given firmware routes, so a dump and a compatibility report from unfamiliar hardware is genuinely valuable — arguably more so than new code.

## Setup

```bash
git clone https://github.com/Zesty0wl/omada-mcp.git
cd omada-mcp
npm install
cp .env.example .env      # then fill it in
npm run build
```

| Command | Purpose |
|---|---|
| `npm run dev` | Run from source with live reload (tsx) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run check` | Lint + type check — **must pass** |
| `npm run lint:fix` | Auto-fix formatting (biome) |
| `npm test` | Vitest suite — **must pass** |

Run `npm run check && npm test` before opening a PR. If the formatter reflows files unrelated to your change, commit that churn separately so your feature diff stays readable.

## Reporting a new firmware version

This is the most useful contribution.

```bash
node scripts/dump-endpoints.mjs https://<your-controller>
```

No credentials required. Then open a PR with:

1. The generated `docs/endpoints/controller-api<N>-<firmware>.txt`.
2. A row added to the firmware table in [`CHANGELOG.md`](CHANGELOG.md).
3. Any corrections to the compatibility matrix in the README — especially tools that work on your firmware but are listed as unsupported, or vice versa.

To check which tools actually work on your controller, exercise the read tools and note the error codes. `-1600` means the endpoint is absent on your firmware; see [docs/endpoint-discovery.md](docs/endpoint-discovery.md) for the full table.

## Adding a tool

One tool per file in `src/tools/`, following the existing shape:

```ts
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';

const schema = z.object({
    siteId: z.string().min(1).optional(),
    thing: z.string().min(1, 'thing is required'),
});

export function registerDoSomethingTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'doSomething',
        { description: 'What it does, and any preconditions.', inputSchema: schema.shape },
        wrapToolHandler('doSomething', async ({ siteId, thing }) => toToolResult(await client.doSomething(thing, siteId)))
    );
}
```

Then:

1. Add the client method to the relevant `src/omadaClient/*.ts` operations class, and expose it on the `OmadaClient` facade in `src/omadaClient/index.ts`.
2. Import and call your `register*` function in `src/tools/index.ts`.
3. Add the tool name to `expectedTools` in `tests/tools/index.test.ts` — the suite asserts the manifest matches exactly and will fail otherwise.
4. Document it in the README tool tables and the compatibility matrix.

### Gotcha: do not use `siteInputSchema.extend()` at module top level

`src/server/common.ts` imports `registerAllTools` from `src/tools/index.ts`, which imports every tool module — a cycle. A tool module that evaluates `siteInputSchema.extend({...})` **at module scope** can therefore run while `common.ts` is still initialising, and `siteInputSchema` will be `undefined`:

```
TypeError: Cannot read properties of undefined (reading 'extend')
```

Whether it breaks depends on import order, so it can appear to work until someone adds an import above yours. Two safe options:

- Declare a standalone `z.object({ siteId: z.string().min(1).optional(), ... })`, as most existing tools do. **Preferred.**
- Reference `siteInputSchema.shape` only *inside* the register function, where evaluation is deferred — fine for tools taking no arguments beyond `siteId`.

### Choosing an API

Prefer the Open API. Reach for the internal API only when the Open API does not route the endpoint on real hardware, and when you do:

- Guard with `hasInternalApi` and fall back to the Open API where a fallback exists (see `getSwitchPorts`).
- Where there is no fallback, throw the standard message naming `OMADA_WEB_USERNAME` and `OMADA_WEB_PASSWORD`.
- State the requirement in the tool description — it surfaces to the model and to users.
- Note the firmware you verified against in your PR.

## Writing tools that touch configuration

Destructive or state-changing tools should set `destructiveHint: true` and say plainly in the description what will change. Prefer a specific tool over a general one where a footgun exists: `setSiteTimeZone` exists rather than leaving callers to hand-build a `site` patch, because the controller silently requires `region` and `scenario` alongside it.

## Commits and PRs

- Conventional commit prefixes (`feat:`, `fix:`, `docs:`, `chore:`, `test:`).
- Explain *why*, and name the firmware you tested against.
- Update `CHANGELOG.md` under `Unreleased`, noting the firmware if the change is firmware-specific.
- Keep formatting churn in its own commit.

## Staying current with upstream

See [Updating from upstream](README.md#updating-from-upstream) in the README.

## Security

Never commit credentials. `.env`, `.env.local` and `.env.*` are gitignored; `.env.example` is the template.

`OMADA_WEB_PASSWORD` is a full controller administrator credential — the internal API is the web UI's own API and inherits that account's privileges. Treat it accordingly in anything you write, and never log it.

If you find a security issue, open a private advisory rather than a public issue.
