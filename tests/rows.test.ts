import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildRows, sortRows } from '../src/rows.ts';
import type { VersionChange } from '../src/semver.ts';
import type { Dependency, MetadataResult, Row } from '../src/types.ts';

const dependency = (
  name: string,
  installedVersion: string | undefined,
  type: Dependency['type'] = 'dependencies',
): Dependency => ({ name, registryName: name, type, installedVersion });

const found = (
  latestVersion: string,
  releaseTimes: Record<string, string>,
): MetadataResult => ({
  status: 'found',
  metadata: { latestVersion, releaseTimes },
});

describe('buildRows', () => {
  it('combines installed version, latest version and release dates', () => {
    const rows = buildRows(
      [dependency('typescript', '6.0.3', 'devDependencies')],
      new Map([
        [
          'typescript',
          found('7.0.2', {
            '6.0.3': '2026-02-25T10:00:00.000Z',
            '7.0.2': '2026-08-13T10:00:00.000Z',
          }),
        ],
      ]),
    );
    assert.deepEqual(rows, [
      {
        name: 'typescript',
        type: 'devDependencies',
        current: {
          version: '6.0.3',
          released: new Date('2026-02-25T10:00:00.000Z'),
        },
        latest: {
          version: '7.0.2',
          released: new Date('2026-08-13T10:00:00.000Z'),
        },
        diff: { change: 'breaking', unchanged: '', changed: '7.0.2' },
      },
    ]);
  });

  it('looks up metadata by registry name for aliases', () => {
    const [row] = buildRows(
      [
        {
          name: 'alias',
          registryName: 'real',
          type: 'dependencies',
          installedVersion: '1.0.0',
        },
      ],
      new Map([['real', found('1.0.0', {})]]),
    );
    assert.equal(row?.latest?.version, '1.0.0');
    assert.equal(row?.current?.released, undefined);
    assert.equal(row?.diff?.change, 'none');
  });

  it('marks missing installations and failed lookups', () => {
    const [missing, failed] = buildRows(
      [dependency('missing', undefined), dependency('private', '1.0.0')],
      new Map([
        ['missing', found('1.0.0', {})],
        ['private', { status: 'failed', reason: 'HTTP 404' }],
      ]),
    );
    assert.equal(missing?.current, undefined);
    assert.equal(missing?.diff?.change, 'unknown');
    assert.equal(failed?.latest, undefined);
    assert.equal(failed?.diff, undefined);
  });

  it('ignores invalid release timestamps', () => {
    const [row] = buildRows(
      [dependency('broken', '1.0.0')],
      new Map([['broken', found('1.0.0', { '1.0.0': 'not a date' })]]),
    );
    assert.equal(row?.current?.released, undefined);
  });
});

describe('sortRows', () => {
  const row = (name: string, change: VersionChange | undefined): Row => ({
    name,
    type: 'dependencies',
    current: { version: '1.0.0', released: undefined },
    latest: change ? { version: '1.0.0', released: undefined } : undefined,
    diff: change ? { change, unchanged: '', changed: '' } : undefined,
  });

  it('sorts by severity of the update, then by name', () => {
    const sorted = sortRows([
      row('b-none', 'none'),
      row('failed', undefined),
      row('fix', 'fix'),
      row('a-none', 'none'),
      row('feature', 'feature'),
      row('unknown', 'unknown'),
      row('breaking', 'breaking'),
    ]);
    assert.deepEqual(
      sorted.map(({ name }) => name),
      ['breaking', 'unknown', 'feature', 'fix', 'a-none', 'b-none', 'failed'],
    );
  });
});
