import type { Args, Meta, OutdatedMap, Row } from './types.js';
import {
  bumpType,
  daysAgo,
  fmtTime,
  parseIsoZ,
  shouldSkipPackage,
} from './utils.js';

/**
 * Builds an array of rows from outdated package data.
 *
 * Filters packages based on age cutoff and skip list, and enriches data with
 * publication dates and age information.
 *
 * @param outdated - Map of outdated packages.
 * @param metas - Map of package metadata containing time information.
 * @param showAll - If true, ignores age cutoff filter.
 * @param cutoffDays - Minimum age in days to include a package (0 = no filter).
 * @param useIso - If true, uses ISO date format.
 * @param skipPackages - Array of package skip entries.
 * @returns Array of formatted row data ready for output.
 */
export function buildRows(
  outdated: OutdatedMap,
  metas: Record<string, Meta>,
  showAll: boolean,
  cutoffDays: number,
  useIso: boolean,
  skipPackages: string[] = [],
): Row[] {
  const rows: Row[] = [];
  for (const [pkg, info] of Object.entries(outdated)) {
    // Skip packages based on version-specific skip logic
    if (
      shouldSkipPackage(
        pkg,
        info.current,
        info.wanted,
        info.latest,
        skipPackages,
      )
    ) {
      continue;
    }
    const current = info.current ?? '';
    const wanted = info.wanted ?? '';
    const latestFromOut = info.latest ?? '';
    const m = metas[pkg] ?? { latest: '', timeMap: {} };
    // Use latest from npm outdated as the source of truth
    const latest = latestFromOut || m.latest || '';

    // Skip packages where current, wanted, and latest are all identical
    // These are not actually outdated according to npm's definition
    if (current === wanted && current === latest && current !== '') {
      continue;
    }
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

/**
 * Sorts rows based on the specified field and order.
 * Returns a new array without modifying the original.
 */
export function sortRows(
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
