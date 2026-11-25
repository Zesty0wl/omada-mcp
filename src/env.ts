import { existsSync } from 'node:fs';

import { config } from 'dotenv';

// quiet: dotenv 17+ logs to stdout by default, which corrupts the MCP stdio stream.
// Load .env first (base config)
config({ path: '.env', quiet: true });

// Load .env.local if it exists (overrides)
if (existsSync('.env.local')) {
    config({ path: '.env.local', override: true, quiet: true });
}
