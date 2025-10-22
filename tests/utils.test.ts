import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bumpType,
  daysAgo,
  fmtTime,
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
    expect(parseSemver('1.2.3')).toEqual([1, 2, 3, '']);
    expect(parseSemver('v1.2.3')).toEqual([1, 2, 3, '']);
    expect(parseSemver('=1.2.3')).toEqual([1, 2, 3, '']);
    expect(parseSemver('1.2.3-beta.1')).toEqual([1, 2, 3, 'beta.1']);
  });

  it('should handle versions with build metadata', () => {
    expect(parseSemver('1.2.3+build.1')).toEqual([1, 2, 3, '']);
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

  it('should skip package when wanted version matches', () => {
    const result = shouldSkipPackage('react', '18.1.0', '18.2.0', '18.3.0', [
      'react@18.2.0',
    ]);
    expect(result).toBe(true);
  });

  it('should skip package when latest version matches', () => {
    const result = shouldSkipPackage('react', '18.1.0', '18.2.0', '18.3.0', [
      'react@18.3.0',
    ]);
    expect(result).toBe(true);
  });

  it('should not skip package when version does not match', () => {
    const result = shouldSkipPackage('react', '18.1.0', '18.2.0', '18.3.0', [
      'react@18.1.0',
    ]);
    expect(result).toBe(false);
  });

  it('should handle multiple skip entries', () => {
    const result = shouldSkipPackage('react', '18.1.0', '18.2.0', '18.3.0', [
      'vue@3.2.0',
      'react@18.2.0',
      'angular@15.0.0',
    ]);
    expect(result).toBe(true);
  });

  it('should handle scoped packages', () => {
    const result = shouldSkipPackage(
      '@types/react',
      '18.1.0',
      '18.2.0',
      '18.3.0',
      ['@types/react@18.2.0'],
    );
    expect(result).toBe(true);
  });
});
