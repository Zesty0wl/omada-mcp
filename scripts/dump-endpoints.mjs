#!/usr/bin/env node
/**
 * Dump the internal web UI API surface of an Omada controller.
 *
 * The controller ships no OpenAPI/Swagger document, but its web UI is a set of
 * lazily loaded modules, and each module carries the API paths it calls as plain
 * string literals. Enumerating the modules therefore enumerates the API.
 *
 * No credentials are required: the UI bundles are served unauthenticated.
 *
 * Usage:
 *   node scripts/dump-endpoints.mjs https://<controller> [--out docs/endpoints] [--strict-ssl]
 *
 * Output is written to <out>/<model>-<firmware>.txt, so dumps from different
 * firmware versions sit side by side and stay comparable.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = process.argv.slice(2);
const baseUrl = args.find((a) => a.startsWith('http'))?.replace(/\/$/, '');
const outDir = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'docs/endpoints';

if (!baseUrl) {
    console.error('usage: node scripts/dump-endpoints.mjs https://<controller> [--out DIR] [--strict-ssl]');
    process.exit(1);
}

// Omada controllers almost always present a self-signed certificate, so
// verification is disabled by default. Pass --strict-ssl if yours has a real one.
const strictSsl = args.includes('--strict-ssl');
if (!strictSsl) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const CONCURRENCY = 20;

/** Paths we consider "API-shaped" when scanning module source. */
const PATH_RE =
    /["'`](\/(?:setting|sites|cmd|insight|stat|dashboard|devices|clients|users|maintenance|profiles|tools|health|eaps|switches|gateways)[A-Za-z0-9/_{}$.-]*)["'`]/g;

async function get(path) {
    const res = await fetch(`${baseUrl}${path}`);
    if (!res.ok) throw new Error(`${res.status} ${path}`);
    return await res.text();
}

async function mapLimit(items, limit, fn) {
    const out = [];
    let i = 0;
    await Promise.all(
        Array.from({ length: Math.min(limit, items.length) }, async () => {
            while (i < items.length) {
                const idx = i++;
                out[idx] = await fn(items[idx]).catch(() => null);
            }
        })
    );
    return out;
}

async function main() {
    // 1. Identify the controller so the dump can be labelled by firmware.
    let model = 'omada';
    let firmware = 'unknown';
    try {
        const info = JSON.parse(await get('/api/info')).result ?? {};
        firmware = info.controllerVer ?? 'unknown';
        model = `controller-api${info.apiVer ?? 'x'}`;
        console.log(`controller: ${firmware} (api v${info.apiVer})`);
    } catch {
        console.warn('warning: /api/info unavailable — dump will be labelled "unknown"');
    }

    // 2. The root document lists the eagerly loaded bundles. One of them,
    //    configJson, is the manifest of every lazily loaded UI module.
    const root = await get('/');
    const scripts = [...root.matchAll(/src="([^"]+\.js[^"]*)"/g)].map((m) => m[1]);
    const configJsonRef = scripts.find((s) => /configJson/.test(s));
    if (!configJsonRef) throw new Error('could not find configJson manifest in the controller root document');
    console.log(`manifest:   /${configJsonRef}`);

    // 3. Every module is declared as "./modules/<path>/controllers-<hash>.js"
    //    and served from /modules/... (note: NOT under /js/).
    const manifest = await get(`/${configJsonRef}`);
    const modules = [...new Set([...manifest.matchAll(/\.\/(modules\/[A-Za-z0-9/_-]+\/controllers-[0-9a-f]+\.js)/g)].map((m) => m[1]))];
    console.log(`modules:    ${modules.length}`);

    // 4. Fetch every module and scrape its path literals.
    const sources = await mapLimit(modules, CONCURRENCY, (m) => get(`/${m}`));
    const found = new Map();
    sources.forEach((src, idx) => {
        if (!src) return;
        const moduleName = modules[idx].replace('modules/', '').replace(/\/controllers-[0-9a-f]+\.js$/, '');
        for (const [, path] of src.matchAll(PATH_RE)) {
            if (path.length <= 6) continue;
            if (!found.has(path)) found.set(path, new Set());
            found.get(path).add(moduleName);
        }
    });

    const rows = [...found.entries()].sort(([a], [b]) => a.localeCompare(b));
    console.log(`endpoints:  ${rows.length}`);

    const header = [
        `Omada internal API endpoint dump`,
        `controller firmware : ${firmware}`,
        `generated           : ${new Date().toISOString().slice(0, 10)}`,
        `modules scanned     : ${modules.length}`,
        `distinct paths      : ${rows.length}`,
        ``,
        `Paths are relative. Prefix them with:`,
        `  <controller>/<omadacId>/api/v2/sites/<siteId>`,
        `for site-scoped paths, or <controller>/<omadacId>/api/v2 for controller-scoped ones.`,
        ``,
        `Authenticate with a cookie + Csrf-Token pair from:`,
        `  POST <controller>/<omadacId>/api/v2/login  {"username":"...","password":"..."}`,
        ``,
        `This is an undocumented API and TP-Link may change it between firmware releases.`,
        ``,
        '='.repeat(78),
        ``,
    ].join('\n');

    const body = rows.map(([path, mods]) => `${path}\n    modules: ${[...mods].sort().join(', ')}`).join('\n');

    await mkdir(outDir, { recursive: true });
    const outFile = join(outDir, `${model}-${firmware}.txt`);
    await writeFile(outFile, `${header + body}\n`);
    console.log(`written:    ${outFile}`);
}

main().catch((err) => {
    console.error('failed:', err.message);
    process.exit(1);
});
