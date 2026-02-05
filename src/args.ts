import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEFAULT_CONCURRENCY,
  MAX_CONCURRENCY,
  MIN_CONCURRENCY,
} from './lib/constants.js';
import type { Args, OutdatedMap, SkipFileConfig } from './lib/types.js';
import { isVersionHigher, parseSkipEntry } from './lib/utils.js';
function isSortBy(value: unknown): value is Args['sortBy'] {
  return (
    value === 'name' ||
    value === 'age' ||
    value === 'published' ||
    value === 'age_latest' ||
    value === 'age_wanted' ||
    value === 'published_latest' ||
    value === 'published_wanted' ||
    value === 'current' ||
    value === 'wanted' ||
    value === 'latest'
  );
}

function isOrder(value: unknown): value is Args['order'] {
  return value === 'asc' || value === 'desc';
}

function isFormat(value: unknown): value is Args['format'] {
  return value === 'plain' || value === 'md';
}

/**
 * Parses command-line arguments into a structured Args object.
 *
 * Supports all CLI options including --check-all, --older-than, --format, --sort-by,
 * --order, --wanted, --quiet, --iso, --concurrency, and --skip.
 * Also loads skip packages from .outdated-plus-skip file if present.
 *
 * @param argv - Command-line arguments array (typically process.argv).
 * @returns Parsed arguments object with all options and defaults applied.
 */
export function parseArgs(argv: string[]): Args {
  const a = new Map<string, string | true>();
  for (let i = 2; i < argv.length; i += 1) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k.startsWith('--')) {
      if (v && !v.startsWith('--')) {
        a.set(k, v);
        i += 1;
      } else {
        a.set(k, true);
      }
    }
  }
  const sortByRaw = a.get('--sort-by');
  const sortBy = isSortBy(sortByRaw) ? sortByRaw : 'published_latest';
  const orderRaw = a.get('--order');
  const order = isOrder(orderRaw) ? orderRaw : 'desc';
  const formatRaw = a.get('--format');
  const format = isFormat(formatRaw) ? formatRaw : 'plain';
  const concurrencyRaw = Number(a.get('--concurrency') ?? DEFAULT_CONCURRENCY);
  const concurrency = Number.isNaN(concurrencyRaw)
    ? DEFAULT_CONCURRENCY
    : Math.min(MAX_CONCURRENCY, Math.max(MIN_CONCURRENCY, concurrencyRaw));
  const olderThanRaw = Number(a.get('--older-than') ?? 0);
  const olderThan = Number.isNaN(olderThanRaw) ? 0 : Math.max(0, olderThanRaw);
  const showAll = Boolean(a.get('--show-all'));
  const showWanted = Boolean(a.get('--wanted'));
  const quiet = Boolean(a.get('--quiet'));
  const checkAll = Boolean(a.get('--check-all'));
  const iso = Boolean(a.get('--iso'));
  // Parse skip packages from command line
  const skipPackages: string[] = [];
  const skipValue = a.get('--skip');
  if (skipValue && typeof skipValue === 'string') {
    skipPackages.push(...skipValue.split(',').map((p) => p.trim()));
  }

  // Load skip packages from default file
  let fileSkipPackages: string[] = [];
  let skipConfig: SkipFileConfig | null = null;
  let skipFilePath: string | null = null;

  try {
    const defaultSkipFile = join(process.cwd(), '.outdated-plus-skip');
    const content = readFileSync(defaultSkipFile, 'utf-8');
    skipConfig = JSON.parse(content);
    fileSkipPackages = skipConfig?.packages || [];
    skipFilePath = defaultSkipFile;
  } catch {
    // Default file doesn't exist, ignore
  }

  const normalizedSort: Args['sortBy'] =
    sortBy === 'age'
      ? 'age_latest'
      : sortBy === 'published'
        ? 'published_latest'
        : sortBy;
  return {
    olderThan,
    showAll,
    showWanted,
    quiet,
    checkAll,
    iso,
    concurrency,
    sortBy: normalizedSort,
    order,
    format,
    skip: [...skipPackages, ...fileSkipPackages],
    _skipConfig: skipConfig,
    _skipFilePath: skipFilePath,
    _commandLineSkips: skipPackages,
  };
}

