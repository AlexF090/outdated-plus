import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Args, OutdatedMap, SkipFileConfig } from './lib/types.js';
import { isVersionHigher, parseSkipEntry } from './lib/utils.js';

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
  const sortBy = (a.get('--sort-by') as Args['sortBy']) ?? 'published_latest';
  const order = (a.get('--order') as Args['order']) ?? 'desc';
  const format = (a.get('--format') as Args['format']) ?? 'plain';
  const concurrency = Number(a.get('--concurrency') ?? 12);
  const olderThan = Number(a.get('--older-than') ?? 0);
  const showAll = Boolean(a.get('--show-all'));
  const showWanted = Boolean(a.get('--wanted'));
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

  const normalizedSort =
    sortBy === 'age'
      ? 'age_latest'
      : sortBy === 'published'
        ? 'published_latest'
        : sortBy;
  return {
    olderThan,
    showAll,
    showWanted,
    iso,
    concurrency: Math.max(1, concurrency),
    sortBy: normalizedSort as Args['sortBy'],
    order,
    format,
    skip: [...skipPackages, ...fileSkipPackages],
    _skipConfig: skipConfig,
    _skipFilePath: skipFilePath,
    _commandLineSkips: skipPackages,
  };
}

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
