import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('ProgressBar', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  it('should be disabled in quiet mode', async () => {
    const { ProgressBar } = await import('../src/index.js');
    const pb = new ProgressBar(10, true); // quiet = true

    pb.update(1);
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
