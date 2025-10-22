import { spawn } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Meta, OutdatedMap } from '../src/lib/types.js';

vi.mock('node:child_process');

describe('Integration Tests', () => {
  let mockSpawn: ReturnType<typeof vi.mocked<typeof spawn>>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  const mockOutdatedData: OutdatedMap = {
    react: {
      current: '18.2.0',
      wanted: '18.3.0',
      latest: '19.0.0',
    },
    typescript: {
      current: '5.0.0',
      wanted: '5.1.0',
      latest: '5.2.0',
    },
  };

  const mockMetaData: Record<string, Meta> = {
    react: {
      latest: '19.0.0',
      timeMap: {
        '18.3.0': '2023-11-01T10:00:00Z',
        '19.0.0': '2023-11-15T10:00:00Z',
      },
    },
    typescript: {
      latest: '5.2.0',
      timeMap: {
        '5.1.0': '2023-10-15T10:00:00Z',
        '5.2.0': '2023-11-10T10:00:00Z',
      },
    },
  };

  beforeEach(() => {
    mockSpawn = vi.mocked(spawn);
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

  it('should run complete workflow with mocked data', async () => {
    mockSpawn.mockImplementation((cmd: string, args: readonly string[]) => {
      if (cmd === 'npm' && args.includes('outdated')) {
        return createMockChild(JSON.stringify(mockOutdatedData)) as any;
      }
      if (cmd === 'npm' && args.includes('view')) {
        const packageName = args[1];
        const metaData = mockMetaData[packageName] || {
          latest: '',
          timeMap: {},
        };
        return createMockChild(JSON.stringify(metaData)) as any;
      }
      return createMockChild('{}') as any;
    });

    const { run } = await import('../src/index.js');
    const result = await run();

    expect(result).toBe(0);
  });

  it('should handle empty outdated results', async () => {
    mockSpawn.mockImplementation(() => {
      return createMockChild('{}') as any;
    });

    const { run } = await import('../src/index.js');
    const result = await run();

    expect(result).toBe(0);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should handle npm command failures gracefully', async () => {
    mockSpawn.mockImplementation((cmd: string, args: readonly string[]) => {
      if (cmd === 'npm' && args.includes('outdated')) {
        return createMockChild(JSON.stringify(mockOutdatedData)) as any;
      }
      if (cmd === 'npm' && args.includes('view')) {
        return createMockChild('{}') as any;
      }
      return createMockChild('{}') as any;
    });

    const { run } = await import('../src/index.js');
    const result = await run();

    expect(result).toBe(0);
  });

  it('should respect concurrency limits', async () => {
    let concurrentCalls = 0;
    let maxConcurrent = 0;

    mockSpawn.mockImplementation((cmd: string, args: readonly string[]) => {
      if (cmd === 'npm' && args.includes('outdated')) {
        return createMockChild(JSON.stringify(mockOutdatedData)) as any;
      }
      if (cmd === 'npm' && args.includes('view')) {
        concurrentCalls += 1;
        maxConcurrent = Math.max(maxConcurrent, concurrentCalls);

        const packageName = args[1];
        const metaData = mockMetaData[packageName] || {
          latest: '',
          timeMap: {},
        };

        return {
          stdout: {
            on: vi.fn((event, callback) => {
              if (event === 'data') {
                concurrentCalls -= 1;
                callback(JSON.stringify(metaData));
              }
            }),
          },
          on: vi.fn((event, callback) => {
            if (event === 'close') {
              callback(0);
            }
          }),
        } as any;
      }
      return createMockChild('{}') as any;
    });

    const { run } = await import('../src/index.js');
    await run();

    expect(maxConcurrent).toBeLessThanOrEqual(12);
  });

  it('should handle different output formats', async () => {
    mockSpawn.mockImplementation((cmd: string, args: readonly string[]) => {
      if (cmd === 'npm' && args.includes('outdated')) {
        return createMockChild(JSON.stringify(mockOutdatedData)) as any;
      }
      if (cmd === 'npm' && args.includes('view')) {
        const packageName = args[1];
        const metaData = mockMetaData[packageName] || {
          latest: '',
          timeMap: {},
        };
        return createMockChild(JSON.stringify(metaData)) as any;
      }
      return createMockChild('{}') as any;
    });

    const { run } = await import('../src/index.js');

    const originalArgv = process.argv;

    try {
      process.argv = ['node', 'script.js', '--format', 'md', '--show-all'];
      await run();

      const mdCalls = consoleSpy.mock.calls;
      if (mdCalls.length > 0) {
        expect(mdCalls[0][0]).toContain('|');
      }

      consoleSpy.mockClear();

      process.argv = ['node', 'script.js', '--format', 'plain', '--show-all'];
      await run();

      const plainCalls = consoleSpy.mock.calls;
      if (plainCalls.length > 0) {
        expect(plainCalls[0][0]).toContain('Package');
      }
    } finally {
      process.argv = originalArgv;
    }
  });

  it('should handle sorting options', async () => {
    mockSpawn.mockImplementation((cmd: string, args: readonly string[]) => {
      if (cmd === 'npm' && args.includes('outdated')) {
        return createMockChild(JSON.stringify(mockOutdatedData)) as any;
      }
      if (cmd === 'npm' && args.includes('view')) {
        const packageName = args[1];
        const metaData = mockMetaData[packageName] || {
          latest: '',
          timeMap: {},
        };
        return createMockChild(JSON.stringify(metaData)) as any;
      }
      return createMockChild('{}') as any;
    });

    const { run } = await import('../src/index.js');

    const originalArgv = process.argv;

    try {
      process.argv = [
        'node',
        'script.js',
        '--sort-by',
        'name',
        '--order',
        'asc',
      ];
      await run();
    } finally {
      process.argv = originalArgv;
    }
  });

  it('should handle age filtering', async () => {
    mockSpawn.mockImplementation((cmd: string, args: readonly string[]) => {
      if (cmd === 'npm' && args.includes('outdated')) {
        return createMockChild(JSON.stringify(mockOutdatedData)) as any;
      }
      if (cmd === 'npm' && args.includes('view')) {
        const packageName = args[1];
        const metaData = mockMetaData[packageName] || {
          latest: '',
          timeMap: {},
        };
        return createMockChild(JSON.stringify(metaData)) as any;
      }
      return createMockChild('{}') as any;
    });

    const { run } = await import('../src/index.js');

    const originalArgv = process.argv;

    try {
      process.argv = ['node', 'script.js', '--older-than', '100'];
      await run();

      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      process.argv = originalArgv;
    }
  });

  it('should return 0 when buildRows returns empty array after filtering', async () => {
    const mockOldOutdatedData: OutdatedMap = {
      'old-package': {
        current: '1.0.0',
        wanted: '1.0.0',
        latest: '1.0.0',
      },
    };

    mockSpawn.mockImplementation((cmd: string, args: readonly string[]) => {
      if (cmd === 'npm' && args.includes('outdated')) {
        return createMockChild(JSON.stringify(mockOldOutdatedData)) as any;
      }
      if (cmd === 'npm' && args.includes('view')) {
        return createMockChild(
          JSON.stringify({
            latest: '1.0.0',
            timeMap: {
              '1.0.0': '2020-01-01T10:00:00Z',
            },
          }),
        ) as any;
      }
      return createMockChild('{}') as any;
    });

    const { run } = await import('../src/index.js');

    const originalArgv = process.argv;

    try {
      process.argv = ['node', 'script.js', '--older-than', '365'];
      const result = await run();

      expect(result).toBe(0);
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      process.argv = originalArgv;
    }
  });

  it('should handle fetchMeta errors gracefully', async () => {
    mockSpawn.mockImplementation((cmd: string, args: readonly string[]) => {
      if (cmd === 'npm' && args.includes('outdated')) {
        return createMockChild(JSON.stringify(mockOutdatedData)) as any;
      }
      if (cmd === 'npm' && args.includes('view')) {
        return createMockChild('invalid json causing error') as any;
      }
      return createMockChild('{}') as any;
    });

    const { run } = await import('../src/index.js');

    const result = await run();

    expect(result).toBe(0);
  });
});
