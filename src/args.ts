import type { Args } from './types.js';

export function parseArgs(argv: string[]): Args {
  const a = new Map<string, string | true>();
  for (let i = 2; i < argv.length; i += 1) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k.startsWith('--')) {
      if (v && !v.startsWith('--')) {
        a.set(k, v);
        i += 1;
      } else {
        a.set(k, true);
      }
    }
  }
  const sortBy = (a.get('--sort-by') as Args['sortBy']) ?? 'published_latest';
  const order = (a.get('--order') as Args['order']) ?? 'desc';
  const format = (a.get('--format') as Args['format']) ?? 'plain';
  const concurrency = Number(a.get('--concurrency') ?? 12);
  const olderThan = Number(a.get('--older-than') ?? 0);
  const showAll = Boolean(a.get('--show-all'));
  const iso = Boolean(a.get('--iso'));
  const normalizedSort =
    sortBy === 'age'
      ? 'age_latest'
      : sortBy === 'published'
        ? 'published_latest'
        : sortBy;
  return {
    olderThan,
    showAll,
    iso,
    concurrency: Math.max(1, concurrency),
    sortBy: normalizedSort as Args['sortBy'],
    order,
    format,
  };
}
