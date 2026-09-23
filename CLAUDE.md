# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm check          # typecheck + prettier check + node:test
pnpm test           # node --test "tests/**/*.test.ts"
pnpm typecheck      # tsc --noEmit (src and tests)
pnpm build          # tsc -p tsconfig.build.json → dist/
pnpm format:write   # prettier --write .
node dist/bin.js    # run the built CLI in the current directory
```

Single test file: `node --test tests/semver.test.ts`

## Constraints

- Zero runtime dependencies. Development dependencies: `typescript`, `@types/node`, `prettier` only.
- Node.js >= 22.18: TypeScript sources run directly via type stripping in tests, so only erasable syntax is allowed (`erasableSyntaxOnly`) and relative imports use `.ts` extensions (rewritten to `.js` on build).
- ESM (`"type": "module"`).

## Architecture

Data flow: `bin.ts` → `cli.run()` → `project.readDependencies()` → `registry.fetchAllMetadata()` → `rows.buildRows()` + `rows.sortRows()` → `table.renderTable()`.

| File              | Purpose                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `src/bin.ts`      | Process entry: reads version, detects color support, wires SIGINT/SIGTERM to an `AbortController`, sets the exit code               |
| `src/cli.ts`      | `run(options)`: argument parsing (`util.parseArgs`), orchestration, warnings. All I/O is injected via `RunOptions`                  |
| `src/project.ts`  | Reads `package.json`, skips non-registry specifiers, resolves `npm:` aliases, finds installed versions by walking up `node_modules` |
| `src/registry.ts` | `.npmrc` parsing, registry and credential resolution, full packument fetch with bounded concurrency and timeout                     |
| `src/semver.ts`   | SemVer 2.0 parsing, precedence, and `diffVersions` (pnpm-style change classification and highlighted suffix)                        |
| `src/rows.ts`     | Combines dependencies and metadata into `Row`s, sorts by change severity                                                            |
| `src/table.ts`    | Renders the box table with `util.styleText`                                                                                         |
| `src/format.ts`   | Date and age formatting                                                                                                             |
| `src/types.ts`    | Shared interfaces                                                                                                                   |

## Tests

- `node:test` + `node:assert/strict`, one file per module in `tests/`.
- No global mocks: `fetch`, streams, time and directories are passed in. File system tests create temporary directories with `mkdtemp`.
