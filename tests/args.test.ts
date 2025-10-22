import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanupAndSaveSkipFile, parseArgs } from '../src/args.js';
import type { OutdatedMap, SkipFileConfig } from '../src/lib/types.js';

describe('parseArgs', () => {
  it('should parse default arguments', () => {
    const result = parseArgs(['node', 'script.js']);
    expect(result.olderThan).toBe(0);
    expect(result.showAll).toBe(false);
    expect(result.iso).toBe(false);
    expect(result.concurrency).toBe(12);
    expect(result.sortBy).toBe('published_latest');
    expect(result.order).toBe('desc');
    expect(result.format).toBe('plain');
  });

  it('should parse custom arguments', () => {
    const result = parseArgs([
      'node',
      'script.js',
      '--older-than',
      '30',
      '--show-all',
      '--iso',
      '--concurrency',
      '5',
      '--sort-by',
      'name',
      '--order',
      'asc',
      '--format',
      'md',
    ]);
    expect(result.olderThan).toBe(30);
    expect(result.showAll).toBe(true);
    expect(result.iso).toBe(true);
    expect(result.concurrency).toBe(5);
    expect(result.sortBy).toBe('name');
    expect(result.order).toBe('asc');
    expect(result.format).toBe('md');
  });

  it('should handle boolean flags', () => {
    const result = parseArgs(['node', 'script.js', '--show-all', '--iso']);
    expect(result.showAll).toBe(true);
    expect(result.iso).toBe(true);
  });

  it('should normalize legacy sort options', () => {
    const ageResult = parseArgs(['node', 'script.js', '--sort-by', 'age']);
    expect(ageResult.sortBy).toBe('age_latest');

    const publishedResult = parseArgs([
      'node',
      'script.js',
      '--sort-by',
      'published',
    ]);
    expect(publishedResult.sortBy).toBe('published_latest');
  });

  it('should ensure minimum concurrency of 1', () => {
    const result = parseArgs(['node', 'script.js', '--concurrency', '0']);
    expect(result.concurrency).toBe(1);

    const negativeResult = parseArgs([
      'node',
      'script.js',
      '--concurrency',
      '-5',
    ]);
    expect(negativeResult.concurrency).toBe(1);
  });

  it('should handle all sort options', () => {
    const sortOptions = [
      'name',
      'age_latest',
      'age_wanted',
      'published_latest',
      'published_wanted',
      'current',
      'wanted',
      'latest',
    ];

    for (const sortBy of sortOptions) {
      const result = parseArgs(['node', 'script.js', '--sort-by', sortBy]);
      expect(result.sortBy).toBe(sortBy);
    }
  });

  it('should handle all order options', () => {
    const ascResult = parseArgs(['node', 'script.js', '--order', 'asc']);
    expect(ascResult.order).toBe('asc');

    const descResult = parseArgs(['node', 'script.js', '--order', 'desc']);
    expect(descResult.order).toBe('desc');
  });

  it('should handle all format options', () => {
    const formats = ['plain', 'md'];

    for (const format of formats) {
      const result = parseArgs(['node', 'script.js', '--format', format]);
      expect(result.format).toBe(format);
    }
  });

  it('should parse skip packages from command line', () => {
    const result = parseArgs([
      'node',
      'script.js',
      '--skip',
      'react,vue,angular',
    ]);
    expect(result.skip).toEqual(['react', 'vue', 'angular']);
  });

  it('should handle single skip package', () => {
    const result = parseArgs(['node', 'script.js', '--skip', 'react']);
    expect(result.skip).toEqual(['react']);
  });

  it('should handle skip packages with spaces', () => {
    const result = parseArgs([
      'node',
      'script.js',
      '--skip',
      'react, vue , angular',
    ]);
    expect(result.skip).toEqual(['react', 'vue', 'angular']);
  });

  it('should default to empty skip array when no skip options provided', () => {
    const result = parseArgs(['node', 'script.js']);
    expect(result.skip).toEqual([]);
  });
});

