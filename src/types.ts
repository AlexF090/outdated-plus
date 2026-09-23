import type { VersionDiff } from './semver.ts';

export type DependencyType =
  | 'dependencies'
  | 'devDependencies'
  | 'optionalDependencies'
  | 'peerDependencies';

export interface Dependency {
  /** Key in package.json and folder name in node_modules. */
  name: string;
  /** Package name in the registry. Differs from `name` for `npm:` aliases. */
  registryName: string;
  type: DependencyType;
  /** `undefined` when the package is not installed. */
  installedVersion: string | undefined;
}

export interface PackageMetadata {
  latestVersion: string;
  /** Version to ISO 8601 timestamp, as returned in the `time` field of the registry. */
  releaseTimes: Record<string, string>;
}

export type MetadataResult =
  | { status: 'found'; metadata: PackageMetadata }
  | { status: 'failed'; reason: string };

export interface ReleasedVersion {
  version: string;
  released: Date | undefined;
}

export interface Row {
  name: string;
  type: DependencyType;
  /** `undefined` when the package is not installed. */
  current: ReleasedVersion | undefined;
  /** `undefined` when the registry lookup failed. */
  latest: ReleasedVersion | undefined;
  /** Difference from the installed to the latest version. `undefined` when the registry lookup failed. */
  diff: VersionDiff | undefined;
}
