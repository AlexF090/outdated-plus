import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawn } from 'node:child_process';
import { NODE_MODULES_REGEX } from '../src/lib/constants.js';
import { getInstalledVersions, readPackageJson } from '../src/index.js';

vi.mock('node:child_process', () => ({ spawn: vi.fn() }));

describe('NODE_MODULES_REGEX', () => {
  it('should match simple package path', () => {
    const match = 'node_modules/react'.match(NODE_MODULES_REGEX);
    expect(match?.[1]).toBe('react');
  });

  it('should match scoped package path', () => {
    const match = 'node_modules/@types/react'.match(NODE_MODULES_REGEX);
    expect(match?.[1]).toBe('@types/react');
  });

  it('should match the last segment for nested node_modules', () => {
    const match = 'node_modules/foo/node_modules/bar'.match(NODE_MODULES_REGEX);
    expect(match?.[1]).toBe('bar');
  });

  it('should match deeply nested scoped package', () => {
    const match = 'node_modules/@scope/a/node_modules/@scope/b'.match(
      NODE_MODULES_REGEX,
    );
    expect(match?.[1]).toBe('@scope/b');
  });

  it('should match triple-nested dependencies', () => {
    const match = 'node_modules/a/node_modules/b/node_modules/c'.match(
      NODE_MODULES_REGEX,
    );
    expect(match?.[1]).toBe('c');
  });

  it('should not match empty string', () => {
    const match = ''.match(NODE_MODULES_REGEX);
    expect(match).toBeNull();
  });

  it('should not match paths without node_modules', () => {
    const match = 'src/components/react'.match(NODE_MODULES_REGEX);
    expect(match).toBeNull();
  });
});

describe('readPackageJson', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), `outdated-plus-test-`));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should read dependencies and devDependencies', () => {
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: { react: '^18.0.0', vue: '^3.0.0' },
        devDependencies: { vitest: '^1.0.0' },
      }),
    );
    const result = readPackageJson(testDir);
    expect(result.dependencies).toEqual({ react: '^18.0.0', vue: '^3.0.0' });
    expect(result.devDependencies).toEqual({ vitest: '^1.0.0' });
  });

  it('should return empty objects when package.json is missing', () => {
    const result = readPackageJson(join(testDir, 'nonexistent'));
    expect(result).toEqual({ dependencies: {}, devDependencies: {} });
  });

  it('should return empty objects for invalid JSON', () => {
    writeFileSync(join(testDir, 'package.json'), 'not json');
    const result = readPackageJson(testDir);
    expect(result).toEqual({ dependencies: {}, devDependencies: {} });
  });

  it('should handle missing dependencies key', () => {
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({ name: 'test' }),
    );
    const result = readPackageJson(testDir);
    expect(result).toEqual({ dependencies: {}, devDependencies: {} });
  });

  it('should filter out non-string values from dependencies', () => {
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: { react: '^18.0.0', invalid: 123, nested: { a: 1 } },
      }),
    );
    const result = readPackageJson(testDir);
    expect(result.dependencies).toEqual({ react: '^18.0.0' });
  });
});

describe('getInstalledVersions', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), `outdated-plus-test-`));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should extract versions from lockfile v3 packages', () => {
    writeFileSync(
      join(testDir, 'package-lock.json'),
      JSON.stringify({
        lockfileVersion: 3,
        packages: {
          '': { name: 'test' },
          'node_modules/react': { version: '18.2.0' },
          'node_modules/vue': { version: '3.3.4' },
        },
      }),
    );
    const versions = getInstalledVersions(testDir);
    expect(versions).toEqual({ react: '18.2.0', vue: '3.3.4' });
  });

  it('should resolve nested node_modules to the last segment', () => {
    writeFileSync(
      join(testDir, 'package-lock.json'),
      JSON.stringify({
        lockfileVersion: 3,
        packages: {
          '': { name: 'test' },
          'node_modules/react': { version: '18.2.0' },
          'node_modules/react/node_modules/loose-envify': {
            version: '1.4.0',
          },
        },
      }),
    );
    const versions = getInstalledVersions(testDir);
    expect(versions['react']).toBe('18.2.0');
    expect(versions['loose-envify']).toBe('1.4.0');
  });

  it('should handle scoped packages in nested node_modules', () => {
    writeFileSync(
      join(testDir, 'package-lock.json'),
      JSON.stringify({
        lockfileVersion: 3,
        packages: {
          '': { name: 'test' },
          'node_modules/@types/react': { version: '18.2.0' },
          'node_modules/foo/node_modules/@scope/bar': { version: '1.0.0' },
        },
      }),
    );
    const versions = getInstalledVersions(testDir);
    expect(versions['@types/react']).toBe('18.2.0');
    expect(versions['@scope/bar']).toBe('1.0.0');
  });

  it('should fallback to dependencies field for lockfile v1', () => {
    writeFileSync(
      join(testDir, 'package-lock.json'),
      JSON.stringify({
        lockfileVersion: 1,
        dependencies: {
          react: { version: '17.0.2' },
          vue: { version: '2.7.0' },
        },
      }),
    );
    const versions = getInstalledVersions(testDir);
    expect(versions).toEqual({ react: '17.0.2', vue: '2.7.0' });
  });

  it('should return empty object when lockfile is missing', () => {
    const versions = getInstalledVersions(join(testDir, 'nonexistent'));
    expect(versions).toEqual({});
  });

  it('should return empty object for invalid JSON', () => {
    writeFileSync(join(testDir, 'package-lock.json'), 'not json');
    const versions = getInstalledVersions(testDir);
    expect(versions).toEqual({});
  });

  it('should prefer last nested version when same package appears at multiple levels', () => {
    writeFileSync(
      join(testDir, 'package-lock.json'),
      JSON.stringify({
        lockfileVersion: 3,
        packages: {
          '': { name: 'test' },
          'node_modules/semver': { version: '7.5.0' },
          'node_modules/npm/node_modules/semver': { version: '7.3.0' },
        },
      }),
    );
    const versions = getInstalledVersions(testDir);
    expect(versions['semver']).toBe('7.3.0');
  });
});

describe('ProgressBar', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
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

describe('run', () => {
  it('should return exit code 1 and print error when npm spawn fails (e.g. ENOENT)', async () => {
    vi.resetModules();
    vi.mocked(spawn).mockReturnValue({
      stdout: { on: vi.fn() },
      on: vi.fn((event: string, handler: (err: Error) => void) => {
        if (event === 'error') {
          setImmediate(() =>
            handler(
              Object.assign(new Error('spawn npm ENOENT'), { code: 'ENOENT' }),
            ),
          );
        }
      }),
    } as ReturnType<typeof spawn>);

    const argv = process.argv;
    process.argv = ['node', 'outdated-plus'];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { run } = await import('../src/index.js');
    const code = await run();

    expect(code).toBe(1);
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringMatching(/ENOENT|spawn npm/),
    );

    process.argv = argv;
    errSpy.mockRestore();
    vi.mocked(spawn).mockReset();
  });
});
