import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('HTTP API Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchPackageMeta', () => {
    it('should fetch package metadata from registry', async () => {
      const mockResponse = {
        'dist-tags': { latest: '2.0.0' },
        time: {
          '1.0.0': '2023-01-01T10:00:00Z',
          '2.0.0': '2023-06-01T10:00:00Z',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { fetchPackageMeta } = await import('../src/index.js');
      const result = await fetchPackageMeta('test-package');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/test-package',
        expect.objectContaining({
          headers: { Accept: 'application/json' },
        }),
      );
      expect(result.latest).toBe('2.0.0');
      expect(result.timeMap['1.0.0']).toBe('2023-01-01T10:00:00Z');
      expect(result.timeMap['2.0.0']).toBe('2023-06-01T10:00:00Z');
    });

    it('should handle 404 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { fetchPackageMeta } = await import('../src/index.js');

      await expect(fetchPackageMeta('nonexistent-package')).rejects.toThrow(
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

    it('should handle fetch failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { fetchPackageMeta } = await import('../src/index.js');

      await expect(fetchPackageMeta('test-package')).rejects.toThrow();
    });
  });
});
