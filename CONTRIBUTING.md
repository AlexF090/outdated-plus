# Contributing

## Setup

Requires Node.js 22.18 or later and pnpm (the version is pinned in `package.json` under `packageManager`).

```bash
pnpm install
pnpm check
```

## Guidelines

- The package has no runtime dependencies. Use Node.js built-in modules instead of adding one.
- Add or update tests in `tests/` for every behavior change. Tests use `node:test` and run directly on the TypeScript sources.
- Keep input and output at the edges: `src/bin.ts` wires the process, all other modules receive their dependencies (file system paths, `fetch`, streams) as parameters.
- Formatting is done by Prettier: `pnpm format:write`.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).

## Release

1. Update `CHANGELOG.md` and the version in `package.json`.
2. Create and push a tag `v<version>`. The release workflow publishes the package to npm.
