import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NpmRegistryResponse } from '../src/lib/types.js';
import {
  bumpType,
  daysAgo,
  extractLatestVersion,
  extractTimeMap,
  fmtTime,
  isValidNpmRegistryResponse,
  isVersionHigher,
  parseIsoZ,
  parseSemver,
  parseSkipEntry,
  shouldSkipPackage,
} from '../src/lib/utils.js';

describe('parseIsoZ', () => {
  it('should parse ISO string with Z suffix', () => {
    const result = parseIsoZ('2023-12-01T10:30:00Z');
    expect(result).toBeTypeOf('number');
    expect(result).toBeGreaterThan(0);
  });

  it('should parse ISO string without Z suffix', () => {
    const result = parseIsoZ('2023-12-01T10:30:00');
    expect(result).toBeTypeOf('number');
    expect(result).toBeGreaterThan(0);
  });

  it('should return null for invalid input', () => {
    expect(parseIsoZ('invalid-date')).toBeNull();
    expect(parseIsoZ('')).toBeNull();
    expect(parseIsoZ(undefined)).toBeNull();
  });

  it('should handle empty string', () => {
    expect(parseIsoZ('')).toBeNull();
  });
});

describe('daysAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-12-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should calculate days ago correctly', () => {
    const oneDayAgo = new Date('2023-11-30T12:00:00Z').getTime();
    expect(daysAgo(oneDayAgo)).toBe(1);
  });

  it('should return 0 for today', () => {
    const today = new Date('2023-12-01T12:00:00Z').getTime();
    expect(daysAgo(today)).toBe(0);
  });

  it('should return null for null input', () => {
    expect(daysAgo(null)).toBeNull();
  });

  it('should handle future dates', () => {
    const future = new Date('2023-12-02T12:00:00Z').getTime();
    expect(daysAgo(future)).toBe(0);
  });
});

describe('fmtTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-12-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should format time in ISO format', () => {
    const timestamp = new Date('2023-12-01T10:30:00Z').getTime();
    const result = fmtTime(timestamp, true);
    expect(result).toBe('2023-12-01T10:30Z');
  });

  it('should format time in locale format', () => {
    const timestamp = new Date('2023-12-01T10:30:00Z').getTime();
    const result = fmtTime(timestamp, false);
    expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4} \d{2}:\d{2}/);
  });

  it('should return dash for null input', () => {
    expect(fmtTime(null, true)).toBe('-');
    expect(fmtTime(null, false)).toBe('-');
  });
});

describe('parseSemver', () => {
  it('should parse valid semver versions', () => {
    expect(parseSemver('1.2.3')).toEqual([1, 2, 3, []]);
    expect(parseSemver('v1.2.3')).toEqual([1, 2, 3, []]);
    expect(parseSemver('=1.2.3')).toEqual([1, 2, 3, []]);
    expect(parseSemver('1.2.3-beta.1')).toEqual([1, 2, 3, ['beta', '1']]);
  });

  it('should handle versions with build metadata', () => {
    expect(parseSemver('1.2.3+build.1')).toEqual([1, 2, 3, []]);
  });

  it('should parse prerelease identifiers correctly', () => {
    expect(parseSemver('1.0.0-alpha')).toEqual([1, 0, 0, ['alpha']]);
    expect(parseSemver('1.0.0-alpha.1')).toEqual([1, 0, 0, ['alpha', '1']]);
    expect(parseSemver('1.0.0-0.3.7')).toEqual([1, 0, 0, ['0', '3', '7']]);
    expect(parseSemver('1.0.0-x.7.z.92')).toEqual([
      1,
      0,
      0,
      ['x', '7', 'z', '92'],
    ]);
  });

  it('should return null for invalid versions', () => {
    expect(parseSemver('invalid')).toBeNull();
    expect(parseSemver('1.2')).toBeNull();
    expect(parseSemver('1.2.3.4')).toBeNull();
    expect(parseSemver('')).toBeNull();
  });
});

