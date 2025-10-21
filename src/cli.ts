#!/usr/bin/env tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-plusplus */
/* eslint-disable no-console */
/**
 * npm-outdated-with-dates -- Node/TS CLI
 * Mirrors the Python version: shows Published/Age for Wanted and Latest,
 * supports sorting and output formats plain|tsv|md.
 */

import { spawn } from 'node:child_process';

type OutdatedEntry = {
  current: string;
  wanted: string;
  latest: string;
};

type OutdatedMap = Record<string, OutdatedEntry>;

type Meta = {
  latest: string;
  timeMap: Record<string, string>;
};

type Row = {
  Package: string;
  Current: string;
  Wanted: string;
  ToWanted: string;
  Latest: string;
  ToLatest: string;
  PublishedWanted: string;
  AgeWanted: string;
  PublishedLatest: string;
  AgeLatest: string;
  _name: string;
  _published_wanted: number;
  _published_latest: number;
  _age_wanted: number;
  _age_latest: number;
  _latest: string;
};

type Args = {
  olderThan: number;
  showAll: boolean;
  iso: boolean;
  concurrency: number;
  sortBy:
    | 'name'
    | 'age'
    | 'published'
    | 'age_latest'
    | 'age_wanted'
    | 'published_latest'
    | 'published_wanted'
    | 'current'
    | 'wanted'
    | 'latest';
  order: 'asc' | 'desc';
  format: 'plain' | 'tsv' | 'md';
};

function parseArgs(argv: string[]): Args {
  const a = new Map<string, string | true>();
  for (let i = 2; i < argv.length; i += 1) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k.startsWith('--')) {
      if (v && !v.startsWith('--')) {
        a.set(k, v);
      } else {
        a.set(k, true);
        i -= 1;
      }
    }
  }
  const sortBy = (a.get('--sort-by') as Args['sortBy']) ?? 'published_latest';
  const order = (a.get('--order') as Args['order']) ?? 'desc';
  const format = (a.get('--format') as Args['format']) ?? 'plain';
  const concurrency = Number(a.get('--concurrency') ?? 12);
  const olderThan = Number(a.get('--older-than') ?? 0);
  const showAll = Boolean(a.get('--show-all'));
  const iso = Boolean(a.get('--iso'));
  // legacy aliases
  const normalizedSort =
    sortBy === 'age'
      ? 'age_latest'
      : sortBy === 'published'
        ? 'published_latest'
        : sortBy;
  return {
    olderThan,
    showAll,
    iso,
    concurrency: Math.max(1, concurrency),
    sortBy: normalizedSort as Args['sortBy'],
    order,
    format,
  };
}

