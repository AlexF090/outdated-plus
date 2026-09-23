import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { MetadataResult, PackageMetadata } from './types.ts';

export interface RegistryConfiguration {
  /** Registry URL per scope (`@scope`), the empty string is the default registry. URLs end with a slash. */
  registries: ReadonlyMap<string, string>;
  /** `Authorization` header value per registry prefix without protocol, e.g. `//npm.company.com/`. */
  credentials: ReadonlyMap<string, string>;
}

export interface RegistryRequest {
  url: string;
  authorization: string | undefined;
}

export interface ConfigurationSources {
  directory: string;
  homeDirectory: string;
  environment: NodeJS.ProcessEnv;
}

export interface FetchOptions {
  configuration: RegistryConfiguration;
  fetch: typeof fetch;
  /** Cancels all pending requests. The returned promise rejects with the abort reason. */
  signal: AbortSignal;
  concurrency?: number;
  timeoutMilliseconds?: number;
}

const DEFAULT_REGISTRY = 'https://registry.npmjs.org/';
const DEFAULT_CONCURRENCY = 12;
const DEFAULT_TIMEOUT_MILLISECONDS = 30_000;

const SCOPE_REGISTRY_SUFFIX = ':registry';
const CREDENTIAL_KEYS = new Map([
  [':_authToken', 'Bearer'],
  [':_auth', 'Basic'],
]);

class RegistryError extends Error {
  override name = 'RegistryError';
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const withTrailingSlash = (url: string): string =>
  url.endsWith('/') ? url : `${url}/`;

/** Parses the ini-style `.npmrc` format and expands `${VARIABLE}` references. */
export const parseNpmrc = (
  content: string,
  environment: NodeJS.ProcessEnv,
): Map<string, string> => {
  const values = new Map<string, string>();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#') || line.startsWith(';')) {
      continue;
    }
    const separator = line.indexOf('=');
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(
        /\$\{([^}]+)\}/g,
        (_match, name: string) => environment[name] ?? '',
      );
    values.set(key, value);
  }
  return values;
};

const readNpmrc = async (
  file: string,
  environment: NodeJS.ProcessEnv,
): Promise<Map<string, string>> => {
  try {
    return parseNpmrc(await readFile(file, 'utf8'), environment);
  } catch (error) {
    if (isRecord(error) && error['code'] === 'ENOENT') {
      return new Map();
    }
    throw error;
  }
};

/**
 * Reads registry URLs and credentials with the same precedence as npm:
 * environment variable, then project `.npmrc`, then user `.npmrc`.
 */
export const loadRegistryConfiguration = async ({
  directory,
  homeDirectory,
  environment,
}: ConfigurationSources): Promise<RegistryConfiguration> => {
  const merged = new Map([
    ...(await readNpmrc(path.join(homeDirectory, '.npmrc'), environment)),
    ...(await readNpmrc(path.join(directory, '.npmrc'), environment)),
  ]);
  const environmentRegistry =
    environment['npm_config_registry'] ?? environment['NPM_CONFIG_REGISTRY'];
  if (environmentRegistry) {
    merged.set('registry', environmentRegistry);
  }

  const registries = new Map([
    ['', withTrailingSlash(merged.get('registry') || DEFAULT_REGISTRY)],
  ]);
  const credentials = new Map<string, string>();
  for (const [key, value] of merged) {
    if (key.startsWith('@') && key.endsWith(SCOPE_REGISTRY_SUFFIX)) {
      registries.set(
        key.slice(0, -SCOPE_REGISTRY_SUFFIX.length),
        withTrailingSlash(value),
      );
      continue;
    }
    if (!key.startsWith('//') || value === '') {
      continue;
    }
    for (const [suffix, scheme] of CREDENTIAL_KEYS) {
      if (key.endsWith(suffix)) {
        credentials.set(key.slice(0, -suffix.length), `${scheme} ${value}`);
      }
    }
  }
  return { registries, credentials };
};

