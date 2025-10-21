import { spawn } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process');

describe('CLI Integration Tests', () => {
  let mockSpawn: ReturnType<typeof vi.mocked<typeof spawn>>;

  beforeEach(() => {
    mockSpawn = vi.mocked(spawn);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-12-01T12:00:00Z'));
    Object.defineProperty(process.stderr, 'isTTY', {
      value: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should handle empty outdated results', async () => {
    const mockChild = {
      stdout: {
        on: vi.fn(),
      },
      on: vi.fn((event, callback) => {
        if (event === 'close') {
          callback(0);
        }
      }),
    };

    mockSpawn.mockReturnValue(mockChild as any);

    const { spawnJson } = await import('../src/index.js');
    const result = await spawnJson('npm', ['outdated', '--json']);

    expect(result).toEqual({});
  });

  it('should handle npm view command with valid data', async () => {
    const mockData = {
      'dist-tags': { latest: '1.0.0' },
      time: {
        '1.0.0': '2023-11-01T10:00:00Z',
        '0.9.0': '2023-10-01T10:00:00Z',
      },
    };

    const mockChild = {
      stdout: {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            callback(JSON.stringify(mockData));
          }
        }),
      },
      on: vi.fn((event, callback) => {
        if (event === 'close') {
          callback(0);
        }
      }),
    };

    mockSpawn.mockReturnValue(mockChild as any);

    const { spawnJson } = await import('../src/index.js');
    const result = await spawnJson('npm', [
      'view',
      'test-package',
      'time',
      'dist-tags.latest',
      '--json',
    ]);

    expect(result).toEqual(mockData);
  });

  it('should handle npm view command with alternative data structure', async () => {
    const mockData = {
      'dist-tags.latest': '1.0.0',
      time: {
        '1.0.0': '2023-11-01T10:00:00Z',
      },
    };

    const mockChild = {
      stdout: {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            callback(JSON.stringify(mockData));
          }
        }),
      },
      on: vi.fn((event, callback) => {
        if (event === 'close') {
          callback(0);
        }
      }),
    };

    mockSpawn.mockReturnValue(mockChild as any);

    const { spawnJson } = await import('../src/index.js');
    const result = await spawnJson('npm', [
      'view',
      'test-package',
      'time',
      'dist-tags.latest',
      '--json',
    ]);

    expect(result).toEqual(mockData);
  });

  it('should handle malformed JSON gracefully', async () => {
    const mockChild = {
      stdout: {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            callback('invalid json');
          }
        }),
      },
      on: vi.fn((event, callback) => {
        if (event === 'close') {
          callback(0);
        }
      }),
    };

    mockSpawn.mockReturnValue(mockChild as any);

    const { spawnJson } = await import('../src/index.js');
    const result = await spawnJson('npm', ['outdated', '--json']);

    expect(result).toEqual({});
  });

  it('should handle empty stdout', async () => {
    const mockChild = {
      stdout: {
        on: vi.fn(),
      },
      on: vi.fn((event, callback) => {
        if (event === 'close') {
          callback(0);
        }
      }),
    };

    mockSpawn.mockReturnValue(mockChild as any);

    const { spawnJson } = await import('../src/index.js');
    const result = await spawnJson('npm', ['outdated', '--json']);

    expect(result).toEqual({});
  });

  it('should handle multiple data chunks', async () => {
    const mockData = { test: 'value' };
    const jsonString = JSON.stringify(mockData);
    const chunk1 = jsonString.slice(0, 10);
    const chunk2 = jsonString.slice(10);

    const mockChild = {
      stdout: {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            callback(chunk1);
            callback(chunk2);
          }
        }),
      },
      on: vi.fn((event, callback) => {
        if (event === 'close') {
          callback(0);
        }
      }),
    };

    mockSpawn.mockReturnValue(mockChild as any);

    const { spawnJson } = await import('../src/index.js');
    const result = await spawnJson('npm', ['view', 'test', '--json']);

    expect(result).toEqual(mockData);
  });
});

describe('ProgressBar', () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true as any);
    Object.defineProperty(process.stderr, 'isTTY', {
      value: true,
      writable: true,
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('should create progress bar with correct total', async () => {
    const { ProgressBar } = await import('../src/index.js');
    const pb = new ProgressBar(10);
    expect(pb).toBeDefined();
  });

  it('should update progress correctly', async () => {
    const { ProgressBar } = await import('../src/index.js');
    const pb = new ProgressBar(10);

    pb.update(1);
    expect(consoleSpy).toHaveBeenCalled();

    const call = consoleSpy.mock.calls[0][0];
    expect(call).toContain('10%');
    expect(call).toContain('(1/10)');
  });

  it('should not show progress when not in TTY', async () => {
    Object.defineProperty(process.stderr, 'isTTY', {
      value: false,
      writable: true,
    });
    const { ProgressBar } = await import('../src/index.js');
    const pb = new ProgressBar(10);

    pb.update(1);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should handle total = 0 without division errors', async () => {
    const { ProgressBar } = await import('../src/index.js');
    const pb = new ProgressBar(0);

    pb.update(1);
    expect(consoleSpy).toHaveBeenCalled();

    const call = consoleSpy.mock.calls[0][0];
    expect(call).toContain('100%');
  });

  it('should handle step > 1 correctly', async () => {
    const { ProgressBar } = await import('../src/index.js');
    const pb = new ProgressBar(10);

    pb.update(3);
    expect(consoleSpy).toHaveBeenCalled();

    const call = consoleSpy.mock.calls[0][0];
    expect(call).toContain('30%');
    expect(call).toContain('(3/10)');
  });

  it('should finish and clear line', async () => {
    const mockClearLine = vi.fn();
    Object.defineProperty(process.stderr, 'clearLine', {
      value: mockClearLine,
      writable: true,
      configurable: true,
    });

    const { ProgressBar } = await import('../src/index.js');
    const pb = new ProgressBar(10);

    pb.update(5);
    pb.finish();

    expect(mockClearLine).toHaveBeenCalledWith(0);
    expect(consoleSpy).toHaveBeenCalledWith('\r');
  });

  it('should not clear when finish is called without TTY', async () => {
    const mockClearLine = vi.fn();
    Object.defineProperty(process.stderr, 'clearLine', {
      value: mockClearLine,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(process.stderr, 'isTTY', {
      value: false,
      writable: true,
    });

    const { ProgressBar } = await import('../src/index.js');
    const pb = new ProgressBar(10);

    pb.finish();
    expect(mockClearLine).not.toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
