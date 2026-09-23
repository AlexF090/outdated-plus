import { diffVersions, type VersionChange } from './semver.ts';
import type {
  Dependency,
  MetadataResult,
  ReleasedVersion,
  Row,
} from './types.ts';

const CHANGE_ORDER: readonly VersionChange[] = [
  'breaking',
  'unknown',
  'feature',
  'fix',
  'none',
];

const parseDate = (timestamp: string | undefined): Date | undefined => {
  if (timestamp === undefined) {
    return undefined;
  }
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const toReleasedVersion = (
  version: string,
  releaseTimes: Record<string, string>,
): ReleasedVersion => ({
  version,
  released: parseDate(releaseTimes[version]),
});

export const buildRows = (
  dependencies: readonly Dependency[],
  metadataByRegistryName: ReadonlyMap<string, MetadataResult>,
): Row[] =>
  dependencies.map((dependency) => {
    const result = metadataByRegistryName.get(dependency.registryName);
    const releaseTimes =
      result?.status === 'found' ? result.metadata.releaseTimes : {};
    const latestVersion =
      result?.status === 'found' ? result.metadata.latestVersion : undefined;

    return {
      name: dependency.name,
      type: dependency.type,
      current:
        dependency.installedVersion === undefined
          ? undefined
          : toReleasedVersion(dependency.installedVersion, releaseTimes),
      latest:
        latestVersion === undefined
          ? undefined
          : toReleasedVersion(latestVersion, releaseTimes),
      diff:
        latestVersion === undefined
          ? undefined
          : diffVersions(dependency.installedVersion, latestVersion),
    };
  });

const rank = (row: Row): number =>
  row.diff === undefined
    ? CHANGE_ORDER.length
    : CHANGE_ORDER.indexOf(row.diff.change);

/** Sorts the most severe updates first; rows with failed lookups go last. */
export const sortRows = (rows: readonly Row[]): Row[] =>
  rows.toSorted(
    (left, right) =>
      rank(left) - rank(right) || left.name.localeCompare(right.name, 'en'),
  );
