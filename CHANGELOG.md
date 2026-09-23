# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Changed

- **Breaking:** Every direct dependency is always listed in a single table with the columns Package, Current, Released, Age, Latest, Released and Age.
- **Breaking:** Requires Node.js 22.18 or later.
- **Breaking:** Released under the MIT license.
- Installed versions are read from `node_modules`, so npm, pnpm, yarn (node_modules linker) and bun are supported.
- Registry URLs and credentials are read from `.npmrc`, including scoped registries.
- Table layout and version highlighting follow `pnpm outdated`.
- Package is published as ESM.

### Added

- `--help` and `--version` options.
- Release workflow with npm provenance.

### Removed

- **Breaking:** Options `--check-all`, `--older-than`, `--show-all`, `--wanted`, `--format`, `--sort-by`, `--order`, `--iso`, `--concurrency`, `--skip` and `--quiet`.
- **Breaking:** Skip file `.outdated-plus-skip`.
- Markdown output and progress bar.

### Fixed

- The installed version of a package is no longer taken from a nested copy in another package's `node_modules`.

## 1.3.4 - 2026-08-07

### Changed

- Updated development dependencies.

## 1.3.3 - 2026-06-30

### Changed

- Validation of the skip file configuration and stricter argument parsing.
- Updated dependencies.

## 1.3.2 - 2026-03-12

### Changed

- Updated dependencies.

## 1.3.1 - 2026-02-05

### Changed

- Improved stability and performance of registry requests.

## 1.3.0 - 2025-12-16

### Added

- Publication date and age of the wanted and latest version for outdated packages.
- `--check-all` mode that checks every package via the registry.
- Colored output, Markdown output, sorting, filtering by age and a skip file.
