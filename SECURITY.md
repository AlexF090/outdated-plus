# Security Policy

## Supported versions

Only the latest release receives security fixes.

## Reporting a vulnerability

Please do not open a public issue. Report vulnerabilities through a [private security advisory](https://github.com/AlexF090/outdated-plus/security/advisories/new) and include steps to reproduce. You will receive a response within a few days.

## Security measures

- No runtime dependencies. Development dependencies are pinned to exact versions and installed from a committed lockfile.
- Lifecycle scripts are disabled during installation (`ignore-scripts=true` in `.npmrc`).
- Releases are published from GitHub Actions through npm trusted publishing with a provenance attestation.
- GitHub Actions are pinned to commit SHAs.
- Registry credentials from `.npmrc` are only sent to the registry they are configured for, and redirects are not followed.
