import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Args, OutdatedMap, SkipFileConfig } from './lib/types.js';
import { parseSkipEntry } from './lib/utils.js';

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
    iso,
    concurrency: Math.max(1, concurrency),
    sortBy: normalizedSort as Args['sortBy'],
    order,
    format,
    skip: [...skipPackages, ...fileSkipPackages],
    _skipConfig: skipConfig,
    _skipFilePath: skipFilePath,
  };
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

    // If no version specified, keep the entry (package is still outdated)
    if (!version) {
      return true;
    }

    // If version specified, only keep if the version is still wanted or latest
    const outdatedInfo = outdated[pkg];
    return version === outdatedInfo.wanted || version === outdatedInfo.latest;
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
