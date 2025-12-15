# outdated-plus

A CLI tool that extends `npm outdated` with publication dates and age information for packages. Shows when packages were published and how old they are, helping you make informed decisions about updates.

**Core Feature: Zero Dependencies** - This tool has no runtime dependencies, ensuring security, independence, and reliability by using only Node.js built-in modules.

## Features

- 🔒 **Zero Dependencies**: No runtime dependencies - uses only Node.js built-in modules. This core feature ensures independence from external tools and significantly reduces the attack surface, making the tool more secure and reliable.
- 📅 **Publication Dates**: Shows when the wanted and latest versions were published
- ⏰ **Age Information**: Displays how many days ago packages were published
- 🔄 **Bump Type Analysis**: Shows whether updates are major, minor, or patch releases
- 📊 **Multiple Output Formats**: Plain text and Markdown formats
- 🎯 **Filtering**: Filter packages by age (e.g., only show packages older than 30 days)
- 🔀 **Flexible Sorting**: Sort by name, age, publication date, or version
- ⚡ **Concurrent Processing**: Configurable concurrency for faster metadata fetching
- 🚫 **Skip Dependencies**: Skip specific packages or versions from the output using CLI flags or config files
- 🧹 **Auto-Cleanup**: Automatically remove outdated skip entries from config files

## Data Sources

This tool uses the following data sources to provide package information:

1. **npm outdated** (default mode): The list of outdated packages is retrieved using `npm outdated --json`, which provides the current, wanted, and latest versions for each package. Publication dates are then fetched from the npm Registry API for these packages.

2. **npm Registry API** (`--check-all` mode): When using the `--check-all` flag, the tool bypasses `npm outdated` and checks all packages directly via HTTP requests to `https://registry.npmjs.org`. This mode:
   - Reads all dependencies from `package.json`
   - Fetches metadata for each package from the npm Registry API
   - Compares installed versions (from `package-lock.json`) with latest versions
   - Shows all packages that have updates available, not just those detected by `npm outdated`

3. **npm Registry API** (publication dates): Publication dates and metadata are fetched directly from the npm Registry API at `https://registry.npmjs.org`. The tool makes HTTP requests to retrieve:
   - Version information (latest version from dist-tags)
   - Publication timestamps for all versions (from the `time` field in the registry response)

All data is fetched in real-time during execution - no cached data is used.

## Zero Dependencies

This package has **zero runtime dependencies** - a core feature that ensures security and independence.

### Why Zero Dependencies Matters

- **Security**: No external dependencies means no dependency vulnerabilities. You're not exposed to supply chain attacks through third-party packages.
- **Independence**: The tool doesn't rely on other packages that could break, be compromised, or become unavailable.
- **Reliability**: Fewer moving parts mean fewer potential points of failure.
- **Trust**: You can audit the entire codebase without worrying about hidden dependencies.

### Technical Details

The tool uses only Node.js built-in modules:
- `node:child_process` - for spawning npm commands
- `node:fs` - for reading package.json and config files
- `node:path` - for path operations
- Native `fetch` API - for HTTP requests to the npm registry (available in Node.js 22+)

All dependencies listed in `package.json` are **development dependencies only** (TypeScript, ESLint, Prettier, Vitest, etc.) and are **not included** in the published package. When you install `outdated-plus`, you get only the compiled JavaScript code with zero external runtime dependencies.

## Installation

### Global Installation
```bash
npm install -g outdated-plus
```

### Local Installation
```bash
npm install --save-dev outdated-plus
```

## Usage

### Basic Usage
```bash
outdated-plus
```

### With Options
```bash
outdated-plus --older-than 30 --format md --sort-by age_latest
```

## Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--older-than N` | Only show packages older than N days | 0 (show all) |
| `--show-all` | Show all outdated packages regardless of age | false |
| `--wanted` | Show Wanted version columns (hidden by default) | false |
| `--format FORMAT` | Output format: `plain` or `md` | `plain` |
| `--sort-by FIELD` | Sort by: `name`, `age` (alias for `age_latest`), `published` (alias for `published_latest`), `age_latest`, `age_wanted`, `published_latest`, `published_wanted`, `current`, `wanted`, `latest` | `published_latest` |
| `--order ORDER` | Sort order: `asc` or `desc` | `desc` |
| `--iso` | Use ISO date format | false |
| `--concurrency N` | Number of concurrent requests for metadata | 12 |
| `--skip PACKAGES` | Comma-separated list of packages to skip | none |
| `--quiet` | Suppress progress bar and non-essential output | false |
| `--check-all` | Check ALL packages via HTTP (not just those found by `npm outdated`). Slower but shows everything | false |