function spawnJson(cmd: string, args: string[]): Promise<unknown> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    child.stdout.on('data', (c) => {
      out += String(c);
    });
    child.on('close', () => {
      try {
        resolve(out.trim() ? JSON.parse(out) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function parseIsoZ(s?: string): number | null {
  if (!s) {
    return null;
  }
  const x = s.endsWith('Z') ? `${s.slice(0, -1)}+00:00` : s;
  const t = Date.parse(x);
  return Number.isFinite(t) ? t : null;
}

function daysAgo(ms: number | null): number | null {
  if (ms === null) {
    return null;
  }
  const delta = Date.now() - ms;
  return Math.max(0, Math.floor(delta / 86400000));
}

function fmtTime(ms: number | null, iso: boolean): string {
  if (ms === null) {
    return '-';
  }
  const d = new Date(ms);
  if (iso) {
    return d.toISOString().slice(0, 16) + 'Z';
  }
  // locale: use system locale, minutes precision
  const date = d.toLocaleDateString();
  const time = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${date} ${time}`;
}

function parseSemver(v: string): [number, number, number, string] | null {
  const re =
    /^[v=]*(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;
  const m = re.exec(v ?? '');
  if (!m) {
    return null;
  }
  return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] ?? ''];
}

function bumpType(
  fromV: string,
  toV: string,
): 'major' | 'minor' | 'patch' | 'prerelease' | 'same' | 'unknown' {
  const a = parseSemver(fromV);
  const b = parseSemver(toV);
  if (!a || !b) {
    return 'unknown';
  }
  if (a[0] === b[0] && a[1] === b[1] && a[2] === b[2]) {
    return a[3] === b[3] ? 'same' : 'prerelease';
  }
  if (a[0] !== b[0]) {
    return 'major';
  }
  if (a[1] !== b[1]) {
    return 'minor';
  }
  if (a[2] !== b[2]) {
    return 'patch';
  }
  return 'unknown';
}

class ProgressBar {
  private total: number;
  private current = 0;
  private enabled: boolean;
  constructor(total: number) {
    this.total = total;
    this.enabled = process.stderr.isTTY;
  }
  update(step = 1) {
    if (!this.enabled) {
      return;
    }
    this.current += step;
    const barLen = 40;
    const ratio = this.total > 0 ? this.current / this.total : 1;
    const filled = Math.max(0, Math.min(barLen, Math.floor(ratio * barLen)));
    const bar = `${'█'.repeat(filled)}${'░'.repeat(barLen - filled)}`;
    const pct = this.total > 0 ? Math.floor(ratio * 100) : 100;
    process.stderr.write(`\r[${bar}] ${pct}% (${this.current}/${this.total})`);
  }
  finish() {
    if (!this.enabled) {
      return;
    }
    process.stderr.write('\r');
    process.stderr.clearLine(0);
  }
}

async function fetchMeta(pkg: string): Promise<Meta> {
  const data = (await spawnJson('npm', [
    'view',
    pkg,
    'time',
    'dist-tags.latest',
    '--json',
  ])) as Record<string, unknown>;
  let latest = '';
  const timeMap: Record<string, string> = {};
  if (data && typeof data === 'object') {
    const dt = (data as any)['dist-tags'];
    if (dt && typeof dt === 'object') {
      latest = String(dt.latest ?? '');
    } else {
      latest = String((data as any)['dist-tags.latest'] ?? '');
    }
    const tm = (data as any).time;
    if (tm && typeof tm === 'object') {
      for (const [k, v] of Object.entries(tm)) {
        if (typeof v === 'string') {
          timeMap[k] = v;
        }
      }
    }
  }
  return { latest, timeMap };
}

function buildRows(
  outdated: OutdatedMap,
  metas: Record<string, Meta>,
  showAll: boolean,
  cutoffDays: number,
  useIso: boolean,
): Row[] {
  const rows: Row[] = [];
  for (const [pkg, info] of Object.entries(outdated)) {
    const current = info.current ?? '';
    const wanted = info.wanted ?? '';
    const latestFromOut = info.latest ?? '';
    const m = metas[pkg] ?? { latest: '', timeMap: {} };
    const latest = m.latest || latestFromOut || '';
    const dtWanted = parseIsoZ(m.timeMap[wanted]);
    const dtLatest = parseIsoZ(m.timeMap[latest]);
    const ageWanted = daysAgo(dtWanted);
    const ageLatest = daysAgo(dtLatest);

    if (!showAll) {
      const meets = [ageWanted, ageLatest].some(
        (a) => a !== null && a >= cutoffDays,
      );
      if (!meets) {
        continue;
      }
    }

    rows.push({
      Package: pkg,
      Current: current,
      Wanted: wanted,
      ToWanted: wanted ? bumpType(current, wanted) : 'unknown',
      Latest: latest,
      ToLatest: latest ? bumpType(current, latest) : 'unknown',
      PublishedWanted: fmtTime(dtWanted, useIso),
      AgeWanted: ageWanted === null ? '-' : String(ageWanted),
      PublishedLatest: fmtTime(dtLatest, useIso),
      AgeLatest: ageLatest === null ? '-' : String(ageLatest),
      _name: pkg.toLowerCase(),
      _published_wanted: dtWanted ?? 0,
      _published_latest: dtLatest ?? 0,
      _age_wanted: ageWanted ?? Number.POSITIVE_INFINITY,
      _age_latest: ageLatest ?? Number.POSITIVE_INFINITY,
      _latest: latest,
    });
  }
  return rows;
}

function sortRows(
  rows: Row[],
  sortBy: Args['sortBy'],
  order: Args['order'],
): Row[] {
  const rev = order === 'desc' ? -1 : 1;
  const cmp = (a: number | string, b: number | string) =>
    (a < b ? -1 : a > b ? 1 : 0) * rev;

  const key = (r: Row): number | string => {
    switch (sortBy) {
      case 'age_latest':
        return r._age_latest;
      case 'age_wanted':
        return r._age_wanted;
      case 'published_latest':
        return r._published_latest;
      case 'published_wanted':
        return r._published_wanted;
      case 'name':
        return r._name;
      case 'current':
        return r.Current;
      case 'wanted':
        return r.Wanted;
      case 'latest':
        return r._latest;
      default:
        return r._published_latest;
    }
  };

  return [...rows].sort((a, b) => cmp(key(a), key(b)));
}

function printPlain(rows: Row[]) {
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

function printTsv(rows: Row[]) {
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

function printMarkdown(rows: Row[]) {
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

async function run(): Promise<number> {
  const args = parseArgs(process.argv);
  // 1) npm outdated
  const outdatedRaw = await spawnJson('npm', ['outdated', '--json']);
  if (
    !outdatedRaw ||
    typeof outdatedRaw !== 'object' ||
    Object.keys(outdatedRaw).length === 0
  ) {
    return 0;
  }
  const outdated = outdatedRaw as OutdatedMap;
  const pkgs = Object.keys(outdated);
  const pb = new ProgressBar(pkgs.length);

  // 2) limited concurrency fetch of metadata
  const limit = Math.max(1, args.concurrency);
  const metas: Record<string, Meta> = {};
  let inFlight = 0;
  let index = 0;

  await new Promise<void>((resolve) => {
    const tick = () => {
      while (inFlight < limit && index < pkgs.length) {
        const p = pkgs[index++];
        inFlight += 1;
        fetchMeta(p)
          .then((m) => {
            metas[p] = m;
          })
          .catch(() => {
            metas[p] = { latest: '', timeMap: {} };
          })
          .finally(() => {
            inFlight -= 1;
            pb.update(1);
            if (index >= pkgs.length && inFlight === 0) {
              resolve();
            } else {
              tick();
            }
          });
      }
    };
    tick();
  });
  pb.finish();

  // 3) build, sort, print
  let rows = buildRows(
    outdated,
    metas,
    args.showAll,
    Math.max(0, args.olderThan),
    args.iso,
  );
  if (rows.length === 0) {
    return 0;
  }
  rows = sortRows(rows, args.sortBy, args.order);

  switch (args.format) {
    case 'tsv':
      printTsv(rows);
      break;
    case 'md':
      printMarkdown(rows);
      break;
    default:
      printPlain(rows);
  }
  return 0;
}

run()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err?.stack || String(err));
    process.exit(1);
  });
