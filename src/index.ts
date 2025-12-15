#!/usr/bin/env node
/**
 * outdated-plus -- Node/TS CLI
 * Uses npm outdated for package detection + HTTP API for timestamps
 */

import { spawn } from 'node:child_process';
import {
  addSkipEntriesToFile,
  cleanupAndSaveSkipFile,
  parseArgs,
} from './args.js';
import { formatError, NetworkError, RegistryError } from './lib/errors.js';
import { printMarkdown, printPlain, printSkippedInfo } from './lib/output.js';
import { buildRows, sortRows } from './lib/processing.js';
import type { Meta, OutdatedMap } from './lib/types.js';
import { parseSkipEntry, shouldSkipPackage } from './lib/utils.js';

const NPM_REGISTRY = 'https://registry.npmjs.org';

/**
 * Spawn npm command and return JSON output
 */
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

/**
 * Spawn npm command and return text output
 */
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

/**
 * Fetch package metadata from npm registry via HTTP
 */
export async function fetchPackageMeta(pkg: string): Promise<Meta> {
  const url = `${NPM_REGISTRY}/${encodeURIComponent(pkg)}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new RegistryError(`Package not found`, pkg);
      }
      throw new NetworkError(
        `Failed to fetch package metadata`,
        url,
        response.status,
      );
    }

    const data = (await response.json()) as Record<string, unknown>;

    let latest = '';
    const timeMap: Record<string, string> = {};

    if (data && typeof data === 'object') {
      // Extract dist-tags.latest
      const dt = data['dist-tags'];
      if (dt && typeof dt === 'object') {
        latest = String((dt as Record<string, unknown>).latest ?? '');
      }

      // Extract all time data
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
  } catch (error) {
    if (error instanceof NetworkError || error instanceof RegistryError) {
      throw error;
    }
    throw new NetworkError(
      error instanceof Error ? error.message : 'Unknown network error',
      url,
    );
  }
}

export class ProgressBar {
  private total: number;
  private current = 0;
  private enabled: boolean;

  constructor(total: number, quiet = false) {
    this.total = total;
    this.enabled = !quiet && process.stderr.isTTY === true;
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
    process.stderr.clearLine?.(0);
  }
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

export function printUpToDateMessage(
  packageCount: number,
  quiet: boolean,
): void {
  if (!quiet) {
    console.log(`No updates available (${packageCount} packages checked)`);
  }
}

export async function run(): Promise<number> {
  const args = parseArgs(process.argv);

  try {
    // 1) Get outdated packages from npm outdated
    const outdatedRaw = await spawnJson('npm', ['outdated', '--json']);
    if (
      !outdatedRaw ||
      typeof outdatedRaw !== 'object' ||
      Object.keys(outdatedRaw).length === 0
    ) {
      const packageCount = await getPackageCount();
      printUpToDateMessage(packageCount, args.quiet);
      return 0;
    }

    const outdated = outdatedRaw as OutdatedMap;
    const pkgs = Object.keys(outdated);
    const pb = new ProgressBar(pkgs.length, args.quiet);

    // 2) Fetch metadata with concurrency limit (HTTP API only for timestamps)
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
          fetchPackageMeta(p)
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

    // 3) Build, sort, print
    let rows = buildRows(
      outdated,
      metas,
      args.showAll,
      Math.max(0, args.olderThan),
      args.iso,
      args.skip,
    );

    // Show skipped packages info (unless quiet mode)
    if (!args.quiet) {
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
    }

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
      const hasFiltering = args.olderThan > 0 || args.skip.length > 0;
      if (!hasFiltering) {
        const packageCount = await getPackageCount();
        printUpToDateMessage(packageCount, args.quiet);
      }
      return 0;
    }

    rows = sortRows(rows, args.sortBy, args.order);

    switch (args.format) {
      case 'md':
        printMarkdown(rows, args.showWanted);
        break;
      default:
        printPlain(rows, args.showWanted);
    }
    return 0;
  } catch (error) {
    if (!args.quiet) {
      console.error(formatError(error));
    }
    return 1;
  }
}

if (require.main === module) {
  run()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(formatError(err));
      process.exit(1);
    });
}
