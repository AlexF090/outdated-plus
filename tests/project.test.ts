import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { ProjectError, readDependencies } from '../src/project.ts';

let root: string;

const writeJson = async (file: string, content: unknown): Promise<void> => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(content));
};

const installPackage = async (
  directory: string,
  name: string,
  version: string,
): Promise<void> => {
  await writeJson(path.join(directory, 'node_modules', name, 'package.json'), {
    name,
    version,
  });
};

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'outdated-plus-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('readDependencies', () => {
  it('reads all dependency types with their installed versions', async () => {
    await writeJson(path.join(root, 'package.json'), {
      dependencies: { react: '^18.0.0' },
      devDependencies: { typescript: '6.0.3' },
      optionalDependencies: { fsevents: '^2.0.0' },
      peerDependencies: { 'react-dom': '>=18' },
    });
    await installPackage(root, 'react', '18.3.1');
    await installPackage(root, 'typescript', '6.0.3');

    assert.deepEqual(await readDependencies(root), [
      {
        name: 'react',
        registryName: 'react',
        type: 'dependencies',
        installedVersion: '18.3.1',
      },
      {
        name: 'typescript',
        registryName: 'typescript',
        type: 'devDependencies',
        installedVersion: '6.0.3',
      },
      {
        name: 'fsevents',
        registryName: 'fsevents',
        type: 'optionalDependencies',
        installedVersion: undefined,
      },
      {
        name: 'react-dom',
        registryName: 'react-dom',
        type: 'peerDependencies',
        installedVersion: undefined,
      },
    ]);
  });

  it('lists a package only once when it appears in several sections', async () => {
    await writeJson(path.join(root, 'package.json'), {
      devDependencies: { react: '18.3.1' },
      peerDependencies: { react: '>=18' },
    });
    const dependencies = await readDependencies(root);
    assert.deepEqual(
      dependencies.map(({ name, type }) => ({ name, type })),
      [{ name: 'react', type: 'devDependencies' }],
    );
  });

  it('resolves npm aliases to their registry name', async () => {
    await writeJson(path.join(root, 'package.json'), {
      dependencies: {
        'string-width-cjs': 'npm:string-width@^4.2.0',
        '@alias/scoped': 'npm:@scope/real@1.0.0',
      },
    });
    const dependencies = await readDependencies(root);
    assert.deepEqual(
      dependencies.map(({ name, registryName }) => ({ name, registryName })),
      [
        { name: 'string-width-cjs', registryName: 'string-width' },
        { name: '@alias/scoped', registryName: '@scope/real' },
      ],
    );
  });

  it('skips dependencies that are not published to a registry', async () => {
    await writeJson(path.join(root, 'package.json'), {
      dependencies: {
        local: 'file:../local',
        linked: 'link:../linked',
        sibling: 'workspace:*',
        git: 'git+https://github.com/user/repository.git',
        github: 'user/repository',
        tarball: 'https://example.com/package.tgz',
        catalog: 'catalog:',
        tagged: 'latest',
      },
    });
    const dependencies = await readDependencies(root);
    assert.deepEqual(
      dependencies.map(({ name }) => name),
      ['catalog', 'tagged'],
    );
  });

  it('finds packages hoisted to a parent node_modules folder', async () => {
    const workspace = path.join(root, 'packages', 'app');
    await writeJson(path.join(workspace, 'package.json'), {
      dependencies: { react: '^18.0.0' },
    });
    await installPackage(root, 'react', '18.3.1');
    const [react] = await readDependencies(workspace);
    assert.equal(react?.installedVersion, '18.3.1');
  });

  it('prefers the nearest installation', async () => {
    const workspace = path.join(root, 'packages', 'app');
    await writeJson(path.join(workspace, 'package.json'), {
      dependencies: { react: '^19.0.0' },
    });
    await installPackage(root, 'react', '18.3.1');
    await installPackage(workspace, 'react', '19.1.0');
    const [react] = await readDependencies(workspace);
    assert.equal(react?.installedVersion, '19.1.0');
  });

  it('follows symlinked packages as created by pnpm', async () => {
    await writeJson(path.join(root, 'package.json'), {
      dependencies: { '@scope/package': '^1.0.0' },
    });
    const store = path.join(
      root,
      'node_modules',
      '.pnpm',
      '@scope+package@1.2.3',
      'node_modules',
    );
    await installPackage(path.dirname(store), '@scope/package', '1.2.3');
    await mkdir(path.join(root, 'node_modules', '@scope'), { recursive: true });
    await symlink(
      path.join(store, '@scope', 'package'),
      path.join(root, 'node_modules', '@scope', 'package'),
      'dir',
    );
    const [dependency] = await readDependencies(root);
    assert.equal(dependency?.installedVersion, '1.2.3');
  });

  it('fails when package.json is missing', async () => {
    await assert.rejects(readDependencies(root), (error: unknown) => {
      assert.ok(error instanceof ProjectError);
      assert.match(error.message, /No package\.json found/);
      return true;
    });
  });

  it('fails when package.json is invalid JSON', async () => {
    await writeFile(path.join(root, 'package.json'), '{ invalid');
    await assert.rejects(readDependencies(root), /is not valid JSON/);
  });

  it("fails for Yarn Plug'n'Play projects", async () => {
    await writeJson(path.join(root, 'package.json'), {
      dependencies: { react: '^18.0.0' },
    });
    await writeFile(path.join(root, '.pnp.cjs'), '');
    await assert.rejects(readDependencies(root), /Plug'n'Play/);
  });
});
