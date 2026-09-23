import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { stripVTControlCharacters } from 'node:util';
import { renderTable } from '../src/table.ts';
import type { Row } from '../src/types.ts';

const now = new Date('2026-09-23T12:00:00.000Z');

const rows: Row[] = [
  {
    name: 'typescript',
    type: 'devDependencies',
    current: {
      version: '6.0.3',
      released: new Date('2026-02-25T12:00:00.000Z'),
    },
    latest: {
      version: '7.0.2',
      released: new Date('2026-08-13T12:00:00.000Z'),
    },
    diff: { change: 'breaking', unchanged: '', changed: '7.0.2' },
  },
  {
    name: 'left-pad',
    type: 'dependencies',
    current: undefined,
    latest: {
      version: '1.3.0',
      released: new Date('2018-04-09T12:00:00.000Z'),
    },
    diff: { change: 'unknown', unchanged: '', changed: '1.3.0' },
  },
  {
    name: '@company/private',
    type: 'optionalDependencies',
    current: { version: '2.0.0', released: undefined },
    latest: undefined,
    diff: undefined,
  },
];

describe('renderTable', () => {
  it('renders a box table without colors', () => {
    assert.equal(
      renderTable(rows, { now, colors: false }),
      [
        '┌─────────────────────────────┬─────────┬────────────┬──────────┬────────┬────────────┬───────────┐',
        '│ Package                     │ Current │ Released   │ Age      │ Latest │ Released   │ Age       │',
        '├─────────────────────────────┼─────────┼────────────┼──────────┼────────┼────────────┼───────────┤',
        '│ typescript (dev)            │ 6.0.3   │ 2026-02-25 │ 210 days │ 7.0.2  │ 2026-08-13 │ 41 days   │',
        '│ left-pad                    │ missing │ –          │ –        │ 1.3.0  │ 2018-04-09 │ 3089 days │',
        '│ @company/private (optional) │ 2.0.0   │ –          │ –        │ –      │ –          │ –         │',
        '└─────────────────────────────┴─────────┴────────────┴──────────┴────────┴────────────┴───────────┘',
      ].join('\n'),
    );
  });

  it('keeps columns aligned when colors are enabled', () => {
    const colored = renderTable(rows, { now, colors: true });
    assert.notEqual(colored, stripVTControlCharacters(colored));
    assert.equal(
      stripVTControlCharacters(colored),
      renderTable(rows, { now, colors: false }),
    );
  });
});