describe('bumpType', () => {
  it('should detect major version bump', () => {
    expect(bumpType('1.2.3', '2.0.0')).toBe('major');
    expect(bumpType('1.2.3', '2.1.0')).toBe('major');
  });

  it('should detect minor version bump', () => {
    expect(bumpType('1.2.3', '1.3.0')).toBe('minor');
    expect(bumpType('1.2.3', '1.3.1')).toBe('minor');
  });

  it('should detect patch version bump', () => {
    expect(bumpType('1.2.3', '1.2.4')).toBe('patch');
  });

  it('should detect prerelease changes', () => {
    expect(bumpType('1.2.3-alpha', '1.2.3-beta')).toBe('prerelease');
    expect(bumpType('1.2.3', '1.2.3-alpha')).toBe('prerelease');
  });

  it('should detect same version', () => {
    expect(bumpType('1.2.3', '1.2.3')).toBe('same');
    expect(bumpType('1.2.3-alpha', '1.2.3-alpha')).toBe('same');
  });

  it('should return unknown for invalid versions', () => {
    expect(bumpType('invalid', '1.2.3')).toBe('unknown');
    expect(bumpType('1.2.3', 'invalid')).toBe('unknown');
  });
});

describe('parseSkipEntry', () => {
  it('should parse package name without version', () => {
    const result = parseSkipEntry('react');
    expect(result).toEqual({ package: 'react' });
  });

  it('should parse package name with version', () => {
    const result = parseSkipEntry('react@18.2.0');
    expect(result).toEqual({ package: 'react', version: '18.2.0' });
  });

  it('should handle scoped packages', () => {
    const result = parseSkipEntry('@types/react@18.2.0');
    expect(result).toEqual({ package: '@types/react', version: '18.2.0' });
  });

  it('should handle scoped packages without version', () => {
    const result = parseSkipEntry('@types/react');
    expect(result).toEqual({ package: '@types/react' });
  });

  it('should handle packages with @ in name', () => {
    const result = parseSkipEntry('some-package@name@1.0.0');
    expect(result).toEqual({ package: 'some-package@name', version: '1.0.0' });
  });
});

describe('isVersionHigher', () => {
  it('should return true when first version is higher', () => {
    expect(isVersionHigher('2.0.0', '1.0.0')).toBe(true);
    expect(isVersionHigher('1.1.0', '1.0.0')).toBe(true);
    expect(isVersionHigher('1.0.1', '1.0.0')).toBe(true);
  });

  it('should handle prerelease versions according to Semver 2.0.0 spec', () => {
    // Released version has higher precedence than prerelease
    expect(isVersionHigher('1.0.0', '1.0.0-alpha')).toBe(true);
    expect(isVersionHigher('1.0.0-alpha', '1.0.0')).toBe(false);

    // Comparing prereleases: numeric identifiers
    expect(isVersionHigher('1.0.0-alpha.2', '1.0.0-alpha.1')).toBe(true);
    expect(isVersionHigher('1.0.0-alpha.1', '1.0.0-alpha.2')).toBe(false);

    // Comparing prereleases: alphanumeric vs numeric (alphanumeric higher)
    expect(isVersionHigher('1.0.0-alpha', '1.0.0-1')).toBe(true);
    expect(isVersionHigher('1.0.0-1', '1.0.0-alpha')).toBe(false);

    // Comparing prereleases: lexical order
    expect(isVersionHigher('1.0.0-beta', '1.0.0-alpha')).toBe(true);
    expect(isVersionHigher('1.0.0-alpha', '1.0.0-beta')).toBe(false);

    // Larger set of prerelease fields has higher precedence
    expect(isVersionHigher('1.0.0-alpha.beta', '1.0.0-alpha')).toBe(true);
    expect(isVersionHigher('1.0.0-alpha', '1.0.0-alpha.beta')).toBe(false);

    // Complex examples from Semver spec
    expect(isVersionHigher('1.0.0-alpha.1', '1.0.0-alpha')).toBe(true);
    expect(isVersionHigher('1.0.0-alpha.beta', '1.0.0-alpha.1')).toBe(true);
    expect(isVersionHigher('1.0.0-beta', '1.0.0-alpha.beta')).toBe(true);
    expect(isVersionHigher('1.0.0-beta.2', '1.0.0-beta')).toBe(true);
    expect(isVersionHigher('1.0.0-beta.11', '1.0.0-beta.2')).toBe(true);
    expect(isVersionHigher('1.0.0-rc.1', '1.0.0-beta.11')).toBe(true);
  });

  it('should return true when first version is higher', () => {
    expect(isVersionHigher('1.1.0', '1.0.0')).toBe(true);
    expect(isVersionHigher('1.0.1', '1.0.0')).toBe(true);
  });

  it('should return false when first version is lower', () => {
    expect(isVersionHigher('1.0.0', '2.0.0')).toBe(false);
    expect(isVersionHigher('1.0.0', '1.1.0')).toBe(false);
    expect(isVersionHigher('1.0.0', '1.0.1')).toBe(false);
  });

  it('should return false when versions are equal', () => {
    expect(isVersionHigher('1.0.0', '1.0.0')).toBe(false);
  });

  it('should handle prerelease versions', () => {
    expect(isVersionHigher('1.0.0', '1.0.0-beta')).toBe(true);
    expect(isVersionHigher('1.0.0-alpha', '1.0.0-beta')).toBe(false);
    expect(isVersionHigher('1.0.0-beta', '1.0.0-alpha')).toBe(true);
  });

  it('should return false for invalid versions', () => {
    expect(isVersionHigher('invalid', '1.0.0')).toBe(false);
    expect(isVersionHigher('1.0.0', 'invalid')).toBe(false);
    expect(isVersionHigher('invalid', 'invalid')).toBe(false);
  });
});