export const resolveRequest = (
  configuration: RegistryConfiguration,
  packageName: string,
): RegistryRequest => {
  const scope = packageName.startsWith('@') ? packageName.split('/')[0] : '';
  const registry =
    configuration.registries.get(scope ?? '') ??
    configuration.registries.get('') ??
    DEFAULT_REGISTRY;
  const url = registry + packageName.replace('/', '%2f');
  const urlWithoutProtocol = url.slice(url.indexOf('//'));

  let authorization: string | undefined;
  let matchedLength = 0;
  for (const [prefix, value] of configuration.credentials) {
    if (
      urlWithoutProtocol.startsWith(prefix) &&
      prefix.length > matchedLength
    ) {
      authorization = value;
      matchedLength = prefix.length;
    }
  }
  return { url, authorization };
};

const toPackageMetadata = (data: unknown): PackageMetadata => {
  if (!isRecord(data)) {
    throw new RegistryError('unexpected response format');
  }
  const distributionTags = data['dist-tags'];
  const time = data['time'];
  if (
    !isRecord(distributionTags) ||
    typeof distributionTags['latest'] !== 'string' ||
    !isRecord(time)
  ) {
    throw new RegistryError('unexpected response format');
  }
  const releaseTimes: Record<string, string> = {};
  for (const [version, timestamp] of Object.entries(time)) {
    if (typeof timestamp === 'string') {
      releaseTimes[version] = timestamp;
    }
  }
  return { latestVersion: distributionTags['latest'], releaseTimes };
};

/** Fetches the full packument, since only it contains the release time of every version. */
const fetchPackageMetadata = async (
  packageName: string,
  options: FetchOptions,
): Promise<PackageMetadata> => {
  const { url, authorization } = resolveRequest(
    options.configuration,
    packageName,
  );
  const headers = new Headers({ accept: 'application/json' });
  if (authorization) {
    headers.set('authorization', authorization);
  }
  const response = await options.fetch(url, {
    headers,
    redirect: 'error',
    signal: AbortSignal.any([
      options.signal,
      AbortSignal.timeout(
        options.timeoutMilliseconds ?? DEFAULT_TIMEOUT_MILLISECONDS,
      ),
    ]),
  });
  if (response.status === 404) {
    throw new RegistryError('not found (HTTP 404)');
  }
  if (!response.ok) {
    throw new RegistryError(`registry responded with HTTP ${response.status}`);
  }
  return toPackageMetadata(await response.json());
};

const describeFailure = (error: unknown, options: FetchOptions): string => {
  if (error instanceof Error && error.name === 'TimeoutError') {
    return `timed out after ${options.timeoutMilliseconds ?? DEFAULT_TIMEOUT_MILLISECONDS} ms`;
  }
  return error instanceof Error ? error.message : String(error);
};

/**
 * Fetches metadata for all packages with a bounded number of parallel requests.
 * A failing package is reported in the result; cancellation via `signal` rejects.
 */
export const fetchAllMetadata = async (
  packageNames: readonly string[],
  options: FetchOptions,
): Promise<Map<string, MetadataResult>> => {
  const results = new Map<string, MetadataResult>();
  const queue = [...new Set(packageNames)];

  const worker = async (): Promise<void> => {
    for (
      let packageName = queue.shift();
      packageName !== undefined;
      packageName = queue.shift()
    ) {
      options.signal.throwIfAborted();
      try {
        const metadata = await fetchPackageMetadata(packageName, options);
        results.set(packageName, { status: 'found', metadata });
      } catch (error) {
        options.signal.throwIfAborted();
        results.set(packageName, {
          status: 'failed',
          reason: describeFailure(error, options),
        });
      }
    }
  };

  const workerCount = Math.min(
    options.concurrency ?? DEFAULT_CONCURRENCY,
    queue.length,
  );
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
};
