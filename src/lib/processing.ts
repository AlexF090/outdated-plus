import type { Args, Meta, OutdatedMap, Row } from './types.js';
import { bumpType, daysAgo, fmtTime, parseIsoZ } from './utils.js';

export function buildRows(
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
