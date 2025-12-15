/**
 * Native ANSI colors utility (no external dependencies)
 */

// ANSI escape codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

// Foreground colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';

/**
 * Check if colors should be used
 * Respects NO_COLOR env variable and TTY detection
 */
function supportsColor(): boolean {
  if (process.env.NO_COLOR) {
    return false;
  }
  if (process.env.FORCE_COLOR) {
    return true;
  }
  return process.stdout.isTTY === true;
}

const colorsEnabled = supportsColor();

function wrap(code: string, text: string): string {
  if (!colorsEnabled) {
    return text;
  }
  return `${code}${text}${RESET}`;
}

export const colors = {
  red: (text: string) => wrap(RED, text),
  green: (text: string) => wrap(GREEN, text),
  yellow: (text: string) => wrap(YELLOW, text),
  cyan: (text: string) => wrap(CYAN, text),
  gray: (text: string) => wrap(GRAY, text),
  bold: (text: string) => wrap(BOLD, text),

  // Combined styles
  boldRed: (text: string) => wrap(`${BOLD}${RED}`, text),
  boldGreen: (text: string) => wrap(`${BOLD}${GREEN}`, text),
  boldYellow: (text: string) => wrap(`${BOLD}${YELLOW}`, text),
};

/**
 * Colors a bump type indicator for terminal display.
 * Color mapping: major=red, minor=yellow, patch=green, prerelease=cyan, same=gray.
 */
export function colorBumpType(
  bump: 'major' | 'minor' | 'patch' | 'prerelease' | 'same' | 'unknown',
): string {
  switch (bump) {
    case 'major':
      return colors.red(bump);
    case 'minor':
      return colors.yellow(bump);
    case 'patch':
      return colors.green(bump);
    case 'prerelease':
      return colors.cyan(bump);
    case 'same':
      return colors.gray(bump);
    default:
      return bump;
  }
}

/**
 * Colors an age value based on how old it is.
 * Color thresholds: >365 days (red), >90 days (yellow), <=90 days (green).
 */
export function colorAge(age: number | null): string {
  if (age === null) {
    return '-';
  }
  const str = String(age);
  if (age > 365) {
    return colors.red(str);
  }
  if (age > 90) {
    return colors.yellow(str);
  }
  return colors.green(str);
}

/**
 * Checks if colors are currently enabled.
 * Respects NO_COLOR, FORCE_COLOR environment variables and TTY detection.
 */
export function isColorEnabled(): boolean {
  return colorsEnabled;
}
