#!/usr/bin/env node
/**
 * outdated-plus -- Node/TS CLI
 * Uses npm outdated for package detection + HTTP API for timestamps
 * With --check-all flag: checks ALL packages via HTTP (slower, shows everything)
 */

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  addSkipEntriesToFile,
  cleanupAndSaveSkipFile,
  parseArgs,
} from './args.js';
import { formatError, NetworkError, RegistryError } from './lib/errors.js';
import { printMarkdown, printPlain, printSkippedInfo } from './lib/output.js';
import { buildRows, sortRows } from './lib/processing.js';
import type { Meta, OutdatedEntry, OutdatedMap } from './lib/types.js';
import {
  extractLatestVersion,
  extractTimeMap,
  isOutdatedMap,
  isValidNpmRegistryResponse,
  parseSkipEntry,
  shouldSkipPackage,
} from './lib/utils.js';

const NPM_REGISTRY = 'https://registry.npmjs.org';
const HTTP_REQUEST_TIMEOUT_MS = 10000;

/**
 * Spawns a command and returns its JSON output.
 *
 * @param cmd - The command to execute (e.g., 'npm').
 * @param args - Array of command-line arguments.
 * @returns Promise that resolves to the parsed JSON output, or an empty object if parsing fails.
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
 * Spawns a command and returns its text output.
 *
 * @param cmd - The command to execute (e.g., 'npm').
 * @param args - Array of command-line arguments.
 * @returns Promise that resolves to the trimmed text output.
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
 * Fetches package metadata from the npm registry via HTTP.
 *
 * @param pkg - The package name to fetch metadata for.
 * @returns Promise that resolves to package metadata containing latest version and time map.
 * @throws {RegistryError} If the package is not found (404) or the response format is invalid.
 * @throws {NetworkError} If the HTTP request fails, times out, or returns a non-OK status.
 */
