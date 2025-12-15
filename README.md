# outdated-plus

**Time information for outdated npm packages - displayed compactly in the CLI with trusted sources.**

Extends `npm outdated` with publication dates and age information. Shows when packages were published and how old they are - directly in the command line, based on data from the official npm Registry API.

**🔒 Zero Dependencies** - No runtime dependencies, only Node.js built-in modules for maximum security and independence.

## Core Features

### Standard Mode (Default)

```bash
outdated-plus
```

Uses `npm outdated` to detect outdated packages and enriches them with time information from the npm Registry API. Fast and efficient.

### Full Check

```bash
outdated-plus --check-all
```

Bypasses `npm outdated` and checks **all** packages directly via the npm Registry API. Slower, but also shows packages that `npm outdated` might miss.

## Requirements

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0

This tool requires access to:

- Filesystem (reads `package.json`, `package-lock.json`, `.outdated-plus-skip`)
- Network (fetches package metadata from npm Registry API)
- npm CLI (for `npm outdated` in standard mode)

## Installation

```bash
npm install -g outdated-plus
# or locally
npm install --save-dev outdated-plus
```

## Output

### Standard (7 columns)

```text
Package     Current  Latest  To Latest  Published         Age(d)  #
----------  -------  ------  ---------  ----------------  ------  -
package-a   1.0.0    2.0.0   major      2023-11-15 10:00      16  1
package-b   2.0.0    2.1.0   minor      2023-11-20 10:00      11  2
```

### With `--wanted` (11 columns)

Additionally shows the "Wanted" version and its publication date.

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--check-all` | Check all packages via HTTP (not just `npm outdated`) | false |
| `--older-than N` | Only show packages older than N days | 0 |
| `--show-all` | Show all outdated packages (ignores `--older-than`) | false |
| `--wanted` | Show Wanted version columns | false |
| `--format FORMAT` | Output format: `plain` or `md` | `plain` |
| `--sort-by FIELD` | Sort by: `name`, `age` (alias: `age_latest`), `age_latest`, `age_wanted`, `published` (alias: `published_latest`), `published_latest`, `published_wanted`, `current`, `wanted`, `latest` | `published_latest` |
| `--order ORDER` | Sort order: `asc` or `desc` | `desc` |
| `--iso` | Use ISO date format | false |
| `--concurrency N` | Number of concurrent requests | 12 |
| `--skip PACKAGES` | Comma-separated list of packages to skip | none |
| `--quiet` | Suppress progress bar and info messages | false |

## Skip Packages

Skip packages via `--skip` flag or `.outdated-plus-skip` file:

```json
{
  "packages": ["react", "react-refresh@7.0.0"],
  "autoCleanup": true
}
```

Syntax: `package-name` (skips all versions) or `package-name@version` (only that version).

**Auto-Cleanup**: When `autoCleanup: true` (default), skip entries are automatically removed from `.outdated-plus-skip` if packages are no longer outdated or have been updated past the skip version.

## Examples

```bash
# Standard: Fast, uses npm outdated
outdated-plus

# Check all packages (slower, but complete)
outdated-plus --check-all

# Only packages older than 30 days, as Markdown
outdated-plus --older-than 30 --format md

# Sort by age
outdated-plus --sort-by age_latest

# Show Wanted versions
outdated-plus --wanted

# Skip specific packages
outdated-plus --skip react,typescript@5.0.0

# Combine options: older packages, ISO dates, sorted by age
outdated-plus --older-than 90 --iso --sort-by age_latest --order asc

# High concurrency for faster checks
outdated-plus --check-all --concurrency 20
```

## Data Sources

- **Standard mode**: `npm outdated --json` for outdated packages + npm Registry API (`https://registry.npmjs.org`) for publication dates
- **`--check-all` mode**: Direct HTTP requests to npm Registry API for all packages from `package.json`
- **Publication dates**: Come directly from the official npm Registry API, no caches

All data is fetched at runtime - no cached data.

## Exit Codes

- `0` - Success (packages checked, may or may not have outdated packages)
- `1` - Error (network failure, parsing error, or other issues)

## Zero Dependencies

**No runtime dependencies** - only Node.js built-in modules (`node:child_process`, `node:fs`, `node:path`, native `fetch`). All dependencies in `package.json` are development dependencies only (TypeScript, ESLint, etc.) and are not included in the published package.

**Benefits:**

- ✅ No dependency vulnerabilities
- ✅ No supply chain attacks
- ✅ Independence from external packages
- ✅ Fully auditable code

## Development

```bash
npm install
npm run build
npm run start
```

### Debugging

Source maps (`.map` files) are excluded from the npm package for production use. For debugging purposes, build the project locally:

```bash
git clone <repository-url>
cd outdated-plus
npm install
npm run build
# Source maps are now available in dist/ for debugging
```

## License

Proprietary - Use Only

This software is provided for use only. Modification, forking, and integration into other projects is prohibited. See LICENSE file for details.

For feature requests or bug reports, please open an issue on the repository.

## Troubleshooting

**No packages found**: Ensure you're in a directory with `package.json` and run `npm install` first.

**Network errors**: Check your internet connection and npm registry access. The tool uses `https://registry.npmjs.org`.

**Invalid skip file**: If `.outdated-plus-skip` has invalid JSON, it will be ignored. Fix the JSON syntax to re-enable skip functionality.

**Concurrency limits**: `--concurrency` is automatically clamped between 1-100. Values outside this range are adjusted automatically.
