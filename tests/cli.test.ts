import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { run, type RunOptions } from '../src/cli.ts';

let root: string;

const createOutput = () => {
  const chunks: string[] = [];
  return {
    stream: { write: (text: string) => chunks.push(text) },
    text: () => chunks.join(''),
  };
};

const writeJson = async (file: string, content: unknown): Promise<void> => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(content));
};

const registry: Record<string, unknown> = {
  typescript: {
    'dist-tags': { latest: '7.0.2' },
    time: {
      '6.0.3': '2026-02-25T12:00:00.000Z',
      '7.0.2': '2026-08-13T12:00:00.000Z',
    },
  },
  prettier: {
    'dist-tags': { latest: '3.9.8' },
    time: { '3.9.8': '2026-07-05T12:00:00.000Z' },
  },
};

const fakeFetch: typeof fetch = async (input) => {
  const name = decodeURIComponent(String(input).split('/').pop() ?? '');
  const body = registry[name];
  return body
    ? new Response(JSON.stringify(body))
    : new Response('{}', { status: 404 });
};

const runWith = async (
  overrides: Partial<RunOptions> = {},
): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
  const stdout = createOutput();
  const stderr = createOutput();
  const exitCode = await run({
    arguments: [],
    version: '2.0.0',
    directory: root,
    homeDirectory: path.join(root, 'home'),
    environment: {},
    fetch: fakeFetch,
    signal: new AbortController().signal,
    now: new Date('2026-09-23T12:00:00.000Z'),
    stdout: stdout.stream,
    stderr: stderr.stream,
    colors: false,
    ...overrides,
  });
  return { exitCode, stdout: stdout.text(), stderr: stderr.text() };
};

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'outdated-plus-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('run', () => {
  it('prints a table with all dependencies', async () => {
    await writeJson(path.join(root, 'package.json'), {
      devDependencies: { prettier: '3.9.8', typescript: '6.0.3' },
    });
    await writeJson(
      path.join(root, 'node_modules', 'typescript', 'package.json'),
      { version: '6.0.3' },
    );
    await writeJson(
      path.join(root, 'node_modules', 'prettier', 'package.json'),
      { version: '3.9.8' },
    );

    const result = await runWith();

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, '');
    assert.equal(
      result.stdout,
      [
        '┌──────────────────┬─────────┬────────────┬──────────┬────────┬────────────┬─────────┐',
        '│ Package          │ Current │ Released   │ Age      │ Latest │ Released   │ Age     │',
        '├──────────────────┼─────────┼────────────┼──────────┼────────┼────────────┼─────────┤',
        '│ typescript (dev) │ 6.0.3   │ 2026-02-25 │ 210 days │ 7.0.2  │ 2026-08-13 │ 41 days │',
        '│ prettier (dev)   │ 3.9.8   │ 2026-07-05 │ 80 days  │ 3.9.8  │ 2026-07-05 │ 80 days │',
        '└──────────────────┴─────────┴────────────┴──────────┴────────┴────────────┴─────────┘',
        '',
      ].join('\n'),
    );
  });

  it('warns about packages that could not be loaded', async () => {
    await writeJson(path.join(root, 'package.json'), {
      dependencies: { typescript: '7.0.2', '@company/private': '1.0.0' },
    });
    const result = await runWith();
    assert.equal(result.exitCode, 0);
    assert.equal(
      result.stderr,
      'Could not load @company/private from the registry: not found (HTTP 404)\n',
    );
  });

  it('fails when no package could be loaded', async () => {
    await writeJson(path.join(root, 'package.json'), {
      dependencies: { '@company/private': '1.0.0' },
    });
    const result = await runWith();
    assert.equal(result.exitCode, 1);
  });

  it('reports a project without dependencies', async () => {
    await writeJson(path.join(root, 'package.json'), { name: 'empty' });
    const result = await runWith();
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, 'No dependencies found in package.json.\n');
  });

  it('fails with a message when package.json is missing', async () => {
    const result = await runWith();
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /No package\.json found/);
  });

  it('prints help and version', async () => {
    assert.match((await runWith({ arguments: ['--help'] })).stdout, /^Usage:/);
    assert.equal((await runWith({ arguments: ['-v'] })).stdout, '2.0.0\n');
  });

  it('rejects unknown options', async () => {
    const result = await runWith({ arguments: ['--check-all'] });
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /Unknown option '--check-all'/);
  });
});
