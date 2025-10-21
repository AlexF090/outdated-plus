import { describe, expect, it } from 'vitest';
import { parseArgs } from './args.js';

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
      'tsv',
    ]);
    expect(result.olderThan).toBe(30);
    expect(result.showAll).toBe(true);
    expect(result.iso).toBe(true);
    expect(result.concurrency).toBe(5);
    expect(result.sortBy).toBe('name');
    expect(result.order).toBe('asc');
    expect(result.format).toBe('tsv');
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
    const formats = ['plain', 'tsv', 'md'];

    for (const format of formats) {
      const result = parseArgs(['node', 'script.js', '--format', format]);
      expect(result.format).toBe(format);
    }
  });
});