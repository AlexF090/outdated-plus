export function parseIsoZ(s?: string): number | null {
  if (!s) {
    return null;
  }
  const x = s.endsWith('Z') ? `${s.slice(0, -1)}+00:00` : s;
  const t = Date.parse(x);
  return Number.isFinite(t) ? t : null;
}

export function daysAgo(ms: number | null): number | null {
  if (ms === null) {
    return null;
  }
  const delta = Date.now() - ms;
  return Math.max(0, Math.floor(delta / 86400000));
}

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
): [number, number, number, string] | null {
  const re =
    /^[v=]*(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;
  const m = re.exec(v ?? '');
  if (!m) {
    return null;
  }
  return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] ?? ''];
}

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

  // If major.minor.patch are equal, compare prerelease
  if (v1[3] && !v2[3]) {
    return false; // version1 has prerelease, version2 doesn't
  }
  if (!v1[3] && v2[3]) {
    return true; // version2 has prerelease, version1 doesn't
  }
  if (v1[3] && v2[3]) {
    return v1[3] > v2[3];
  }

  return false; // versions are equal
}

export function bumpType(
  fromV: string,
  toV: string,
): 'major' | 'minor' | 'patch' | 'prerelease' | 'same' | 'unknown' {
  const a = parseSemver(fromV);
  const b = parseSemver(toV);
  if (!a || !b) {
    return 'unknown';
  }
  if (a[0] === b[0] && a[1] === b[1] && a[2] === b[2]) {
    return a[3] === b[3] ? 'same' : 'prerelease';
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

export function cleanupSkipList(
  skipPackages: string[],
  outdatedPackages: string[],
): string[] {
  return skipPackages.filter((pkg) => outdatedPackages.includes(pkg));
}

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
