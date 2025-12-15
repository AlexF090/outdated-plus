import { colorAge, colorBumpType, colors, isColorEnabled } from './colors.js';
import type { BumpType, Row } from './types.js';

export function printSkippedInfo(
  skippedPackages: string[],
  format: 'plain' | 'md',
) {
  if (skippedPackages.length === 0) {
    return;
  }

  const message = `Skipped ${skippedPackages.length} package(s): ${skippedPackages.join(', ')}`;

  switch (format) {
    case 'md':
      console.log(`> **Note:** ${message}`);
      console.log('');
      break;
    default:
      console.log(`${colors.cyan('i')}  ${message}`);
      console.log('');
  }
}

/**
 * Strip ANSI codes from a string to get actual display length
 * Match and remove ANSI escape sequences (control characters required for terminal colors)
 */
function stripAnsi(str: string): string {
  const regex = new RegExp(`${String.fromCharCode(0x1b)}\\[[0-9;]*m`, 'g');
  return str.replace(regex, '');
}

/**
 * Get display length (excluding ANSI codes)
 */
function displayLength(str: string): number {
  return stripAnsi(str).length;
}

/**
 * Colorize bump type for display
 */
function formatBumpType(bump: BumpType): string {
  return colorBumpType(bump);
}

/**
 * Colorize age for display
 */
function formatAge(ageStr: string): string {
  const age = parseInt(ageStr, 10);
  if (isNaN(age)) {
    return ageStr;
  }
  return colorAge(age);
}

export function printPlain(rows: Row[], showWanted = false) {
  const headers = showWanted
    ? [
        'Package',
        'Current',
        'Wanted',
        'To Wanted',
        'Latest',
        'To Latest',
        'Published (Wanted)',
        'Age(d) (Wanted)',
        'Published (Latest)',
        'Age(d) (Latest)',
        '#',
      ]
    : ['Package', 'Current', 'Latest', 'To Latest', 'Published', 'Age(d)', '#'];

  // Build row data with raw values for width calculation
  const rawRows = rows.map((r, i) =>
    showWanted
      ? [
          r.Package,
          r.Current,
          r.Wanted,
          r.ToWanted,
          r.Latest,
          r.ToLatest,
          r.PublishedWanted,
          r.AgeWanted,
          r.PublishedLatest,
          r.AgeLatest,
          String(i + 1),
        ]
      : [
          r.Package,
          r.Current,
          r.Latest,
          r.ToLatest,
          r.PublishedLatest,
          r.AgeLatest,
          String(i + 1),
        ],
  );

  // Build colored row data for display
  const coloredRows = rows.map((r, i) =>
    showWanted
      ? [
          colors.bold(r.Package),
          r.Current,
          r.Wanted,
          formatBumpType(r.ToWanted),
          r.Latest,
          formatBumpType(r.ToLatest),
          r.PublishedWanted,
          formatAge(r.AgeWanted),
          r.PublishedLatest,
          formatAge(r.AgeLatest),
          colors.gray(String(i + 1)),
        ]
      : [
          colors.bold(r.Package),
          r.Current,
          r.Latest,
          formatBumpType(r.ToLatest),
          r.PublishedLatest,
          formatAge(r.AgeLatest),
          colors.gray(String(i + 1)),
        ],
  );

  // Calculate widths based on raw (uncolored) values
  const all = [headers, ...rawRows];
  const widths = headers.map((_, i) =>
    Math.max(...all.map((row) => String(row[i]).length)),
  );

  // Format function that handles colored strings
  const fmt = (vals: string[], useColor: boolean) =>
    vals
      .map((v, i) => {
        const rawLen = useColor ? displayLength(v) : v.length;
        const padding = widths[i] - rawLen;
        // Right-align last column (#) and Age columns
        // Age columns are at indices:
        // - showWanted=false: 5 (Age), 6 (#)
        // - showWanted=true: 7 (AgeWanted), 9 (AgeLatest), 10 (#)
        const isNumeric = showWanted
          ? i === 7 || i === 9 || i === 10
          : i === 5 || i === 6;

        if (isNumeric) {
          return ' '.repeat(Math.max(0, padding)) + v;
        }
        return v + ' '.repeat(Math.max(0, padding));
      })
      .join('  ');

  // Print header with colors if enabled
  const coloredHeaders = isColorEnabled()
    ? headers.map((h) => colors.gray(h))
    : headers;
  console.log(fmt(coloredHeaders, isColorEnabled()));
  console.log(
    fmt(
      widths.map((w) => '-'.repeat(w)),
      false,
    ),
  );

  // Print rows with colors
  for (const coloredRow of coloredRows) {
    console.log(fmt(coloredRow, true));
  }
}

export function printMarkdown(rows: Row[], showWanted = false) {
  // Markdown output without colors (for file output compatibility)
  const headers = showWanted
    ? [
        'Package',
        'Current',
        'Wanted',
        'To Wanted',
        'Latest',
        'To Latest',
        'Published (Wanted)',
        'Age(d) (Wanted)',
        'Published (Latest)',
        'Age(d) (Latest)',
        '#',
      ]
    : ['Package', 'Current', 'Latest', 'To Latest', 'Published', 'Age(d)', '#'];

  console.log(`| ${headers.join(' | ')} |`);
  console.log(`| ${headers.map(() => '---').join(' | ')} |`);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const values = showWanted
      ? [
          r.Package,
          r.Current,
          r.Wanted,
          r.ToWanted,
          r.Latest,
          r.ToLatest,
          r.PublishedWanted,
          r.AgeWanted,
          r.PublishedLatest,
          r.AgeLatest,
          String(i + 1),
        ]
      : [
          r.Package,
          r.Current,
          r.Latest,
          r.ToLatest,
          r.PublishedLatest,
          r.AgeLatest,
          String(i + 1),
        ];
    console.log(`| ${values.join(' | ')} |`);
  }
}
