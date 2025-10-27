# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | :white_check_mark: |
| < 1.2   | :x:                |

## Requirements

- Node.js 22+ (LTS)
- npm 11+

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly:

1. **Do not** open a public issue
2. Email the maintainer directly at: [your-email@example.com]
3. Include as much detail as possible about the vulnerability
4. Allow reasonable time for response before public disclosure

## Security Best Practices

This project follows NPM security best practices:

- All dependencies are pinned to exact versions
- Lifecycle scripts are disabled by default
- Provenance statements are enabled
- Regular security audits are performed
- Dependencies are kept up to date

### Running Security Checks

```bash
# Run security audit
npm run security:check

# Check for vulnerabilities
npm audit

# Verify package signatures
npm audit signatures

# Fix automatically fixable issues
npm audit fix
```

## Dependencies

This project uses the following security measures:

- **Exact version pinning**: All dependencies use exact versions (no `^` or `~`)
- **Lockfile**: `package-lock.json` is committed to ensure reproducible builds
- **Audit signatures**: Package integrity is verified using npm audit signatures
- **Minimal dependencies**: Only necessary dependencies are included

## Security Configuration

The project uses the following security configuration in `.npmrc`:

```
ignore-scripts=true
provenance=true
save-exact=true
save-prefix=''
audit-level=moderate
strict-peer-deps=true
engine-strict=true
```

For more information about NPM security best practices, see:
https://github.com/bodadotsh/npm-security-best-practices
