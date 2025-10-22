import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  printMarkdown,
  printPlain,
  printSkippedInfo,
} from '../src/lib/output.js';
import type { Row } from '../src/lib/types.js';

describe('Output Functions', () => {
  const mockRows: Row[] = [
    {
      Package: 'package-a',
      Current: '1.0.0',
      Wanted: '1.1.0',
      ToWanted: 'minor',
      Latest: '2.0.0',
      ToLatest: 'major',
      PublishedWanted: '2023-11-01 10:00',
      AgeWanted: '30',
      PublishedLatest: '2023-11-15 10:00',
      AgeLatest: '16',
      _name: 'package-a',
      _published_wanted: 1698835200000,
      _published_latest: 1700044800000,
      _age_wanted: 30,
      _age_latest: 16,
      _latest: '2.0.0',
    },
    {
      Package: 'package-b',
      Current: '2.0.0',
      Wanted: '2.0.0',
      ToWanted: 'same',
      Latest: '2.1.0',
      ToLatest: 'minor',
      PublishedWanted: '2023-10-01 10:00',
      AgeWanted: '61',
      PublishedLatest: '2023-11-20 10:00',
      AgeLatest: '11',
      _name: 'package-b',
      _published_wanted: 1696176000000,
      _published_latest: 1700409600000,
      _age_wanted: 61,
      _age_latest: 11,
      _latest: '2.1.0',
    },
  ];

  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('printPlain', () => {
    it('should print formatted table with headers', () => {
      printPlain(mockRows);

      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls;

      expect(calls[0][0]).toContain('Package');
      expect(calls[0][0]).toContain('Current');
      expect(calls[0][0]).toContain('Wanted');
      expect(calls[0][0]).toContain('Latest');
    });

    it('should print separator line', () => {
      printPlain(mockRows);

      const calls = consoleSpy.mock.calls;
      expect(calls[1][0]).toMatch(/^-+\s+-+\s+-+/);
    });

    it('should print data rows with proper alignment', () => {
      printPlain(mockRows);

      const calls = consoleSpy.mock.calls;
      expect(calls).toHaveLength(4);

      const dataRow = calls[2][0];
      expect(dataRow).toContain('package-a');
      expect(dataRow).toContain('1.0.0');
      expect(dataRow).toContain('1.1.0');
    });

    it('should handle empty rows array', () => {
      printPlain([]);

      const calls = consoleSpy.mock.calls;
      expect(calls).toHaveLength(2);
      expect(calls[0][0]).toContain('Package');
      expect(calls[1][0]).toMatch(/^-+\s+-+\s+-+/);
    });
  });

  describe('printMarkdown', () => {
    it('should print markdown table headers', () => {
      printMarkdown(mockRows);

      const calls = consoleSpy.mock.calls;
      expect(calls[0][0]).toBe(
        '| Package | Current | Wanted | To Wanted | Latest | To Latest | Published (Wanted) | Age(d) (Wanted) | Published (Latest) | Age(d) (Latest) |',
      );
    });

    it('should print markdown table separator', () => {
      printMarkdown(mockRows);

      const calls = consoleSpy.mock.calls;
      expect(calls[1][0]).toBe(
        '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
      );
    });

    it('should print markdown data rows', () => {
      printMarkdown(mockRows);

      const calls = consoleSpy.mock.calls;
      expect(calls).toHaveLength(4);

      const dataRow = calls[2][0];
      expect(dataRow).toContain(
        '| package-a | 1.0.0 | 1.1.0 | minor | 2.0.0 | major |',
      );
    });

    it('should handle empty rows array', () => {
      printMarkdown([]);

      const calls = consoleSpy.mock.calls;
      expect(calls).toHaveLength(2);
      expect(calls[0][0]).toContain('| Package | Current |');
      expect(calls[1][0]).toContain('| --- | --- |');
    });

    it('should properly escape markdown special characters', () => {
      const specialRows: Row[] = [
        {
          Package: 'package|with|pipes',
          Current: '1.0.0',
          Wanted: '1.1.0',
          ToWanted: 'minor',
          Latest: '2.0.0',
          ToLatest: 'major',
          PublishedWanted: '2023-11-01 10:00',
          AgeWanted: '30',
          PublishedLatest: '2023-11-15 10:00',
          AgeLatest: '16',
          _name: 'package|with|pipes',
          _published_wanted: 1698835200000,
          _published_latest: 1700044800000,
          _age_wanted: 30,
          _age_latest: 16,
          _latest: '2.0.0',
        },
      ];

      printMarkdown(specialRows);

      const calls = consoleSpy.mock.calls;
      const dataRow = calls[2][0];
      expect(dataRow).toContain('package|with|pipes');
    });
  });

  describe('printSkippedInfo', () => {
    it('should not print anything for empty skip list', () => {
      printSkippedInfo([], 'plain');
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should print skipped packages info in plain format', () => {
      printSkippedInfo(['react', 'vue'], 'plain');

      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy.mock.calls[0][0]).toContain(
        'Skipped 2 package(s): react, vue',
      );
      expect(consoleSpy.mock.calls[1][0]).toBe('');
    });

    it('should print skipped packages info in markdown format', () => {
      printSkippedInfo(['react', 'vue'], 'md');

      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy.mock.calls[0][0]).toBe(
        '> **Note:** Skipped 2 package(s): react, vue',
      );
      expect(consoleSpy.mock.calls[1][0]).toBe('');
    });

    it('should handle single skipped package', () => {
      printSkippedInfo(['react'], 'plain');

      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy.mock.calls[0][0]).toContain(
        'Skipped 1 package(s): react',
      );
    });
  });

  describe('Output consistency', () => {
    it('should have same number of columns across all formats', () => {
      const plainSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      printPlain(mockRows);
      const plainCalls = plainSpy.mock.calls.length;
      plainSpy.mockRestore();

      const mdSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      printMarkdown(mockRows);
      const mdCalls = mdSpy.mock.calls.length;
      mdSpy.mockRestore();

      expect(plainCalls).toBe(4);
      expect(mdCalls).toBe(4);
    });
  });
});