describe('shouldSkipPackage', () => {
  it('should skip entire package when no version specified', () => {
    const result = shouldSkipPackage('react', '18.1.0', '18.2.0', '18.3.0', [
      'react',
    ]);
    expect(result).toBe(true);
  });

  it('should not skip package when not in skip list', () => {
    const result = shouldSkipPackage('vue', '3.1.0', '3.2.0', '3.3.0', [
      'react',
    ]);
    expect(result).toBe(false);
  });

  it('should skip package when version matches latest and wanted equals current', () => {
    const result = shouldSkipPackage('react', '18.1.0', '18.1.0', '18.3.0', [
      'react@18.3.0',
    ]);
    expect(result).toBe(true);
  });

  it('should not skip package when version matches latest but wanted changed', () => {
    const result = shouldSkipPackage('react', '18.1.0', '18.2.0', '18.3.0', [
      'react@18.3.0',
    ]);
    expect(result).toBe(false);
  });

  it('should not skip package when version does not match latest', () => {
    const result = shouldSkipPackage('react', '18.1.0', '18.2.0', '18.3.0', [
      'react@18.2.0',
    ]);
    expect(result).toBe(false);
  });

  it('should not skip package when version does not match', () => {
    const result = shouldSkipPackage('react', '18.1.0', '18.2.0', '18.3.0', [
      'react@18.1.0',
    ]);
    expect(result).toBe(false);
  });

  it('should handle multiple skip entries', () => {
    const result = shouldSkipPackage('react', '18.1.0', '18.1.0', '18.3.0', [
      'vue@3.2.0',
      'react@18.3.0',
      'angular@15.0.0',
    ]);
    expect(result).toBe(true);
  });

  it('should handle scoped packages', () => {
    const result = shouldSkipPackage(
      '@types/react',
      '18.1.0',
      '18.1.0',
      '18.3.0',
      ['@types/react@18.3.0'],
    );
    expect(result).toBe(true);
  });
});

