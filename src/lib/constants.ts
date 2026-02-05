/**
 * Constants for outdated-plus CLI tool.
 * Centralizes magic numbers and configuration values.
 */

// Time constants
/**
 * Milliseconds in one day.
 */
export const MS_PER_DAY = 86_400_000;

// Age thresholds for colorization (in days)
export const AGE_THRESHOLD_RED = 365;
export const AGE_THRESHOLD_YELLOW = 90;

// HTTP configuration
export const NPM_REGISTRY = 'https://registry.npmjs.org';
export const HTTP_REQUEST_TIMEOUT_MS = 10_000;

// Regex patterns
export const NODE_MODULES_REGEX = /node_modules\/(.+)$/;

// Default concurrency
export const DEFAULT_CONCURRENCY = 12;
export const MAX_CONCURRENCY = 100;
export const MIN_CONCURRENCY = 1;
