import { stripVTControlCharacters, styleText } from 'node:util';
import { daysBetween, formatAge, formatDate } from './format.ts';
import type { VersionChange } from './semver.ts';
import type { DependencyType, ReleasedVersion, Row } from './types.ts';

type StyleFormat = Parameters<typeof styleText>[0];

type Paint = (format: StyleFormat, text: string) => string;

export interface TableOptions {
  now: Date;
  colors: boolean;
}

const AGE_WARNING_DAYS = 90;
const AGE_CRITICAL_DAYS = 365;
const PLACEHOLDER = '–';

const HEADERS = [
  'Package',
  'Current',
  'Released',
  'Age',
  'Latest',
  'Released',
  'Age',
] as const;

const TYPE_LABELS: Record<DependencyType, string> = {
  dependencies: '',
  devDependencies: 'dev',
  optionalDependencies: 'optional',
  peerDependencies: 'peer',
};

const CHANGE_COLORS: Record<
  Exclude<VersionChange, 'none'>,
  'greenBright' | 'yellowBright' | 'redBright'
> = {
  fix: 'greenBright',
  feature: 'yellowBright',
  breaking: 'redBright',
  unknown: 'redBright',
};

const createPaint =
  (colors: boolean): Paint =>
  (format, text) =>
    colors ? styleText(format, text, { validateStream: false }) : text;

const visibleLength = (text: string): number =>
  stripVTControlCharacters(text).length;

const packageCell = (row: Row, paint: Paint): string => {
  const label = TYPE_LABELS[row.type];
  return label ? `${row.name} ${paint('dim', `(${label})`)}` : row.name;
};

const latestCell = (row: Row, paint: Paint): string => {
  const { diff } = row;
  if (!diff) {
    return PLACEHOLDER;
  }
  if (diff.change === 'none') {
    return diff.unchanged;
  }
  return (
    diff.unchanged + paint(['bold', CHANGE_COLORS[diff.change]], diff.changed)
  );
};

const releaseCells = (
  version: ReleasedVersion | undefined,
  now: Date,
  paint: Paint,
): [string, string] => {
  if (!version?.released) {
    return [PLACEHOLDER, PLACEHOLDER];
  }
  const days = daysBetween(version.released, now);
  const age = formatAge(days);
  const coloredAge =
    days >= AGE_CRITICAL_DAYS
      ? paint('red', age)
      : days >= AGE_WARNING_DAYS
        ? paint('yellow', age)
        : age;
  return [formatDate(version.released), coloredAge];
};

const toCells = (row: Row, now: Date, paint: Paint): string[] => [
  packageCell(row, paint),
  row.current ? row.current.version : paint('red', 'missing'),
  ...releaseCells(row.current, now, paint),
  latestCell(row, paint),
  ...releaseCells(row.latest, now, paint),
];

export const renderTable = (
  rows: readonly Row[],
  { now, colors }: TableOptions,
): string => {
  const paint = createPaint(colors);
  const body = rows.map((row) => toCells(row, now, paint));
  const widths = HEADERS.map((header, column) =>
    Math.max(
      header.length,
      ...body.map((cells) => visibleLength(cells[column] ?? '')),
    ),
  );

  const border = (left: string, middle: string, right: string): string =>
    paint(
      'gray',
      left + widths.map((width) => '─'.repeat(width + 2)).join(middle) + right,
    );
  const line = (cells: readonly string[]): string => {
    const separator = paint('gray', '│');
    const content = widths
      .map((width, column) => {
        const cell = cells[column] ?? '';
        return ` ${cell}${' '.repeat(width - visibleLength(cell))} `;
      })
      .join(separator);
    return separator + content + separator;
  };

  return [
    border('┌', '┬', '┐'),
    line(HEADERS.map((header) => paint('blueBright', header))),
    border('├', '┼', '┤'),
    ...body.map(line),
    border('└', '┴', '┘'),
  ].join('\n');
};