describe('isValidNpmRegistryResponse', () => {
  it('should return true for valid registry response', () => {
    const validResponse: NpmRegistryResponse = {
      'dist-tags': {
        latest: '1.0.0',
      },
      time: {
        '1.0.0': '2023-01-01T00:00:00Z',
      },
    };
    expect(isValidNpmRegistryResponse(validResponse)).toBe(true);
  });

  it('should return true for minimal valid response', () => {
    const minimalResponse: NpmRegistryResponse = {};
    expect(isValidNpmRegistryResponse(minimalResponse)).toBe(true);
  });

  it('should return true when dist-tags is present', () => {
    const response = {
      'dist-tags': {
        latest: '2.0.0',
        next: '3.0.0-beta.1',
      },
    };
    expect(isValidNpmRegistryResponse(response)).toBe(true);
  });

  it('should return true when time is present', () => {
    const response = {
      time: {
        '1.0.0': '2023-01-01T00:00:00Z',
        '1.1.0': '2023-02-01T00:00:00Z',
      },
    };
    expect(isValidNpmRegistryResponse(response)).toBe(true);
  });

  it('should return false for null or undefined', () => {
    expect(isValidNpmRegistryResponse(null)).toBe(false);
    expect(isValidNpmRegistryResponse(undefined)).toBe(false);
  });

  it('should return false for primitive types', () => {
    expect(isValidNpmRegistryResponse('string')).toBe(false);
    expect(isValidNpmRegistryResponse(123)).toBe(false);
    expect(isValidNpmRegistryResponse(true)).toBe(false);
  });

  it('should return false when dist-tags is not an object', () => {
    const invalidResponse = {
      'dist-tags': 'not-an-object',
    };
    expect(isValidNpmRegistryResponse(invalidResponse)).toBe(false);
  });

  it('should return false when time is not an object', () => {
    const invalidResponse = {
      time: 'not-an-object',
    };
    expect(isValidNpmRegistryResponse(invalidResponse)).toBe(false);
  });
});

describe('extractLatestVersion', () => {
  it('should extract latest version from dist-tags', () => {
    const response: NpmRegistryResponse = {
      'dist-tags': {
        latest: '2.5.1',
        next: '3.0.0-beta',
      },
    };
    expect(extractLatestVersion(response)).toBe('2.5.1');
  });

  it('should return empty string when dist-tags is missing', () => {
    const response: NpmRegistryResponse = {};
    expect(extractLatestVersion(response)).toBe('');
  });

  it('should return empty string when dist-tags.latest is missing', () => {
    const response: NpmRegistryResponse = {
      'dist-tags': {
        next: '3.0.0',
      },
    };
    expect(extractLatestVersion(response)).toBe('');
  });

  it('should return empty string when dist-tags is null', () => {
    const response: NpmRegistryResponse = {
      'dist-tags': undefined,
    };
    expect(extractLatestVersion(response)).toBe('');
  });
});

describe('extractTimeMap', () => {
  it('should extract time map with all valid entries', () => {
    const response: NpmRegistryResponse = {
      time: {
        '1.0.0': '2023-01-01T00:00:00Z',
        '1.1.0': '2023-02-01T00:00:00Z',
        '2.0.0': '2023-03-01T00:00:00Z',
      },
    };
    const result = extractTimeMap(response);
    expect(result).toEqual({
      '1.0.0': '2023-01-01T00:00:00Z',
      '1.1.0': '2023-02-01T00:00:00Z',
      '2.0.0': '2023-03-01T00:00:00Z',
    });
  });

  it('should return empty object when time is missing', () => {
    const response: NpmRegistryResponse = {};
    expect(extractTimeMap(response)).toEqual({});
  });

  it('should return empty object when time is undefined', () => {
    const response: NpmRegistryResponse = {
      time: undefined,
    };
    expect(extractTimeMap(response)).toEqual({});
  });

  it('should filter out non-string values', () => {
    const response = {
      time: {
        '1.0.0': '2023-01-01T00:00:00Z',
        created: 123,
        modified: null,
        '2.0.0': '2023-03-01T00:00:00Z',
      },
    };
    const result = extractTimeMap(response);
    expect(result).toEqual({
      '1.0.0': '2023-01-01T00:00:00Z',
      '2.0.0': '2023-03-01T00:00:00Z',
    });
  });

  it('should handle empty time object', () => {
    const response: NpmRegistryResponse = {
      time: {},
    };
    expect(extractTimeMap(response)).toEqual({});
  });
});
