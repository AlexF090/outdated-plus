# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2024-12-15

### Added

- Initial release with core functionality
- Support for checking outdated packages via `npm outdated`
- `--check-all` mode for checking all packages via HTTP
- Publication date and age information for packages
- Colored output with terminal support
- Markdown format output (`--format md`)
- Sorting options (`--sort-by`, `--order`)
- Filtering by age (`--older-than`)
- Wanted version display (`--wanted`)
- Skip packages functionality (`--skip` and `.outdated-plus-skip` file)
- Auto-cleanup of skip file entries
- Progress bar for long-running operations
- Quiet mode (`--quiet`)
- ISO date format option (`--iso`)
- Concurrency control (`--concurrency`)

### Security

- Zero runtime dependencies
- Only Node.js built-in modules used
- Security audit scripts included

## [Unreleased]

### Added

- Future features and improvements
