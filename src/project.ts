import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Dependency, DependencyType } from './types.ts';

export class ProjectError extends Error {
  override name = 'ProjectError';
}

/** Sections in priority order: a package listed in several sections is reported with the first one. */
const DEPENDENCY_TYPES: readonly DependencyType[] = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];

const ALIAS_PREFIX = 'npm:';
const REGISTRY_PROTOCOLS = new Set([ALIAS_PREFIX, 'catalog:']);
const PROTOCOL_PATTERN = /^[a-z+]+:/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const exists = async (file: string): Promise<boolean> => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};

const readJson = async (file: string): Promise<unknown> => {
  const content = await readFile(file, 'utf8');
  try {
    return JSON.parse(content);
  } catch {
    throw new ProjectError(`${file} is not valid JSON.`);
  }
};

const ancestors = (directory: string): string[] => {
  const directories = [directory];
  let current = directory;
  while (path.dirname(current) !== current) {
    current = path.dirname(current);
    directories.push(current);
  }
  return directories;
};

/**
 * Returns the registry package name for a dependency specifier,
 * or `undefined` when the dependency is not installed from a registry
 * (local paths, workspaces, git repositories, tarball URLs).
 */
const toRegistryName = (
  name: string,
  specifier: string,
): string | undefined => {
  const protocol = PROTOCOL_PATTERN.exec(specifier)?.[0];
  if (protocol === ALIAS_PREFIX) {
    const target = specifier.slice(ALIAS_PREFIX.length);
    const versionSeparator = target.indexOf('@', 1);
    return versionSeparator === -1 ? target : target.slice(0, versionSeparator);
  }
  if (protocol !== undefined && !REGISTRY_PROTOCOLS.has(protocol)) {
    return undefined;
  }
  if (specifier.includes('/')) {
    return undefined;
  }
  return name;
};

/**
 * Resolves the installed version the same way Node.js resolves packages:
 * the nearest `node_modules` folder in the directory or one of its ancestors wins.
 * Symlinked packages (pnpm, bun isolated installs) are followed by `readFile`.
 */
const findInstalledVersion = async (
  directory: string,
  name: string,
): Promise<string | undefined> => {
  for (const candidate of ancestors(directory)) {
    const manifestPath = path.join(
      candidate,
      'node_modules',
      name,
      'package.json',
    );
    if (!(await exists(manifestPath))) {
      continue;
    }
    const manifest = await readJson(manifestPath);
    if (isRecord(manifest) && typeof manifest['version'] === 'string') {
      return manifest['version'];
    }
  }
  return undefined;
};

const assertNotPlugAndPlay = async (directory: string): Promise<void> => {
  for (const candidate of ancestors(directory)) {
    if (await exists(path.join(candidate, '.pnp.cjs'))) {
      throw new ProjectError(
        `Yarn Plug'n'Play is not supported (found ${path.join(candidate, '.pnp.cjs')}). ` +
          'Set "nodeLinker: node-modules" in .yarnrc.yml and run "yarn install".',
      );
    }
  }
};

export const readDependencies = async (
  directory: string,
): Promise<Dependency[]> => {
  const manifestPath = path.join(directory, 'package.json');
  if (!(await exists(manifestPath))) {
    throw new ProjectError(`No package.json found in ${directory}.`);
  }
  const manifest = await readJson(manifestPath);
  if (!isRecord(manifest)) {
    throw new ProjectError(`${manifestPath} does not contain a JSON object.`);
  }
  await assertNotPlugAndPlay(directory);

  const seen = new Set<string>();
  const entries: Omit<Dependency, 'installedVersion'>[] = [];
  for (const type of DEPENDENCY_TYPES) {
    const section = manifest[type];
    if (!isRecord(section)) {
      continue;
    }
    for (const [name, specifier] of Object.entries(section)) {
      if (seen.has(name) || typeof specifier !== 'string') {
        continue;
      }
      seen.add(name);
      const registryName = toRegistryName(name, specifier);
      if (registryName !== undefined) {
        entries.push({ name, registryName, type });
      }
    }
  }

  return Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      installedVersion: await findInstalledVersion(directory, entry.name),
    })),
  );
};
