import type { Row } from './types.js';

export function printPlain(rows: Row[]) {
  const headers = [
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
  ];
  const mapRow = (r: Row) => [
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
  ];

  const all = [headers, ...rows.map(mapRow)];
  const widths = headers.map((_, i) =>
    Math.max(...all.map((row) => String(row[i]).length)),
  );
  const fmt = (vals: string[]) =>
    `${vals[0].padEnd(widths[0])}  ${vals[1].padEnd(widths[1])}  ${vals[2].padEnd(widths[2])}  ${vals[3].padEnd(widths[3])}  ${vals[4].padEnd(widths[4])}  ${vals[5].padEnd(widths[5])}  ${vals[6].padEnd(widths[6])}  ${vals[7].padStart(widths[7])}  ${vals[8].padEnd(widths[8])}  ${vals[9].padStart(widths[9])}`;

  console.log(fmt(headers));
  console.log(fmt(widths.map((w) => '-'.repeat(w))));
  for (const r of rows) {
    console.log(fmt(mapRow(r)));
  }
}

export function printTsv(rows: Row[]) {
  const headers = [
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
  ];
  console.log(headers.join('\t'));
  for (const r of rows) {
    console.log(
      [
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
      ].join('\t'),
    );
  }
}

export function printMarkdown(rows: Row[]) {
  const headers = [
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
  ];
  console.log(`| ${headers.join(' | ')} |`);
  console.log(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const r of rows) {
    console.log(
      `| ${[
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
      ].join(' | ')} |`,
    );
  }
}
