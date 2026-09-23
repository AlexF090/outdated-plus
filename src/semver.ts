export type PrereleaseIdentifier = string | number;

export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: PrereleaseIdentifier[];
}

/**
 * - `fix`, `feature`, `breaking`: patch, minor or major update of a stable version
 * - `unknown`: update involving a 0.x or prerelease version, or an unparsable installed version
 */
export type VersionChange = 'none' | 'fix' | 'feature' | 'breaking' | 'unknown';

export interface VersionDiff {
  change: VersionChange;
  /** Leading part of the target version shared with the installed version, including the trailing separator. */
  unchanged: string;
  /** Remaining part of the target version that differs. */
  changed: string;
}

const VERSION_PATTERN =
  /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z.-]+)?$/;

const NUMERIC_IDENTIFIER = /^(0|[1-9]\d*)$/;

const STABLE_CHANGES: readonly VersionChange[] = ['breaking', 'feature', 'fix'];

export const parseVersion = (version: string): SemanticVersion | undefined => {
  const match = VERSION_PATTERN.exec(version.trim());
  if (!match) {
    return undefined;
  }
  const [, major = '', minor = '', patch = '', prerelease] = match;
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    prerelease: prerelease
      ? prerelease
          .split('.')
          .map((identifier) =>
            NUMERIC_IDENTIFIER.test(identifier)
              ? Number(identifier)
              : identifier,
          )
      : [],
  };
};

const compareIdentifiers = (
  left: PrereleaseIdentifier,
  right: PrereleaseIdentifier,
): number => {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  if (typeof left === 'number') {
    return -1;
  }
  if (typeof right === 'number') {
    return 1;
  }
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
};

const comparePrerelease = (
  left: PrereleaseIdentifier[],
  right: PrereleaseIdentifier[],
): number => {
  if (left.length === 0 || right.length === 0) {
    return right.length - left.length;
  }
  const sharedLength = Math.min(left.length, right.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const result = compareIdentifiers(left[index] ?? 0, right[index] ?? 0);
    if (result !== 0) {
      return result;
    }
  }
  return left.length - right.length;
};

const compareParsed = (
  left: SemanticVersion,
  right: SemanticVersion,
): number => {
  return (
    left.major - right.major ||
    left.minor - right.minor ||
    left.patch - right.patch ||
    comparePrerelease(left.prerelease, right.prerelease)
  );
};

/**
 * Compares two versions by SemVer 2.0 precedence.
 * Returns a negative number, zero or a positive number. Invalid versions sort first.
 */
export const compareVersions = (left: string, right: string): number => {
  const parsedLeft = parseVersion(left);
  const parsedRight = parseVersion(right);
  if (!parsedLeft || !parsedRight) {
    return Number(Boolean(parsedLeft)) - Number(Boolean(parsedRight));
  }
  return compareParsed(parsedLeft, parsedRight);
};

const toParts = (version: SemanticVersion): PrereleaseIdentifier[] => {
  return [version.major, version.minor, version.patch, ...version.prerelease];
};

const separatorBefore = (index: number): string => {
  return index === 3 ? '-' : '.';
};

const joinParts = (
  parts: PrereleaseIdentifier[],
  startIndex: number,
): string => {
  return parts
    .map((part, offset) =>
      offset === 0 ? String(part) : separatorBefore(startIndex + offset) + part,
    )
    .join('');
};

/**
 * Splits the target version into the part shared with the installed version
 * and the part that changed, and classifies the change.
 */
export const diffVersions = (
  installed: string | undefined,
  target: string,
): VersionDiff => {
  const parsedTarget = parseVersion(target);
  const parsedInstalled =
    installed === undefined ? undefined : parseVersion(installed);
  if (!parsedTarget || !parsedInstalled) {
    return { change: 'unknown', unchanged: '', changed: target };
  }

  const targetParts = toParts(parsedTarget);
  if (compareParsed(parsedInstalled, parsedTarget) >= 0) {
    return {
      change: 'none',
      unchanged: joinParts(targetParts, 0),
      changed: '',
    };
  }

  const installedParts = toParts(parsedInstalled);
  let firstDifference = 0;
  while (installedParts[firstDifference] === targetParts[firstDifference]) {
    firstDifference += 1;
  }

  const isUnstable =
    parsedInstalled.major === 0 ||
    parsedTarget.major === 0 ||
    installedParts.length > 3 ||
    targetParts.length > 3;
  const sharedParts = targetParts.slice(0, firstDifference);
  const changedParts = targetParts.slice(firstDifference);
  const trailingSeparator =
    sharedParts.length > 0 && changedParts.length > 0
      ? separatorBefore(firstDifference)
      : '';

  return {
    change: isUnstable
      ? 'unknown'
      : (STABLE_CHANGES[firstDifference] ?? 'unknown'),
    unchanged: joinParts(sharedParts, 0) + trailingSeparator,
    changed: joinParts(changedParts, firstDifference),
  };
};