describe('cleanupAndSaveSkipFile', () => {
  const testFilePath = join(process.cwd(), '.test-outdated-plus-skip');

  beforeEach(() => {
    // Clean up any existing test file
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
  });

  afterEach(() => {
    // Clean up test file after each test
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
  });

  it('should return early if no skip config or file path', () => {
    cleanupAndSaveSkipFile(null, null, {});
    expect(existsSync(testFilePath)).toBe(false);

    cleanupAndSaveSkipFile({ packages: [], reason: 'test' }, null, {});
    expect(existsSync(testFilePath)).toBe(false);
  });

  it('should return early if autoCleanup is disabled', () => {
    const skipConfig: SkipFileConfig = {
      packages: ['react@18.0.0'],
      reason: 'test',
      autoCleanup: false,
    };
    const outdated: OutdatedMap = {
      react: {
        current: '17.0.0',
        wanted: '18.0.0',
        latest: '18.2.0',
        location: '',
        dependent: '',
        type: 'dependencies',
      },
    };

    cleanupAndSaveSkipFile(skipConfig, testFilePath, outdated);
    expect(existsSync(testFilePath)).toBe(false);
  });

  it('should remove package entries that are no longer outdated', () => {
    const skipConfig: SkipFileConfig = {
      packages: ['react@18.0.0', 'vue@3.0.0'],
      reason: 'test',
      autoCleanup: true,
    };
    const outdated: OutdatedMap = {
      react: {
        current: '17.0.0',
        wanted: '17.2.0', // wanted is below skip version, so entry should be kept
        latest: '18.2.0',
        location: '',
        dependent: '',
        type: 'dependencies',
      },
      // vue is not in outdated list anymore, so it should be removed
    };

    cleanupAndSaveSkipFile(skipConfig, testFilePath, outdated);
    expect(existsSync(testFilePath)).toBe(true);

    const content = JSON.parse(readFileSync(testFilePath, 'utf-8'));
    expect(content.packages).toEqual(['react@18.0.0']); // Only react should remain
  });

  it('should remove version entries when current version reaches skip version', () => {
    const skipConfig: SkipFileConfig = {
      packages: ['react@18.0.0', 'vue@3.0.0'],
      reason: 'test',
      autoCleanup: true,
    };
    const outdated: OutdatedMap = {
      react: {
        current: '18.0.0', // Now at skip version, so react@18.0.0 should be removed
        wanted: '18.2.0',
        latest: '18.2.0',
        location: '',
        dependent: '',
        type: 'dependencies',
      },
      vue: {
        current: '2.9.0',
        wanted: '2.9.5', // wanted is below skip version, so vue@3.0.0 should be kept
        latest: '3.2.0',
        location: '',
        dependent: '',
        type: 'dependencies',
      },
    };

    cleanupAndSaveSkipFile(skipConfig, testFilePath, outdated);
    expect(existsSync(testFilePath)).toBe(true);

    const content = JSON.parse(readFileSync(testFilePath, 'utf-8'));
    expect(content.packages).toEqual(['vue@3.0.0']);
  });

  it('should remove version entries when wanted version reaches skip version', () => {
    const skipConfig: SkipFileConfig = {
      packages: ['react@18.0.0'],
      reason: 'test',
      autoCleanup: true,
    };
    const outdated: OutdatedMap = {
      react: {
        current: '17.0.0',
        wanted: '18.0.0', // Wanted is now at skip version
        latest: '18.2.0',
        location: '',
        dependent: '',
        type: 'dependencies',
      },
    };

    cleanupAndSaveSkipFile(skipConfig, testFilePath, outdated);
    expect(existsSync(testFilePath)).toBe(true);

    const content = JSON.parse(readFileSync(testFilePath, 'utf-8'));
    expect(content.packages).toEqual([]);
  });

  it('should keep version entries when neither current nor wanted reached skip version', () => {
    const skipConfig: SkipFileConfig = {
      packages: ['react@18.0.0'],
      reason: 'test',
      autoCleanup: true,
    };
    const outdated: OutdatedMap = {
      react: {
        current: '17.0.0',
        wanted: '17.2.0', // Both below skip version
        latest: '18.2.0',
        location: '',
        dependent: '',
        type: 'dependencies',
      },
    };

    cleanupAndSaveSkipFile(skipConfig, testFilePath, outdated);
    expect(existsSync(testFilePath)).toBe(false);
  });

  it('should keep package entries without version specification', () => {
    const skipConfig: SkipFileConfig = {
      packages: ['react', 'vue@3.0.0'],
      reason: 'test',
      autoCleanup: true,
    };
    const outdated: OutdatedMap = {
      react: {
        current: '17.0.0',
        wanted: '18.0.0',
        latest: '18.2.0',
        location: '',
        dependent: '',
        type: 'dependencies',
      },
      vue: {
        current: '2.9.0',
        wanted: '3.0.0', // wanted equals skip version, so vue@3.0.0 should be removed
        latest: '3.2.0',
        location: '',
        dependent: '',
        type: 'dependencies',
      },
    };

    cleanupAndSaveSkipFile(skipConfig, testFilePath, outdated);
    expect(existsSync(testFilePath)).toBe(true);

    const content = JSON.parse(readFileSync(testFilePath, 'utf-8'));
    expect(content.packages).toEqual(['react']); // Only react should remain
  });

  it('should handle write errors gracefully', () => {
    const skipConfig: SkipFileConfig = {
      packages: ['react@18.0.0'],
      reason: 'test',
      autoCleanup: true,
    };
    const outdated: OutdatedMap = {
      react: {
        current: '18.0.0',
        wanted: '18.2.0',
        latest: '18.2.0',
        location: '',
        dependent: '',
        type: 'dependencies',
      },
    };

    // Use an invalid path to trigger write error
    const invalidPath = '/invalid/path/that/does/not/exist/test-skip.json';

    // Should not throw
    expect(() => {
      cleanupAndSaveSkipFile(skipConfig, invalidPath, outdated);
    }).not.toThrow();
  });
});
