#!/usr/bin/env node
/**
 * outdated-plus -- Node/TS CLI
 * Mirrors the Python version: shows Published/Age for Wanted and Latest,
 * supports sorting and output formats plain|md.
 */

import { spawn } from 'node:child_process';
import {
  addSkipEntriesToFile,
  cleanupAndSaveSkipFile,
  parseArgs,
} from './args.js';
import { printMarkdown, printPlain, printSkippedInfo } from './lib/output.js';
import { buildRows, sortRows } from './lib/processing.js';
import type { Meta, OutdatedMap } from './lib/types.js';
import { parseSkipEntry, shouldSkipPackage } from './lib/utils.js';

export function spawnJson(cmd: string, args: string[]): Promise<unknown> {
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

export function spawnText(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    child.stdout.on('data', (c) => {
      out += String(c);
    });
    child.on('close', () => {
      resolve(out.trim());
    });
  });
}

export class ProgressBar {
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

export async function fetchMeta(pkg: string, latestVersion?: string): Promise<Meta> {
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
    const dt = data['dist-tags'];
    if (dt && typeof dt === 'object') {
      latest = String((dt as Record<string, unknown>).latest ?? '');
    } else {
      latest = String(data['dist-tags.latest'] ?? '');
    }
    const tm = data.time;
    if (tm && typeof tm === 'object') {
      for (const [k, v] of Object.entries(tm)) {
        if (typeof v === 'string') {
          timeMap[k] = v;
        }
      }
    }
  }

  // If we have a specific latest version from npm outdated, fetch its time
  if (latestVersion && latestVersion !== latest && !timeMap[latestVersion]) {
    try {
      const versionData = (await spawnJson('npm', [
        'view',
        `${pkg}@${latestVersion}`,
        'time',
        '--json',
      ])) as Record<string, unknown>;
      
      if (versionData && typeof versionData === 'object') {
        const versionTime = versionData.time;
        if (versionTime && typeof versionTime === 'object') {
          for (const [k, v] of Object.entries(versionTime)) {
            if (typeof v === 'string') {
              timeMap[k] = v;
            }
          }
        }
      }
    } catch {
      // Ignore errors when fetching specific version data
    }
  }

  return { latest, timeMap };
}

export async function getPackageCount(): Promise<number> {
  try {
    const output = await spawnText('npm', ['list', '--depth=0', '--json']);
    const data = JSON.parse(output);
    return Object.keys(data.dependencies || {}).length;
  } catch {
    return 0;
  }
}

export function printUpToDateMessage(packageCount: number): void {
  console.log(`No updates available (${packageCount} packages checked)`);
}

export async function run(): Promise<number> {
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
        const p = pkgs[index];
        index += 1;
        inFlight += 1;
        fetchMeta(p, outdated[p].latest)
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
    args.skip,
  );

  // Show skipped packages info
  const skippedPackages = args.skip.filter((entry) => {
    const { package: pkg } = parseSkipEntry(entry);
    const info = outdated[pkg];
    if (!info) {
      return false;
    }
    return shouldSkipPackage(
      pkg,
      info.current,
      info.wanted,
      info.latest,
      args.skip,
    );
  });
  printSkippedInfo(skippedPackages, args.format);

  // Add command line skip entries to file
  addSkipEntriesToFile(
    args._skipConfig ?? null,
    args._skipFilePath ?? null,
    args._commandLineSkips ?? [],
  );

  // Auto-cleanup skip file
  cleanupAndSaveSkipFile(
    args._skipConfig ?? null,
    args._skipFilePath ?? null,
    outdated,
  );

  if (rows.length === 0) {
    // Only show "up to date" message if no filtering was applied
    // (i.e., when there are truly no outdated packages)
    const hasFiltering = args.olderThan > 0 || args.skip.length > 0;
    if (!hasFiltering) {
      const packageCount = await getPackageCount();
      printUpToDateMessage(packageCount);
    }
    return 0;
  }
  rows = sortRows(rows, args.sortBy, args.order);

  switch (args.format) {
    case 'md':
      printMarkdown(rows);
      break;
    default:
      printPlain(rows);
  }
  return 0;
}

if (require.main === module) {
  run()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(err?.stack || String(err));
      process.exit(1);
    });
}