/**
 * Adds command-line skip entries to the skip configuration file.
 *
 * Only adds entries that don't already exist in the file.
 *
 * @param skipConfig - Current skip configuration, or null if file doesn't exist.
 * @param skipFilePath - Path to the skip file, or null to use default.
 * @param commandLineSkips - Array of skip entries from command line.
 */
export function addSkipEntriesToFile(
  skipConfig: SkipFileConfig | null,
  skipFilePath: string | null,
  commandLineSkips: string[],
): void {
  if (commandLineSkips.length === 0) {
    return;
  }

  const defaultSkipFile =
    skipFilePath || join(process.cwd(), '.outdated-plus-skip');

  // Create default config if none exists
  const config: SkipFileConfig = skipConfig || {
    packages: [],
    reason: 'Skip entries added via command line',
    autoCleanup: true,
  };

  // Add new skip entries that don't already exist
  const existingPackages = new Set(config.packages);
  const newPackages = commandLineSkips.filter(
    (entry) => !existingPackages.has(entry),
  );

  if (newPackages.length > 0) {
    config.packages.push(...newPackages);

    try {
      writeFileSync(defaultSkipFile, JSON.stringify(config, null, 2) + '\n');
    } catch {
      // Ignore write errors
    }
  }
}

/**
 * Cleans up skip file entries that are no longer relevant.
 *
 * Removes entries where:
 * - The package is no longer outdated, or
 * - The version-specific skip entry is no longer needed (package has been updated).
 *
 * Only performs cleanup if autoCleanup is enabled in the config.
 *
 * @param skipConfig - Current skip configuration, or null if file doesn't exist.
 * @param skipFilePath - Path to the skip file, or null to use default.
 * @param outdated - Map of currently outdated packages.
 */
export function cleanupAndSaveSkipFile(
  skipConfig: SkipFileConfig | null,
  skipFilePath: string | null,
  outdated: OutdatedMap,
): void {
  if (!skipConfig || !skipFilePath) {
    return;
  }

  // Only cleanup if autoCleanup is enabled (default: true)
  const autoCleanup = skipConfig.autoCleanup !== false;
  if (!autoCleanup) {
    return;
  }

  const cleanedPackages = skipConfig.packages.filter((entry) => {
    const { package: pkg, version } = parseSkipEntry(entry);

    // If package is not in outdated list, remove it
    if (!outdated[pkg]) {
      return false;
    }

    const outdatedInfo = outdated[pkg];

    // If no version specified, keep the entry (package is still outdated)
    if (!version) {
      return true;
    }

    // If version specified, remove the entry if:
    // 1. The current version is now the same as or higher than the skip version, OR
    // 2. The wanted version is now the same as or higher than the skip version
    const currentIsSkipVersionOrHigher =
      outdatedInfo.current === version ||
      isVersionHigher(outdatedInfo.current, version);
    const wantedIsSkipVersionOrHigher =
      outdatedInfo.wanted === version ||
      isVersionHigher(outdatedInfo.wanted, version);

    // Keep the entry only if neither current nor wanted version has reached the skip version
    const shouldKeep =
      !currentIsSkipVersionOrHigher && !wantedIsSkipVersionOrHigher;
    return shouldKeep;
  });

  // Only update file if packages were removed
  if (cleanedPackages.length !== skipConfig.packages.length) {
    const updatedConfig: SkipFileConfig = {
      ...skipConfig,
      packages: cleanedPackages,
    };

    try {
      writeFileSync(
        skipFilePath,
        JSON.stringify(updatedConfig, null, 2) + '\n',
      );
    } catch {
      // Ignore write errors
    }
  }
}
