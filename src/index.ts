#!/usr/bin/env node
/**
 * npm-outdated-with-dates -- Node/TS CLI
 * Mirrors the Python version: shows Published/Age for Wanted and Latest,
 * supports sorting and output formats plain|tsv|md.
 */

import { spawn } from 'node:child_process';
import { parseArgs } from './args.js';
import { printMarkdown, printPlain, printTsv } from './lib/output.js';
import { buildRows, sortRows } from './lib/processing.js';
import type { Meta, OutdatedMap } from './lib/types.js';

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

export async function fetchMeta(pkg: string): Promise<Meta> {
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
  return { latest, timeMap };
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

if (require.main === module) {
  run()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(err?.stack || String(err));
      process.exit(1);
    });
}
