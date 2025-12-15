import type { Row } from './types.js';

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
      console.log(`i  ${message}`);
      console.log('');
  }
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
      ]
    : ['Package', 'Current', 'Latest', 'To Latest', 'Published', 'Age(d)'];

  const mapRow = (r: Row) =>
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
        ]
      : [
          r.Package,
          r.Current,
          r.Latest,
          r.ToLatest,
          r.PublishedLatest,
          r.AgeLatest,
        ];

  const all = [headers, ...rows.map(mapRow)];
  const widths = headers.map((_, i) =>
    Math.max(...all.map((row) => String(row[i]).length)),
  );

  const fmt = (vals: string[]) =>
    vals
      .map((v, i) =>
        i === vals.length - 1 ? v.padStart(widths[i]) : v.padEnd(widths[i]),
      )
      .join('  ');

  console.log(fmt(headers));
  console.log(fmt(widths.map((w) => '-'.repeat(w))));
  for (const r of rows) {
    console.log(fmt(mapRow(r)));
  }
}

export function printMarkdown(rows: Row[], showWanted = false) {
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
      ]
    : ['Package', 'Current', 'Latest', 'To Latest', 'Published', 'Age(d)'];

  console.log(`| ${headers.join(' | ')} |`);
  console.log(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const r of rows) {
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
        ]
      : [
          r.Package,
          r.Current,
          r.Latest,
          r.ToLatest,
          r.PublishedLatest,
          r.AgeLatest,
        ];
    console.log(`| ${values.join(' | ')} |`);
  }
}
