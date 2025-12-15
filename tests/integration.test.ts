import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Integration Tests', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-12-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    consoleSpy.mockRestore();
  });

  it('should handle fetchPackageMeta with valid data', async () => {
    const mockResponse = {
      'dist-tags': { latest: '19.0.0' },
      time: {
        '18.3.0': '2023-11-01T10:00:00Z',
        '19.0.0': '2023-11-15T10:00:00Z',
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { fetchPackageMeta } = await import('../src/index.js');
    const result = await fetchPackageMeta('react');

    expect(result.latest).toBe('19.0.0');
    expect(result.timeMap['19.0.0']).toBe('2023-11-15T10:00:00Z');
  });

  it('should handle ProgressBar in quiet mode', async () => {
    const stderrSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    Object.defineProperty(process.stderr, 'isTTY', {
      value: true,
      writable: true,
      configurable: true,
    });

    const { ProgressBar } = await import('../src/index.js');
    const pb = new ProgressBar(10, true); // quiet = true

    pb.update(1);
    expect(stderrSpy).not.toHaveBeenCalled();

    stderrSpy.mockRestore();
  });

  it('should handle getPackageCount', async () => {
    const { getPackageCount } = await import('../src/index.js');
    const count = await getPackageCount();
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('should format errors correctly', async () => {
    const { NetworkError, RegistryError, formatError } = await import(
      '../src/lib/errors.js'
    );

    const networkError = new NetworkError(
      'Connection failed',
      'http://test.com',
      500,
    );
    expect(formatError(networkError)).toContain('500');
    expect(formatError(networkError)).toContain('Connection failed');

    const registryError = new RegistryError('Not found', 'my-package');
    expect(formatError(registryError)).toContain('my-package');
  });

  it('should color bump types correctly', async () => {
    const { colorBumpType } = await import('../src/lib/colors.js');

    // Just verify the functions return strings containing the bump type
    expect(colorBumpType('major')).toContain('major');
    expect(colorBumpType('minor')).toContain('minor');
    expect(colorBumpType('patch')).toContain('patch');
  });

  it('should handle printUpToDateMessage with quiet flag', async () => {
    const { printUpToDateMessage } = await import('../src/index.js');

    // With quiet = false, should print
    printUpToDateMessage(10, false);
    expect(consoleSpy).toHaveBeenCalledWith(
      'No updates available (10 packages checked)',
    );

    consoleSpy.mockClear();

    // With quiet = true, should not print
    printUpToDateMessage(10, true);
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
