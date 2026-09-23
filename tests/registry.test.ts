import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  fetchAllMetadata,
  loadRegistryConfiguration,
  parseNpmrc,
  resolveRequest,
  type RegistryConfiguration,
} from '../src/registry.ts';

const DEFAULT_CONFIGURATION: RegistryConfiguration = {
  registries: new Map([['', 'https://registry.npmjs.org/']]),
  credentials: new Map(),
};

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const packument = (latest: string, time: Record<string, string>) => ({
  name: 'package',
  'dist-tags': { latest },
  time: { created: '2020-01-01T00:00:00.000Z', ...time },
});

describe('parseNpmrc', () => {
  it('parses key value pairs and ignores comments', () => {
    const values = parseNpmrc(
      [
        '# comment',
        '; comment',
        'registry = https://example.com/npm/',
        '@scope:registry=https://scope.example.com',
        '',
        '//scope.example.com/:_authToken=${TOKEN}',
      ].join('\n'),
      { TOKEN: 'secret' },
    );
    assert.deepEqual(
      [...values],
      [
        ['registry', 'https://example.com/npm/'],
        ['@scope:registry', 'https://scope.example.com'],
        ['//scope.example.com/:_authToken', 'secret'],
      ],
    );
  });

  it('replaces unknown environment variables with an empty string', () => {
    assert.equal(parseNpmrc('key=${MISSING}', {}).get('key'), '');
  });
});

describe('loadRegistryConfiguration', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'outdated-plus-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('uses the public registry by default', async () => {
    const configuration = await loadRegistryConfiguration({
      directory: path.join(root, 'project'),
      homeDirectory: path.join(root, 'home'),
      environment: {},
    });
    assert.deepEqual(configuration, DEFAULT_CONFIGURATION);
  });

  it('lets the project configuration override the user configuration and the environment override both', async () => {
    const project = path.join(root, 'project');
    const home = path.join(root, 'home');
    await mkdir(project, { recursive: true });
    await mkdir(home, { recursive: true });
    await writeFile(
      path.join(home, '.npmrc'),
      'registry=https://user.example.com\n@scope:registry=https://user-scope.example.com\n//user-scope.example.com/:_authToken=user-token',
    );
    await writeFile(
      path.join(project, '.npmrc'),
      '@scope:registry=https://project-scope.example.com/',
    );

    const configuration = await loadRegistryConfiguration({
      directory: project,
      homeDirectory: home,
      environment: { npm_config_registry: 'https://environment.example.com' },
    });

    assert.deepEqual(
      configuration.registries,
      new Map([
        ['', 'https://environment.example.com/'],
        ['@scope', 'https://project-scope.example.com/'],
      ]),
    );
    assert.deepEqual(
      configuration.credentials,
      new Map([['//user-scope.example.com/', 'Bearer user-token']]),
    );
  });
});

describe('resolveRequest', () => {
  const configuration: RegistryConfiguration = {
    registries: new Map([
      ['', 'https://registry.npmjs.org/'],
      ['@company', 'https://npm.company.com/api/npm/'],
    ]),
    credentials: new Map([
      ['//npm.company.com/', 'Bearer host-token'],
      ['//npm.company.com/api/npm/', 'Bearer path-token'],
      ['//other.example.com/', 'Basic dXNlcjpwYXNz'],
    ]),
  };

  it('uses the default registry without credentials for unscoped packages', () => {
    assert.deepEqual(resolveRequest(configuration, 'react'), {
      url: 'https://registry.npmjs.org/react',
      authorization: undefined,
    });
  });

  it('uses the scope registry and the most specific credentials', () => {
    assert.deepEqual(resolveRequest(configuration, '@company/ui'), {
      url: 'https://npm.company.com/api/npm/@company%2fui',
      authorization: 'Bearer path-token',
    });
  });
});

