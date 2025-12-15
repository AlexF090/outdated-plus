import type { BumpType, NpmRegistryResponse, OutdatedMap } from './types.js';

export function parseIsoZ(s?: string): number | null {
  if (!s) {
    return null;
  }
  const x = s.endsWith('Z') ? `${s.slice(0, -1)}+00:00` : s;
  const t = Date.parse(x);
  return Number.isFinite(t) ? t : null;
}

/**
 * Type guard to validate npm Registry Response structure.
 *
 * @param data - The data to validate.
 * @returns True if the data matches the expected npm registry response format.
 */
export function isValidNpmRegistryResponse(
  data: unknown,
): data is NpmRegistryResponse {
  if (!data || typeof data !== 'object') {
    return false;
  }

  if ('dist-tags' in data) {
    const distTags = (data as { 'dist-tags': unknown })['dist-tags'];
    if (typeof distTags !== 'object' || distTags === null) {
      return false;
    }
  }

  if ('time' in data) {
    const time = (data as { time: unknown }).time;
    if (typeof time !== 'object' || time === null) {
      return false;
    }
  }

  return true;
}

/**
 * Type guard to validate that data is an OutdatedMap.
 *
 * @param data - The data to validate.
 * @returns True if the data matches the OutdatedMap structure.
 */
