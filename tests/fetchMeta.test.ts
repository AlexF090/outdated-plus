import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('fetchPackageMeta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch meta data with dist-tags structure', async () => {
    const mockData = {
      'dist-tags': { latest: '1.0.0' },
      time: {
        '1.0.0': '2023-11-01T10:00:00Z',
        '0.9.0': '2023-10-01T10:00:00Z',
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { fetchPackageMeta } = await import('../src/index.js');
    const result = await fetchPackageMeta('test-package');

    expect(result).toEqual({
      latest: '1.0.0',
      timeMap: {
        '1.0.0': '2023-11-01T10:00:00Z',
        '0.9.0': '2023-10-01T10:00:00Z',
      },
    });
  });

  it('should handle empty response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const { fetchPackageMeta } = await import('../src/index.js');
    const result = await fetchPackageMeta('test-package');

    expect(result).toEqual({
      latest: '',
      timeMap: {},
    });
  });

  it('should handle 404 errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const { fetchPackageMeta } = await import('../src/index.js');

    await expect(fetchPackageMeta('test-package')).rejects.toThrow(
      'Package not found',
    );
  });

  it('should handle network errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { fetchPackageMeta } = await import('../src/index.js');

    await expect(fetchPackageMeta('test-package')).rejects.toThrow(
      'Failed to fetch package metadata',
    );
  });

  it('should handle missing time data', async () => {
    const mockData = {
      'dist-tags': { latest: '1.0.0' },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { fetchPackageMeta } = await import('../src/index.js');
    const result = await fetchPackageMeta('test-package');

    expect(result).toEqual({
      latest: '1.0.0',
      timeMap: {},
    });
  });

  it('should handle missing dist-tags', async () => {
    const mockData = {
      time: {
        '1.0.0': '2023-11-01T10:00:00Z',
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { fetchPackageMeta } = await import('../src/index.js');
    const result = await fetchPackageMeta('test-package');

    expect(result).toEqual({
      latest: '',
      timeMap: {
        '1.0.0': '2023-11-01T10:00:00Z',
      },
    });
  });

  it('should filter out non-string time values', async () => {
    const mockData = {
      'dist-tags': { latest: '1.0.0' },
      time: {
        '1.0.0': '2023-11-01T10:00:00Z',
        '0.9.0': 1234567890,
        '0.8.0': null,
        '0.7.0': '2023-10-01T10:00:00Z',
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { fetchPackageMeta } = await import('../src/index.js');
    const result = await fetchPackageMeta('test-package');

    expect(result).toEqual({
      latest: '1.0.0',
      timeMap: {
        '1.0.0': '2023-11-01T10:00:00Z',
        '0.7.0': '2023-10-01T10:00:00Z',
      },
    });
  });

  it('should handle fetch exceptions', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { fetchPackageMeta } = await import('../src/index.js');

    await expect(fetchPackageMeta('test-package')).rejects.toThrow();
  });
});
