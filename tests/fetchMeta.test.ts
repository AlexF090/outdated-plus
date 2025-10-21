import { spawn } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process');

describe('fetchMeta', () => {
  let mockSpawn: ReturnType<typeof vi.mocked<typeof spawn>>;

  beforeEach(() => {
    mockSpawn = vi.mocked(spawn);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function createMockChild(stdoutData: string) {
    return {
      stdout: {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            callback(stdoutData);
          }
        }),
      },
      on: vi.fn((event, callback) => {
        if (event === 'close') {
          callback(0);
        }
      }),
    };
  }

  it('should fetch meta data with dist-tags structure', async () => {
    const mockData = {
      'dist-tags': { latest: '1.0.0' },
      time: {
        '1.0.0': '2023-11-01T10:00:00Z',
        '0.9.0': '2023-10-01T10:00:00Z',
      },
    };

    mockSpawn.mockReturnValue(createMockChild(JSON.stringify(mockData)) as any);

    const { fetchMeta } = await import('../src/index.js');
    const result = await fetchMeta('test-package');

    expect(result).toEqual({
      latest: '1.0.0',
      timeMap: {
        '1.0.0': '2023-11-01T10:00:00Z',
        '0.9.0': '2023-10-01T10:00:00Z',
      },
    });
  });

  it('should fetch meta data with alternative dist-tags structure', async () => {
    const mockData = {
      'dist-tags.latest': '1.0.0',
      time: {
        '1.0.0': '2023-11-01T10:00:00Z',
      },
    };

    mockSpawn.mockReturnValue(createMockChild(JSON.stringify(mockData)) as any);

    const { fetchMeta } = await import('../src/index.js');
    const result = await fetchMeta('test-package');

    expect(result).toEqual({
      latest: '1.0.0',
      timeMap: {
        '1.0.0': '2023-11-01T10:00:00Z',
      },
    });
  });

  it('should handle empty response', async () => {
    mockSpawn.mockReturnValue(createMockChild('{}') as any);

    const { fetchMeta } = await import('../src/index.js');
    const result = await fetchMeta('test-package');

    expect(result).toEqual({
      latest: '',
      timeMap: {},
    });
  });

  it('should handle malformed JSON', async () => {
    mockSpawn.mockReturnValue(createMockChild('invalid json') as any);

    const { fetchMeta } = await import('../src/index.js');
    const result = await fetchMeta('test-package');

    expect(result).toEqual({
      latest: '',
      timeMap: {},
    });
  });

  it('should handle missing time data', async () => {
    const mockData = {
      'dist-tags': { latest: '1.0.0' },
    };

    mockSpawn.mockReturnValue(createMockChild(JSON.stringify(mockData)) as any);

    const { fetchMeta } = await import('../src/index.js');
    const result = await fetchMeta('test-package');

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

    mockSpawn.mockReturnValue(createMockChild(JSON.stringify(mockData)) as any);

    const { fetchMeta } = await import('../src/index.js');
    const result = await fetchMeta('test-package');

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

    mockSpawn.mockReturnValue(createMockChild(JSON.stringify(mockData)) as any);

    const { fetchMeta } = await import('../src/index.js');
    const result = await fetchMeta('test-package');

    expect(result).toEqual({
      latest: '1.0.0',
      timeMap: {
        '1.0.0': '2023-11-01T10:00:00Z',
        '0.7.0': '2023-10-01T10:00:00Z',
      },
    });
  });
});
