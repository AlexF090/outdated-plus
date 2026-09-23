import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compareVersions, diffVersions, parseVersion } from '../src/semver.ts';

describe('parseVersion', () => {
  it('parses release versions', () => {
    assert.deepEqual(parseVersion('1.2.3'), {
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: [],
    });
  });

  it('parses prerelease identifiers and ignores build metadata', () => {
    assert.deepEqual(parseVersion('v2.0.0-beta.11+sha.abc'), {
      major: 2,
      minor: 0,
      patch: 0,
      prerelease: ['beta', 11],
    });
  });

  it('rejects invalid versions', () => {
    assert.equal(parseVersion('1.2'), undefined);
    assert.equal(parseVersion('latest'), undefined);
    assert.equal(parseVersion('1.2.3-'), undefined);
  });
});

describe('compareVersions', () => {
  it('orders versions according to SemVer precedence', () => {
    const ordered = [
      '1.0.0-alpha',
      '1.0.0-alpha.1',
      '1.0.0-alpha.beta',
      '1.0.0-beta',
      '1.0.0-beta.2',
      '1.0.0-beta.11',
      '1.0.0-rc.1',
      '1.0.0',
      '1.0.1',
      '1.1.0',
      '2.0.0',
    ];
    for (let index = 0; index < ordered.length - 1; index += 1) {
      const lower = ordered[index] ?? '';
      const higher = ordered[index + 1] ?? '';
      assert.ok(compareVersions(lower, higher) < 0, `${lower} < ${higher}`);
      assert.ok(compareVersions(higher, lower) > 0, `${higher} > ${lower}`);
    }
  });

  it('treats build metadata as equal', () => {
    assert.equal(compareVersions('1.0.0+a', '1.0.0+b'), 0);
  });
});

describe('diffVersions', () => {
  it('reports no change for equal versions', () => {
    assert.deepEqual(diffVersions('1.2.3', '1.2.3'), {
      change: 'none',
      unchanged: '1.2.3',
      changed: '',
    });
  });

  it('reports no change when the installed version is newer', () => {
    assert.equal(diffVersions('2.0.0-beta.1', '1.9.0').change, 'none');
  });

  it('classifies patch, minor and major updates', () => {
    assert.deepEqual(diffVersions('1.2.3', '1.2.4'), {
      change: 'fix',
      unchanged: '1.2.',
      changed: '4',
    });
    assert.deepEqual(diffVersions('1.2.3', '1.3.0'), {
      change: 'feature',
      unchanged: '1.',
      changed: '3.0',
    });
    assert.deepEqual(diffVersions('1.2.3', '2.0.0'), {
      change: 'breaking',
      unchanged: '',
      changed: '2.0.0',
    });
  });

  it('classifies updates of 0.x versions as unknown', () => {
    assert.deepEqual(diffVersions('0.3.1', '0.3.2'), {
      change: 'unknown',
      unchanged: '0.3.',
      changed: '2',
    });
  });

  it('classifies prerelease updates as unknown', () => {
    assert.deepEqual(diffVersions('1.0.0-beta.1', '1.0.0-beta.2'), {
      change: 'unknown',
      unchanged: '1.0.0-beta.',
      changed: '2',
    });
    assert.deepEqual(diffVersions('1.0.0-rc.1', '1.0.0'), {
      change: 'unknown',
      unchanged: '1.0.0',
      changed: '',
    });
  });

  it('classifies a missing or invalid installed version as unknown', () => {
    assert.deepEqual(diffVersions(undefined, '1.0.0'), {
      change: 'unknown',
      unchanged: '',
      changed: '1.0.0',
    });
    assert.equal(diffVersions('not-a-version', '1.0.0').change, 'unknown');
  });
});
