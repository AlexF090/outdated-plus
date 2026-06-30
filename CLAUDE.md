# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # tsc compile → dist/
npm run test           # build + vitest run (all tests)
npm run lint           # eslint src/
npm run lint:fix       # eslint --fix
npm run format:check   # prettier check
npm run format:write   # prettier write
npm run ci:local       # lint + format + test + build + security
npm run test:watch     # build + vitest watch mode
```

Single test file:
```bash
npx vitest run tests/args.test.ts
```

Self-check (run the tool on this repo):
```bash
npm run deps:check        # standard mode (fast)
npm run deps:check-all    # HTTP mode (complete)
```

## Architecture

Two-file source: `src/index.ts` (CLI orchestration) and `src/args.ts` (argument parsing + skip file management). All shared types, utilities, and sub-modules live in `src/lib/`.

**Two operational modes:**
- **Standard** (default): `npm outdated --json` → fetch timestamps for detected outdated packages only
- **`--check-all`**: HTTP-fetch all packages from `package.json` directly, compare against installed versions from `package-lock.json`

**Data flow (`run()`):**
1. `parseArgs` → `Args`
2. Either `spawnJson('npm', ['outdated', '--json'])` or `buildOutdatedMapViaHTTP()`
3. `fetchWithConcurrency()` (lib/concurrency.ts) → `Meta` per package
4. `buildRows()` → filter → `sortRows()` → `printPlain()` / `printMarkdown()`

**Key lib modules:**
- `lib/concurrency.ts` — bounded parallel HTTP with `fetchWithConcurrency<T>`; `META_FALLBACK` is the zero value returned on failure
- `lib/processing.ts` — `buildRows()` maps `OutdatedMap + Meta → Row[]`, applies `--older-than` / `--skip` filters
- `lib/utils.ts` — `parseSkipEntry`, `shouldSkipPackage`, `isVersionHigher`, registry response validators
- `lib/errors.ts` — `NetworkError`, `RegistryError` (both extend `Error`), `formatError`
- `lib/output.ts` — `printPlain`, `printMarkdown`, `printSkippedInfo`
- `lib/constants.ts` — `NPM_REGISTRY`, `HTTP_REQUEST_TIMEOUT_MS`, concurrency bounds, `NODE_MODULES_REGEX`
- `lib/types.ts` — shared types (`Args`, `Row`, `Meta`, `OutdatedMap`, etc.)
- `colors.ts` — ANSI color helpers (`colorize`, `bold`, `dim`); standalone so output.ts stays pure

**Shutdown:** A module-level `shutdownController: AbortController` in `index.ts` is wired to `SIGINT`/`SIGTERM`. Tests expose `__testAbortShutdown` / `__testResetShutdown` via `globalThis` when `VITEST` env is set.

**Skip file (`.outdated-plus-skip`):**
```json
{ "packages": ["react", "typescript@5.0.0"], "autoCleanup": true }
```
`autoCleanup: true` (default) removes stale entries after each run. `--skip` CLI args are persisted back to this file automatically.

## Test Setup

- Framework: Vitest, `pool: 'forks'`, `maxWorkers: 1`, `isolate: false`
- Tests import directly from `src/` (TypeScript), not `dist/` — `npm run test` builds first
- `fetch` is mocked globally at the top of integration/HTTP tests
- `node:child_process` spawn is mocked in `cli.test.ts`

## Build Output

`dist/` contains compiled JS + `.d.ts`. Only `dist/`, `README.md`, `CHANGELOG.md`, `LICENSE` are published (`.npmignore` excludes `src/`, `tests/`, config files). `dist/index.js` is the CLI entry point (`bin.outdated-plus`).
