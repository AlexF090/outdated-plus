import type { Meta } from './types.js';

/**
 * Result of a concurrent fetch operation.
 * Contains either a successful result or an error fallback value.
 */
export type FetchResult<T> = {
  item: string;
  result: T;
};

/**
 * Executes asynchronous operations on items with controlled concurrency.
 *
 * This utility prevents overwhelming the npm registry with too many
 * simultaneous requests by limiting the number of in-flight operations.
 *
 * @param items - Array of items to process (e.g., package names).
 * @param fetcher - Async function to execute for each item.
 * @param onProgress - Callback called after each item completes (for progress bar).
 * @param fallbackValue - Value to use when fetcher fails for an item.
 * @param concurrency - Maximum number of concurrent operations (default: 12).
 * @returns Promise that resolves to a Record mapping items to their results.
 */
export async function fetchWithConcurrency<T>(
  items: string[],
  // eslint-disable-next-line no-unused-vars
  fetcher: (item: string) => Promise<T>,
  onProgress: () => void,
  fallbackValue: T,
  concurrency: number,
): Promise<Record<string, T>> {
  if (items.length === 0) {
    return {};
  }

  const results: Record<string, T> = {};
  const limit = Math.max(1, concurrency);
  let inFlight = 0;
  let index = 0;

  await new Promise<void>((resolve) => {
    const tick = () => {
      while (inFlight < limit && index < items.length) {
        const item = items[index];
        index += 1;
        inFlight += 1;

        fetcher(item)
          .then((result) => {
            results[item] = result;
          })
          .catch(() => {
            results[item] = fallbackValue;
          })
          .finally(() => {
            inFlight -= 1;
            onProgress();
            if (index >= items.length && inFlight === 0) {
              resolve();
            } else {
              tick();
            }
          });
      }
    };
    tick();
  });

  return results;
}

/**
 * Default fallback value for package metadata when fetch fails.
 */
export const META_FALLBACK: Meta = { latest: '', timeMap: {} };