describe('fetchAllMetadata', () => {
  it('returns latest version and release times per package', async () => {
    const requests: { url: string; init: RequestInit | undefined }[] = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      requests.push({ url: String(input), init });
      return jsonResponse(
        packument('2.0.0', {
          '1.0.0': '2024-01-01T00:00:00.000Z',
          '2.0.0': '2026-01-01T00:00:00.000Z',
        }),
      );
    };

    const results = await fetchAllMetadata(['package'], {
      configuration: DEFAULT_CONFIGURATION,
      fetch: fakeFetch,
      signal: new AbortController().signal,
    });

    assert.deepEqual(results.get('package'), {
      status: 'found',
      metadata: {
        latestVersion: '2.0.0',
        releaseTimes: {
          created: '2020-01-01T00:00:00.000Z',
          '1.0.0': '2024-01-01T00:00:00.000Z',
          '2.0.0': '2026-01-01T00:00:00.000Z',
        },
      },
    });
    assert.equal(requests[0]?.url, 'https://registry.npmjs.org/package');
    assert.equal(requests[0]?.init?.redirect, 'error');
  });

  it('reports failures per package without failing the others', async () => {
    const fakeFetch: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith('/missing')) {
        return jsonResponse({ error: 'Not found' }, 404);
      }
      if (url.endsWith('/broken')) {
        return jsonResponse({ name: 'broken' });
      }
      if (url.endsWith('/offline')) {
        throw new TypeError('fetch failed');
      }
      return jsonResponse(packument('1.0.0', {}));
    };

    const results = await fetchAllMetadata(
      ['missing', 'broken', 'offline', 'fine'],
      {
        configuration: DEFAULT_CONFIGURATION,
        fetch: fakeFetch,
        signal: new AbortController().signal,
      },
    );

    assert.deepEqual(results.get('missing'), {
      status: 'failed',
      reason: 'not found (HTTP 404)',
    });
    assert.deepEqual(results.get('broken'), {
      status: 'failed',
      reason: 'unexpected response format',
    });
    assert.deepEqual(results.get('offline'), {
      status: 'failed',
      reason: 'fetch failed',
    });
    assert.equal(results.get('fine')?.status, 'found');
  });

  it('sends credentials to the matching registry', async () => {
    let authorization: string | null = null;
    const fakeFetch: typeof fetch = async (_input, init) => {
      authorization = new Headers(init?.headers).get('authorization');
      return jsonResponse(packument('1.0.0', {}));
    };
    await fetchAllMetadata(['package'], {
      configuration: {
        registries: DEFAULT_CONFIGURATION.registries,
        credentials: new Map([['//registry.npmjs.org/', 'Bearer token']]),
      },
      fetch: fakeFetch,
      signal: new AbortController().signal,
    });
    assert.equal(authorization, 'Bearer token');
  });

  it('reports a timeout per package', async () => {
    const hangingFetch: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(init.signal?.reason),
        );
      });
    const results = await fetchAllMetadata(['slow'], {
      configuration: DEFAULT_CONFIGURATION,
      fetch: hangingFetch,
      signal: new AbortController().signal,
      timeoutMilliseconds: 10,
    });
    assert.deepEqual(results.get('slow'), {
      status: 'failed',
      reason: 'timed out after 10 ms',
    });
  });

  it('stops when the operation is cancelled', async () => {
    const controller = new AbortController();
    const hangingFetch: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(init.signal?.reason),
        );
      });
    const pending = fetchAllMetadata(['a', 'b'], {
      configuration: DEFAULT_CONFIGURATION,
      fetch: hangingFetch,
      signal: controller.signal,
    });
    controller.abort();
    await assert.rejects(pending, { name: 'AbortError' });
  });

  it('limits the number of parallel requests', async () => {
    let active = 0;
    let maximum = 0;
    const fakeFetch: typeof fetch = async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return jsonResponse(packument('1.0.0', {}));
    };
    await fetchAllMetadata(
      Array.from({ length: 10 }, (_, index) => `package-${index}`),
      {
        configuration: DEFAULT_CONFIGURATION,
        fetch: fakeFetch,
        signal: new AbortController().signal,
        concurrency: 3,
      },
    );
    assert.equal(maximum, 3);
  });
});
