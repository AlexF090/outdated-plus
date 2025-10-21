import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildRows, sortRows } from './processing.js';
import type { Meta, OutdatedMap, Row } from './types.js';

describe('buildRows', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-12-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  const mockOutdated: OutdatedMap = {
    'package-a': {
      current: '1.0.0',
      wanted: '1.1.0',
      latest: '2.0.0',
    },
    'package-b': {
      current: '2.0.0',
      wanted: '2.0.0',
      latest: '2.1.0',
    },
  };

  const mockMetas: Record<string, Meta> = {
    'package-a': {
      latest: '2.0.0',
      timeMap: {
        '1.1.0': '2023-11-01T10:00:00Z',
        '2.0.0': '2023-11-15T10:00:00Z',
      },
    },
    'package-b': {
      latest: '2.1.0',
      timeMap: {
        '2.1.0': '2023-11-20T10:00:00Z',
      },
    },
  };

  it('should build rows with all packages when showAll is true', () => {
    const rows = buildRows(mockOutdated, mockMetas, true, 0, false);
    expect(rows).toHaveLength(2);
    expect(rows[0].Package).toBe('package-a');
    expect(rows[1].Package).toBe('package-b');
  });

  it('should filter packages by age when showAll is false', () => {
    const rows = buildRows(mockOutdated, mockMetas, false, 20, false);
    expect(rows).toHaveLength(1);
  });

  it('should filter out packages that do not meet age criteria', () => {
    const rows = buildRows(mockOutdated, mockMetas, false, 50, false);
    expect(rows).toHaveLength(0);
  });

  it('should format time in ISO format when requested', () => {
    const rows = buildRows(mockOutdated, mockMetas, true, 0, true);
    expect(rows[0].PublishedWanted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/);
  });

  it('should handle missing metadata gracefully', () => {
    const emptyMetas: Record<string, Meta> = {};
    const rows = buildRows(mockOutdated, emptyMetas, true, 0, false);
    expect(rows).toHaveLength(2);
    expect(rows[0].PublishedWanted).toBe('-');
    expect(rows[0].AgeWanted).toBe('-');
  });

  it('should calculate bump types correctly', () => {
    const rows = buildRows(mockOutdated, mockMetas, true, 0, false);
    expect(rows[0].ToWanted).toBe('minor');
    expect(rows[0].ToLatest).toBe('major');
    expect(rows[1].ToWanted).toBe('same');
    expect(rows[1].ToLatest).toBe('minor');
  });

  it('should set internal fields correctly', () => {
    const rows = buildRows(mockOutdated, mockMetas, true, 0, false);
    const row = rows[0];
    expect(row._name).toBe('package-a');
    expect(row._published_wanted).toBeGreaterThan(0);
    expect(row._published_latest).toBeGreaterThan(0);
    expect(row._age_wanted).toBeGreaterThan(0);
    expect(row._age_latest).toBeGreaterThan(0);
    expect(row._latest).toBe('2.0.0');
  });
});

describe('sortRows', () => {
  const mockRows: Row[] = [
    {
      Package: 'package-c',
      Current: '1.0.0',
      Wanted: '1.1.0',
      ToWanted: 'minor',
      Latest: '2.0.0',
      ToLatest: 'major',
      PublishedWanted: '2023-11-01',
      AgeWanted: '30',
      PublishedLatest: '2023-11-15',
      AgeLatest: '16',
      _name: 'package-c',
      _published_wanted: 1698835200000,
      _published_latest: 1700044800000,
      _age_wanted: 30,
      _age_latest: 16,
      _latest: '2.0.0',
    },
    {
      Package: 'package-a',
      Current: '2.0.0',
      Wanted: '2.0.0',
      ToWanted: 'same',
      Latest: '2.1.0',
      ToLatest: 'minor',
      PublishedWanted: '2023-10-01',
      AgeWanted: '61',
      PublishedLatest: '2023-11-20',
      AgeLatest: '11',
      _name: 'package-a',
      _published_wanted: 1696176000000,
      _published_latest: 1700409600000,
      _age_wanted: 61,
      _age_latest: 11,
      _latest: '2.1.0',
    },
  ];

  it('should sort by name ascending', () => {
    const sorted = sortRows(mockRows, 'name', 'asc');
    expect(sorted[0].Package).toBe('package-a');
    expect(sorted[1].Package).toBe('package-c');
  });

  it('should sort by name descending', () => {
    const sorted = sortRows(mockRows, 'name', 'desc');
    expect(sorted[0].Package).toBe('package-c');
    expect(sorted[1].Package).toBe('package-a');
  });

  it('should sort by age_latest ascending', () => {
    const sorted = sortRows(mockRows, 'age_latest', 'asc');
    expect(sorted[0].Package).toBe('package-a');
    expect(sorted[1].Package).toBe('package-c');
  });

  it('should sort by age_latest descending', () => {
    const sorted = sortRows(mockRows, 'age_latest', 'desc');
    expect(sorted[0].Package).toBe('package-c');
    expect(sorted[1].Package).toBe('package-a');
  });

  it('should sort by age_wanted ascending', () => {
    const sorted = sortRows(mockRows, 'age_wanted', 'asc');
    expect(sorted[0].Package).toBe('package-c');
    expect(sorted[1].Package).toBe('package-a');
  });

  it('should sort by published_latest ascending', () => {
    const sorted = sortRows(mockRows, 'published_latest', 'asc');
    expect(sorted[0].Package).toBe('package-c');
    expect(sorted[1].Package).toBe('package-a');
  });

  it('should sort by published_wanted ascending', () => {
    const sorted = sortRows(mockRows, 'published_wanted', 'asc');
    expect(sorted[0].Package).toBe('package-a');
    expect(sorted[1].Package).toBe('package-c');
  });

  it('should sort by current version', () => {
    const sorted = sortRows(mockRows, 'current', 'asc');
    expect(sorted[0].Current).toBe('1.0.0');
    expect(sorted[1].Current).toBe('2.0.0');
  });

  it('should sort by wanted version', () => {
    const sorted = sortRows(mockRows, 'wanted', 'asc');
    expect(sorted[0].Wanted).toBe('1.1.0');
    expect(sorted[1].Wanted).toBe('2.0.0');
  });

  it('should sort by latest version', () => {
    const sorted = sortRows(mockRows, 'latest', 'asc');
    expect(sorted[0]._latest).toBe('2.0.0');
    expect(sorted[1]._latest).toBe('2.1.0');
  });

  it('should not mutate original array', () => {
    const original = [...mockRows];
    sortRows(mockRows, 'name', 'asc');
    expect(mockRows).toEqual(original);
  });

  it('should default to published_latest when sortBy is invalid', () => {
    const sorted = sortRows(mockRows, 'invalid' as any, 'asc');
    expect(sorted[0].Package).toBe('package-c');
    expect(sorted[1].Package).toBe('package-a');
  });
});