## Output Format

The tool displays the following information for each outdated package:

### Default Output (7 columns)
- **Package**: Package name
- **Current**: Currently installed version
- **Latest**: Latest available version
- **To Latest**: Bump type to reach latest version (major/minor/patch)
- **Published**: When the latest version was published
- **Age(d)**: Days since latest version was published
- **#**: Row number

### With `--wanted` Flag (11 columns)
Additionally shows:
- **Wanted**: Version that satisfies your semver range
- **To Wanted**: Bump type to reach wanted version
- **Published (Wanted)**: When the wanted version was published
- **Age(d) (Wanted)**: Days since wanted version was published
- **#**: Row number

### Example Output

#### Plain Text Format (default)
```
Package     Current  Latest  To Latest  Published         Age(d)  #
----------  -------  ------  ---------  ----------------  ------  -
package-a   1.0.0    2.0.0   major      2023-11-15 10:00      16  1
package-b   2.0.0    2.1.0   minor      2023-11-20 10:00      11  2
```

#### With `--wanted` Flag
```
Package     Current  Wanted  To Wanted  Latest  To Latest  Published (Wanted)  Age(d) (Wanted)  Published (Latest)  Age(d) (Latest)  #
----------  -------  ------  ---------  ------  ---------  ------------------  ---------------  ------------------  ---------------  -
package-a   1.0.0    1.1.0   minor      2.0.0   major      2023-11-01 10:00   30               2023-11-15 10:00    16               1
package-b   2.0.0    2.0.0   same       2.1.0   minor      2023-10-01 10:00   61               2023-11-20 10:00    11               2
```


## Skip Dependencies

You can skip specific packages or versions from the output using the `--skip` flag or a configuration file. Skipped packages are displayed in an info message at the top of the output (unless `--quiet` is used).

### Skip Syntax

- **Entire package**: `package-name` - skips all versions of the package
- **Specific version**: `package-name@version` - only skips that specific version
- **Scoped packages**: `@scope/package@version` - works with scoped packages

### Configuration File

Create a `.outdated-plus-skip` file in your project root:

```json
{
  "packages": [
    "react",
    "react-refresh@7.0.0",
    "@types/react@18.2.0"
  ],
  "reason": "These packages are intentionally kept at older versions",
  "autoCleanup": true
}
```

### Auto-Cleanup

When `autoCleanup` is enabled (default: `true`), the tool automatically removes skip entries that are no longer relevant:

- Package entries are removed when the package is no longer outdated
- Version-specific entries are removed when that version is no longer the wanted or latest version

This prevents your skip file from accumulating outdated entries over time.

## Examples

### Show packages older than 30 days in markdown format
```bash
outdated-plus --older-than 30 --format md
```

### Sort by age and export as Markdown
```bash
outdated-plus --sort-by age_latest --format md > outdated.md
```

### Show all packages with ISO dates
```bash
outdated-plus --show-all --iso
```

### Skip specific packages
```bash
outdated-plus --skip "react,vue,angular"
```

### Use a config file to skip packages
Create a `.outdated-plus-skip` file in your project root - it will be automatically detected:

```bash
outdated-plus
```

### Skip specific versions
```bash
outdated-plus --skip "react-refresh@7.0.0,typescript@5.0.0"
```

### Mix of package and version skips
```bash
outdated-plus --skip "react,react-refresh@7.0.0,vue@3.2.0"
```

### Check all packages (not just outdated ones)
```bash
outdated-plus --check-all
```

### Quiet mode (suppress progress bar)
```bash
outdated-plus --quiet
```

## Use Cases

- **Security Updates**: Identify packages that haven't been updated in a long time
- **Maintenance Planning**: Plan updates based on package age and bump types
- **Dependency Analysis**: Understand the freshness of your dependencies
- **CI/CD Integration**: Export data for automated dependency management

## Development

### Prerequisites
- Node.js 22+ (LTS)
- TypeScript 5+

### Setup
```bash
npm install
npm run build
```

### Scripts
- `npm run build`: Compile TypeScript to JavaScript
- `npm run start`: Run the compiled CLI
- `npm run dev`: Watch mode for development

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