export async function fetchPackageMeta(pkg: string): Promise<Meta> {
  const url = `${NPM_REGISTRY}/${encodeURIComponent(pkg)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    HTTP_REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

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

    const data: unknown = await response.json();

    if (!isValidNpmRegistryResponse(data)) {
      throw new RegistryError('Invalid registry response format', pkg);
    }

    const latest = extractLatestVersion(data);
    const timeMap = extractTimeMap(data);

    return { latest, timeMap };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof NetworkError || error instanceof RegistryError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new NetworkError('Request timeout', url);
    }

    throw new NetworkError(
      error instanceof Error ? error.message : 'Unknown network error',
      url,
    );
  }
}

/**
 * Reads package.json and extracts all dependencies.
 *
 * @param cwd - The current working directory where package.json should be located.
 * @returns Object containing dependencies and devDependencies. Returns empty objects if file cannot be read or parsed.
 */
export function readPackageJson(cwd: string): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  try {
    const packageJsonPath = join(cwd, 'package.json');
    const content = readFileSync(packageJsonPath, 'utf-8');
    const data = JSON.parse(content);
    return {
      dependencies: data.dependencies || {},
      devDependencies: data.devDependencies || {},
    };
  } catch {
    return { dependencies: {}, devDependencies: {} };
  }
}

function hasStringVersion(
  value: unknown,
): value is Record<string, unknown> & { version: string } {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  if (!('version' in value)) {
    return false;
  }
  return typeof value.version === 'string';
}

/**
 * Reads package-lock.json and extracts installed package versions.
 *
 * @param cwd - The current working directory where package-lock.json should be located.
 * @returns Record mapping package names to their installed versions. Returns empty object if file cannot be read or parsed.
 */
export function getInstalledVersions(cwd: string): Record<string, string> {
  try {
    const lockPath = join(cwd, 'package-lock.json');
    const content = readFileSync(lockPath, 'utf-8');
    const data = JSON.parse(content);
    const versions: Record<string, string> = {};

    if (data.packages && typeof data.packages === 'object') {
      for (const [key, value] of Object.entries(data.packages)) {
        if (key === '') {
          continue;
        }
        const match = key.match(/node_modules\/(.+)$/);
        if (match && hasStringVersion(value)) {
          const pkgName = match[1];
          versions[pkgName] = value.version;
        }
      }
    } else if (data.dependencies && typeof data.dependencies === 'object') {
      for (const [name, value] of Object.entries(data.dependencies)) {
        if (hasStringVersion(value)) {
          versions[name] = value.version;
        }
      }
    }

    return versions;
  } catch {
    return {};
  }
}

/**
 * Builds an outdated package map by checking all packages via HTTP (--check-all mode).
 *
 * This function reads all dependencies from package.json, fetches metadata for each package
 * from the npm registry, and compares installed versions with latest versions to determine
 * which packages are outdated.
 *
 * @param quiet - If true, suppresses progress bar output.
 * @param concurrency - Maximum number of concurrent HTTP requests (1-100).
 * @returns Promise that resolves to an object containing the outdated map and metadata for all packages.
 */
export async function buildOutdatedMapViaHTTP(
  quiet: boolean,
  concurrency: number,
): Promise<{ outdated: OutdatedMap; metas: Record<string, Meta> }> {
  const cwd = process.cwd();
  const { dependencies, devDependencies } = readPackageJson(cwd);
  const installedVersions = getInstalledVersions(cwd);

  const allDeps = { ...dependencies, ...devDependencies };
  const pkgNames = Object.keys(allDeps);

  if (pkgNames.length === 0) {
    return { outdated: {}, metas: {} };
  }

  const pb = new ProgressBar(pkgNames.length, quiet);
  const metas: Record<string, Meta> = {};
  const outdated: OutdatedMap = {};

  // Fetch metadata with concurrency limit
  const limit = Math.max(1, concurrency);
  let inFlight = 0;
  let index = 0;

  await new Promise<void>((resolve) => {
    const tick = () => {
      while (inFlight < limit && index < pkgNames.length) {
        const pkgName = pkgNames[index];
        index += 1;
        inFlight += 1;

        fetchPackageMeta(pkgName)
          .then((meta) => {
            metas[pkgName] = meta;

            const current = installedVersions[pkgName] || '0.0.0';
            const latest = meta.latest;

            // Only add to outdated if current != latest
            if (current !== latest && latest) {
              const entry: OutdatedEntry = {
                current,
                wanted: latest, // In --check-all mode, wanted = latest
                latest,
              };
              outdated[pkgName] = entry;
            }
          })
          .catch(() => {
            metas[pkgName] = { latest: '', timeMap: {} };
          })
          .finally(() => {
            inFlight -= 1;
            pb.update(1);
            if (index >= pkgNames.length && inFlight === 0) {
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
  return { outdated, metas };
}

/**
 * A simple progress bar for displaying operation progress in the terminal.
 */
export class ProgressBar {
  private total: number;
  private current = 0;
  private enabled: boolean;

  /**
   * Creates a new ProgressBar instance.
   *
   * @param total - The total number of items to process.
   * @param quiet - If true, the progress bar will be disabled.
   */
  constructor(total: number, quiet = false) {
    this.total = total;
    this.enabled = !quiet && process.stderr.isTTY === true;
  }

  /**
   * Updates the progress bar by the specified step amount.
   */
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
    process.stderr.write?.(
      `\r[${bar}] ${pct}% (${this.current}/${this.total})`,
    );
  }

  /**
   * Finishes the progress bar.
   */
  finish() {
    if (!this.enabled) {
      return;
    }
    process.stderr.write?.('\r');
    process.stderr.clearLine?.(0);
  }
}

/**
 * Gets the total count of installed packages.
 */
export async function getPackageCount(): Promise<number> {
  try {
    const output = await spawnText('npm', ['list', '--depth=0', '--json']);
    const data = JSON.parse(output);
    return Object.keys(data.dependencies || {}).length;
  } catch {
    return 0;
  }
}

/**
 * Prints a message indicating that all packages are up to date.
 */
export function printUpToDateMessage(
  packageCount: number,
  quiet: boolean,
): void {
  if (!quiet) {
    console.log(`No updates available (${packageCount} packages checked)`);
  }
}

/**
 * Main entry point for the outdated-plus CLI tool.
 *
 * This function orchestrates the entire workflow:
 * 1. Parses command-line arguments
 * 2. Detects outdated packages (via npm outdated or HTTP)
 * 3. Fetches package metadata from npm registry
 * 4. Builds, filters, and sorts the results
 * 5. Outputs the results in the requested format
 *
 * @returns Promise that resolves to exit code (0 for success, 1 for error).
 */
export async function run(): Promise<number> {
  const args = parseArgs(process.argv);

  try {
    let outdated: OutdatedMap;
    let metas: Record<string, Meta>;

    if (args.checkAll) {
      // --check-all mode: Use HTTP to check all packages
      const result = await buildOutdatedMapViaHTTP(
        args.quiet,
        args.concurrency,
      );
      outdated = result.outdated;
      metas = result.metas;
    } else {
      // Standard mode: Use npm outdated
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

      if (!isOutdatedMap(outdatedRaw)) {
        const packageCount = await getPackageCount();
        printUpToDateMessage(packageCount, args.quiet);
        return 0;
      }

      outdated = outdatedRaw;
      const pkgs = Object.keys(outdated);
      const pb = new ProgressBar(pkgs.length, args.quiet);

      // Fetch metadata with concurrency limit (HTTP API only for timestamps)
      const limit = Math.max(1, args.concurrency);
      metas = {};
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
    }

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
