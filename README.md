# outdated-plus

A CLI tool that extends `npm outdated` with publication dates and age information for packages. Shows when packages were published and how old they are, helping you make informed decisions about updates.

## Features

- 📅 **Publication Dates**: Shows when the wanted and latest versions were published
- ⏰ **Age Information**: Displays how many days ago packages were published
- 🔄 **Bump Type Analysis**: Shows whether updates are major, minor, or patch releases
- 📊 **Multiple Output Formats**: Plain text and Markdown formats
- 🎯 **Filtering**: Filter packages by age (e.g., only show packages older than 30 days)
- 🔀 **Flexible Sorting**: Sort by name, age, publication date, or version
- ⚡ **Concurrent Processing**: Configurable concurrency for faster metadata fetching
- 🚫 **Skip Dependencies**: Skip specific packages or versions from the output using CLI flags or config files
- 🧹 **Auto-Cleanup**: Automatically remove outdated skip entries from config files

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
| `--format FORMAT` | Output format: `plain` or `md` | `plain` |
| `--sort-by FIELD` | Sort by: `name`, `age_latest`, `age_wanted`, `published_latest`, `published_wanted`, `current`, `wanted`, `latest` | `published_latest` |
| `--order ORDER` | Sort order: `asc` or `desc` | `desc` |
| `--iso` | Use ISO date format | false |
| `--concurrency N` | Number of concurrent requests for metadata | 12 |
| `--skip PACKAGES` | Comma-separated list of packages to skip | none |

## Output Format

The tool displays the following information for each outdated package:

- **Package**: Package name
- **Current**: Currently installed version
- **Wanted**: Version that satisfies your semver range
- **To Wanted**: Bump type to reach wanted version (major/minor/patch)
- **Latest**: Latest available version
- **To Latest**: Bump type to reach latest version
- **Published (Wanted)**: When the wanted version was published
- **Age(d) (Wanted)**: Days since wanted version was published
- **Published (Latest)**: When the latest version was published
- **Age(d) (Latest)**: Days since latest version was published

### Example Output

#### Plain Text Format (default)
```
Package     Current  Wanted  To Wanted  Latest  To Latest  Published (Wanted)  Age(d) (Wanted)  Published (Latest)  Age(d) (Latest)
----------  -------  ------  ---------  ------  ---------  ------------------  ---------------  ------------------  ---------------
package-a   1.0.0    1.1.0   minor      2.0.0   major      2023-11-01 10:00   30               2023-11-15 10:00    16
package-b   2.0.0    2.0.0   same       2.1.0   minor      2023-10-01 10:00   61               2023-11-20 10:00    11
```

#### Markdown Format (`--format md`)
```markdown
| Package | Current | Wanted | To Wanted | Latest | To Latest | Published (Wanted) | Age(d) (Wanted) | Published (Latest) | Age(d) (Latest) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| package-a | 1.0.0 | 1.1.0 | minor | 2.0.0 | major | 2023-11-01 10:00 | 30 | 2023-11-15 10:00 | 16 |
| package-b | 2.0.0 | 2.0.0 | same | 2.1.0 | minor | 2023-10-01 10:00 | 61 | 2023-11-20 10:00 | 11 |
```


## Skip Dependencies

You can skip specific packages or versions from the output using the `--skip` flag or a configuration file.

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

## Use Cases

- **Security Updates**: Identify packages that haven't been updated in a long time
- **Maintenance Planning**: Plan updates based on package age and bump types
- **Dependency Analysis**: Understand the freshness of your dependencies
- **CI/CD Integration**: Export data for automated dependency management

## Development

### Prerequisites
- Node.js 18+
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
