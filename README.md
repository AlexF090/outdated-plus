# outdated-plus

[![CI](https://github.com/AlexF090/outdated-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/AlexF090/outdated-plus/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/outdated-plus)](https://www.npmjs.com/package/outdated-plus)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

See how old your dependencies are. `outdated-plus` lists every direct dependency of a project with the installed and the latest version and when each was released.

```
┌──────────────────┬─────────┬────────────┬──────────┬─────────┬────────────┬─────────┐
│ Package          │ Current │ Released   │ Age      │ Latest  │ Released   │ Age     │
├──────────────────┼─────────┼────────────┼──────────┼─────────┼────────────┼─────────┤
│ typescript (dev) │ 6.0.3   │ 2026-02-25 │ 210 days │ 7.0.2   │ 2026-08-13 │ 41 days │
│ eslint (dev)     │ 10.8.0  │ 2026-07-25 │ 60 days  │ 10.11.0 │ 2026-09-11 │ 12 days │
│ prettier (dev)   │ 3.9.8   │ 2026-07-05 │ 80 days  │ 3.9.8   │ 2026-07-05 │ 80 days │
└──────────────────┴─────────┴────────────┴──────────┴─────────┴────────────┴─────────┘
```

- Works with **npm, pnpm, yarn and bun**
- **Zero runtime dependencies**, only Node.js built-in modules
- Uses the registry and credentials from your `.npmrc`, including scoped and private registries

## Usage

Requires Node.js 22.18 or later. Run it in a directory that contains a `package.json` and installed dependencies:

```bash
npx outdated-plus
pnpm dlx outdated-plus
yarn dlx outdated-plus
bunx outdated-plus
```

Or install it as a development dependency and add a script:

```json
{
  "scripts": {
    "deps": "outdated-plus"
  }
}
```

Options:

| Option            | Description             |
| ----------------- | ----------------------- |
| `-h`, `--help`    | Show the help           |
| `-v`, `--version` | Show the version number |

## Reading the table

- **Package**: name from `package.json`, with `(dev)`, `(optional)` or `(peer)` for dependencies outside `dependencies`
- **Current**: version installed in `node_modules`, or `missing` if the package is not installed
- **Latest**: version with the `latest` tag in the registry. The changed part is highlighted in the style of `pnpm outdated`:
  - green: patch update
  - yellow: minor update
  - red: major update, or an update of a `0.x` or prerelease version
- **Released** and **Age**: release date (UTC) of the version and the days since then. Ages of 90 days or more are yellow, one year or more red.

Rows are sorted by the severity of the available update, then by name. Colors follow the terminal and respect `NO_COLOR` and `FORCE_COLOR`.

Packages that could not be loaded from the registry are shown with `–` and listed in a warning on stderr.

## How it works

1. Reads `dependencies`, `devDependencies`, `optionalDependencies` and `peerDependencies` from `package.json`. Local, workspace, git and tarball dependencies are skipped; `npm:` aliases are resolved to the real package name.
2. Resolves the installed version from `node_modules/<name>/package.json`, searching parent directories like Node.js does. This covers hoisted workspaces and the symlinked layouts of pnpm and bun.
3. Fetches the package metadata from the registry, 12 requests in parallel. The full metadata document is required because only it contains the release time of every version.

### Registry configuration

The registry is read from `npm_config_registry`, the project `.npmrc` and `~/.npmrc`, in that order of precedence. Supported keys:

```ini
registry=https://registry.example.com/
@company:registry=https://npm.company.com/
//npm.company.com/:_authToken=${NPM_TOKEN}
```

`${VARIABLE}` references are expanded from the environment. Credentials are only sent to the matching registry, and redirects are not followed.

### Limitations

- Only the `package.json` in the current directory is checked. For workspaces, run the tool in each package.
- Yarn Plug'n'Play is not supported because there is no `node_modules` folder. Use `nodeLinker: node-modules` in `.yarnrc.yml`.

## Exit codes

| Code | Meaning                                                                   |
| ---- | ------------------------------------------------------------------------- |
| 0    | Table printed                                                             |
| 1    | Invalid option, no readable `package.json`, or no package could be loaded |
| 130  | Cancelled with Ctrl+C                                                     |

## Development

Requires Node.js 22.18 or later and pnpm.

```bash
pnpm install
pnpm check   # type check, formatting and tests
pnpm build   # compile to dist/
node dist/bin.js
```

Tests use the built-in `node:test` runner and run directly on the TypeScript sources. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
