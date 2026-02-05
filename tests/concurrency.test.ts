import { describe, expect, it, vi } from 'vitest';
import { fetchWithConcurrency, META_FALLBACK } from '../src/lib/concurrency.js';

describe('fetchWithConcurrency', () => {
  it('should return empty object for empty items array', async () => {
    const result = await fetchWithConcurrency<string>(
      [],
      async () => 'result',
      vi.fn(),
      'fallback',
      5,
    );
    expect(result).toEqual({});
  });

  it('should fetch all items with correct results', async () => {
    const items = ['a', 'b', 'c'];
    const fetcher = async (item: string) => `result-${item}`;
    const onProgress = vi.fn();

    const result = await fetchWithConcurrency(
      items,
      fetcher,
      onProgress,
      'fallback',
      5,
    );

    expect(result).toEqual({
      a: 'result-a',
      b: 'result-b',
      c: 'result-c',
    });
    expect(onProgress).toHaveBeenCalledTimes(3);
  });

  it('should use fallback value when fetcher fails', async () => {
    const items = ['success', 'fail', 'success2'];
    const fetcher = async (item: string) => {
      if (item === 'fail') {
        throw new Error('Simulated failure');
      }
      return `result-${item}`;
    };
    const onProgress = vi.fn();

    const result = await fetchWithConcurrency(
      items,
      fetcher,
      onProgress,
      'fallback',
      5,
    );

    expect(result).toEqual({
      success: 'result-success',
      fail: 'fallback',
      success2: 'result-success2',
    });
    expect(onProgress).toHaveBeenCalledTimes(3);
  });

  it('should respect concurrency limit', async () => {
    let maxConcurrent = 0;
    let currentConcurrent = 0;
    const items = ['a', 'b', 'c', 'd', 'e'];

    const fetcher = async (item: string) => {
      currentConcurrent++;
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
      await new Promise((resolve) => setTimeout(resolve, 10));
      currentConcurrent--;
      return `result-${item}`;
    };

    await fetchWithConcurrency(items, fetcher, vi.fn(), 'fallback', 2);

    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it('should handle concurrency of 1 (sequential)', async () => {
    const executionOrder: string[] = [];
    const items = ['a', 'b', 'c'];

    const fetcher = async (item: string) => {
      executionOrder.push(`start-${item}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
      executionOrder.push(`end-${item}`);
      return `result-${item}`;
    };

    await fetchWithConcurrency(items, fetcher, vi.fn(), 'fallback', 1);

    // With concurrency 1, each item should start and end before the next starts
    expect(executionOrder[0]).toBe('start-a');
    expect(executionOrder[1]).toBe('end-a');
    expect(executionOrder[2]).toBe('start-b');
  });
});

describe('META_FALLBACK', () => {
  it('should have correct shape', () => {
    expect(META_FALLBACK).toEqual({
      latest: '',
      timeMap: {},
    });
  });
});
