# npm-outdated-with-dates

A CLI tool that extends `npm outdated` with publication dates and age information for packages. Shows when packages were published and how old they are, helping you make informed decisions about updates.

## Features

- 📅 **Publication Dates**: Shows when the wanted and latest versions were published
- ⏰ **Age Information**: Displays how many days ago packages were published
- 🔄 **Bump Type Analysis**: Shows whether updates are major, minor, or patch releases
- 📊 **Multiple Output Formats**: Plain text, TSV, and Markdown formats
- 🎯 **Filtering**: Filter packages by age (e.g., only show packages older than 30 days)
- 🔀 **Flexible Sorting**: Sort by name, age, publication date, or version
- ⚡ **Concurrent Processing**: Configurable concurrency for faster metadata fetching

## Installation

### Global Installation
```bash
npm install -g npm-outdated-with-dates
```

### Local Installation
```bash
npm install --save-dev npm-outdated-with-dates
```

## Usage

### Basic Usage
```bash
npm-outdated-with-dates
```

### With Options
```bash
npm-outdated-with-dates --older-than 30 --format md --sort-by age_latest
```

## Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--older-than N` | Only show packages older than N days | 0 (show all) |
| `--show-all` | Show all outdated packages regardless of age | false |
| `--format FORMAT` | Output format: `plain`, `tsv`, or `md` | `plain` |
| `--sort-by FIELD` | Sort by: `name`, `age_latest`, `age_wanted`, `published_latest`, `published_wanted`, `current`, `wanted`, `latest` | `published_latest` |
| `--order ORDER` | Sort order: `asc` or `desc` | `desc` |
| `--iso` | Use ISO date format | false |
| `--concurrency N` | Number of concurrent requests for metadata | 12 |

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

## Examples

### Show packages older than 30 days in markdown format
```bash
npm-outdated-with-dates --older-than 30 --format md
```

### Sort by age and export as TSV
```bash
npm-outdated-with-dates --sort-by age_latest --format tsv > outdated.tsv
```

### Show all packages with ISO dates
```bash
npm-outdated-with-dates --show-all --iso
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