export function isOutdatedMap(data: unknown): data is OutdatedMap {
  if (!data || typeof data !== 'object') {
    return false;
  }

  for (const value of Object.values(data)) {
    if (!value || typeof value !== 'object') {
      return false;
    }
    if (!('current' in value) || !('wanted' in value) || !('latest' in value)) {
      return false;
    }
    if (
      typeof value.current !== 'string' ||
      typeof value.wanted !== 'string' ||
      typeof value.latest !== 'string'
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Safely extracts the latest version from an npm Registry Response.
 *
 * @param data - The npm registry response data.
 * @returns The latest version string, or empty string if not found.
 */
export function extractLatestVersion(data: NpmRegistryResponse): string {
  const distTags = data['dist-tags'];
  if (!distTags || typeof distTags !== 'object') {
    return '';
  }
  return String(distTags.latest ?? '');
}

/**
 * Safely extracts the time map from an npm Registry Response.
 *
 * The time map contains publication dates for all package versions.
 *
 * @param data - The npm registry response data.
 * @returns Record mapping version strings to ISO date strings.
 */
export function extractTimeMap(
  data: NpmRegistryResponse,
): Record<string, string> {
  const timeMap: Record<string, string> = {};
  const time = data.time;

  if (!time || typeof time !== 'object') {
    return timeMap;
  }

  for (const [key, value] of Object.entries(time)) {
    if (typeof value === 'string') {
      timeMap[key] = value;
    }
  }

  return timeMap;
}

/**
 * Calculates the number of days ago from a timestamp.
 */
export function daysAgo(ms: number | null): number | null {
  if (ms === null) {
    return null;
  }
  const delta = Date.now() - ms;
  return Math.max(0, Math.floor(delta / 86400000));
}

/**
 * Formats a timestamp into a human-readable date string.
 */
export function fmtTime(ms: number | null, iso: boolean): string {
  if (ms === null) {
    return '-';
  }
  const d = new Date(ms);
  if (iso) {
    return d.toISOString().slice(0, 16) + 'Z';
  }
  const date = d.toLocaleDateString();
  const time = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${date} ${time}`;
}

export function parseSemver(
  v: string,
): [number, number, number, string[]] | null {
  const re =
    /^[v=]*(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;
  const m = re.exec(v ?? '');
  if (!m) {
    return null;
  }
  const prerelease = m[4] ? m[4].split('.') : [];
  return [Number(m[1]), Number(m[2]), Number(m[3]), prerelease];
}

/**
 * Compare two prerelease identifier arrays according to Semver 2.0.0 spec
 * Returns: -1 if pre1 < pre2, 0 if equal, 1 if pre1 > pre2
 */
function comparePrereleaseIdentifiers(
  pre1: string[],
  pre2: string[],
): -1 | 0 | 1 {
  // Empty prerelease = released version (higher than any prerelease)
  if (pre1.length === 0 && pre2.length > 0) {
    return 1;
  }
  if (pre1.length > 0 && pre2.length === 0) {
    return -1;
  }
  if (pre1.length === 0 && pre2.length === 0) {
    return 0;
  }

  // Compare identifier by identifier
  const maxLength = Math.max(pre1.length, pre2.length);
  for (let i = 0; i < maxLength; i++) {
    // Larger prerelease array wins if all previous identifiers are equal
    if (i >= pre1.length) {
      return -1;
    }
    if (i >= pre2.length) {
      return 1;
    }

    const id1 = pre1[i];
    const id2 = pre2[i];

    // Check if identifiers are numeric
    const num1 = /^\d+$/.test(id1) ? parseInt(id1, 10) : null;
    const num2 = /^\d+$/.test(id2) ? parseInt(id2, 10) : null;

    // Numeric identifiers are compared as integers
    if (num1 !== null && num2 !== null) {
      if (num1 < num2) {
        return -1;
      }
      if (num1 > num2) {
        return 1;
      }
      continue;
    }

    // Numeric identifiers always have lower precedence than non-numeric
    if (num1 !== null) {
      return -1;
    }
    if (num2 !== null) {
      return 1;
    }

    // Both non-numeric: compare lexically as ASCII
    if (id1 < id2) {
      return -1;
    }
    if (id1 > id2) {
      return 1;
    }
  }

  return 0;
}

/**
 * Compares two semantic versions and determines if the first is higher than the second.
 *
 * @param version1 - First version string to compare.
 * @param version2 - Second version string to compare.
 * @returns True if version1 is higher than version2, false otherwise.
 */
export function isVersionHigher(version1: string, version2: string): boolean {
  const v1 = parseSemver(version1);
  const v2 = parseSemver(version2);

  if (!v1 || !v2) {
    return false;
  }

  // Compare major, minor, patch
  for (let i = 0; i < 3; i++) {
    if (v1[i] > v2[i]) {
      return true;
    }
    if (v1[i] < v2[i]) {
      return false;
    }
  }

  // If major.minor.patch are equal, compare prerelease according to Semver spec
  const prereleaseComparison = comparePrereleaseIdentifiers(v1[3], v2[3]);
  return prereleaseComparison > 0;
}

/**
 * Determines the type of version bump between two versions.
 *
 * @param fromV - The source version string.
 * @param toV - The target version string.
 * @returns The bump type: 'major', 'minor', 'patch', 'prerelease', 'same', or 'unknown'.
 */
export function bumpType(fromV: string, toV: string): BumpType {
  const a = parseSemver(fromV);
  const b = parseSemver(toV);
  if (!a || !b) {
    return 'unknown';
  }
  if (a[0] === b[0] && a[1] === b[1] && a[2] === b[2]) {
    const preA = a[3].join('.');
    const preB = b[3].join('.');
    return preA === preB ? 'same' : 'prerelease';
  }
  if (a[0] !== b[0]) {
    return 'major';
  }
  if (a[1] !== b[1]) {
    return 'minor';
  }
  if (a[2] !== b[2]) {
    return 'patch';
  }
  return 'unknown';
}

/**
 * Parses a skip entry string into package name and optional version.
 *
 * Supports both scoped and non-scoped packages. Examples:
 * - "package-name" -> { package: "package-name" }
 * - "package-name@1.0.0" -> { package: "package-name", version: "1.0.0" }
 * - "@scope/package@1.0.0" -> { package: "@scope/package", version: "1.0.0" }
 *
 * @param entry - The skip entry string to parse.
 * @returns Object with package name and optional version.
 */
export function parseSkipEntry(entry: string): {
  package: string;
  version?: string;
} {
  let atIndex: number;
  if (entry.startsWith('@')) {
    // For scoped packages, find the second '@' (the version separator, if present)
    atIndex = entry.indexOf('@', 1);
  } else {
    // For non-scoped packages, find the last '@' to handle cases like 'package@name@1.0.0'
    atIndex = entry.lastIndexOf('@');
  }

  if (atIndex === -1) {
    return { package: entry };
  }

  const packageName = entry.substring(0, atIndex);
  const version = entry.substring(atIndex + 1);

  return { package: packageName, version };
}

/**
 * Determines if a package should be skipped based on skip entries.
 *
 * A package is skipped if:
 * - It matches a skip entry without a version (skip all versions), or
 * - It matches a skip entry with a version that matches the latest version
 *   and the wanted version hasn't changed from current.
 *
 * @param packageName - The package name to check.
 * @param currentVersion - The currently installed version.
 * @param wantedVersion - The wanted version according to package.json constraints.
 * @param latestVersion - The latest available version.
 * @param skipEntries - Array of skip entry strings.
 * @returns True if the package should be skipped, false otherwise.
 */
export function shouldSkipPackage(
  packageName: string,
  currentVersion: string,
  wantedVersion: string,
  latestVersion: string,
  skipEntries: string[],
): boolean {
  for (const entry of skipEntries) {
    const { package: skipPackage, version: skipVersion } =
      parseSkipEntry(entry);

    if (skipPackage !== packageName) {
      continue;
    }

    // If no version specified, skip the entire package
    if (!skipVersion) {
      return true;
    }

    // If version specified, only skip if it matches the latest version AND wanted hasn't changed
    if (skipVersion === latestVersion && wantedVersion === currentVersion) {
      return true;
    }
  }

  return false;
}
