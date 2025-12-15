/**
 * Custom error classes for outdated-plus
 */

/**
 * Base error class for all outdated-plus errors.
 *
 * @public
 */
export class OutdatedPlusError extends Error {
  /** Error code for programmatic error handling. */
  public readonly code: string;

  /**
   * Creates a new OutdatedPlusError.
   *
   * @param message - Human-readable error message.
   * @param code - Error code for programmatic handling.
   */
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'OutdatedPlusError';
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Error thrown when a network request fails.
 *
 * @public
 */
export class NetworkError extends OutdatedPlusError {
  /** The URL that failed, if available. */
  public readonly url?: string;
  /** HTTP status code, if available. */
  public readonly statusCode?: number;

  /**
   * Creates a new NetworkError.
   *
   * @param message - Human-readable error message.
   * @param url - The URL that failed (optional).
   * @param statusCode - HTTP status code (optional).
   */
  constructor(message: string, url?: string, statusCode?: number) {
    super(message, 'NETWORK_ERROR');
    this.url = url;
    this.statusCode = statusCode;
    this.name = 'NetworkError';
  }
}

/**
 * Error thrown when npm registry operations fail.
 *
 * @public
 */
export class RegistryError extends OutdatedPlusError {
  /** The package name that caused the error. */
  public readonly packageName: string;

  /**
   * Creates a new RegistryError.
   *
   * @param message - Human-readable error message.
   * @param packageName - The package name that caused the error.
   */
  constructor(message: string, packageName: string) {
    super(message, 'REGISTRY_ERROR');
    this.packageName = packageName;
    this.name = 'RegistryError';
  }
}

/**
 * Error thrown when parsing operations fail.
 *
 * @public
 */
export class ParseError extends OutdatedPlusError {
  /** The source that failed to parse, if available. */
  public readonly source?: string;

  /**
   * Creates a new ParseError.
   *
   * @param message - Human-readable error message.
   * @param source - The source that failed to parse (optional).
   */
  constructor(message: string, source?: string) {
    super(message, 'PARSE_ERROR');
    this.source = source;
    this.name = 'ParseError';
  }
}

/**
 * Error thrown when package.json operations fail.
 *
 * @public
 */
export class PackageJsonError extends OutdatedPlusError {
  /**
   * Creates a new PackageJsonError.
   *
   * @param message - Human-readable error message.
   */
  constructor(message: string) {
    super(message, 'PACKAGE_JSON_ERROR');
    this.name = 'PackageJsonError';
  }
}

/**
 * Type guard to check if an error is an OutdatedPlusError.
 *
 * @param error - The error to check.
 * @returns True if the error is an instance of OutdatedPlusError.
 */
export function isOutdatedPlusError(
  error: unknown,
): error is OutdatedPlusError {
  return error instanceof OutdatedPlusError;
}

/**
 * Formats an error into a human-readable string.
 *
 * @param error - The error to format (can be any type).
 * @returns A formatted error message string.
 */
export function formatError(error: unknown): string {
  if (error instanceof NetworkError) {
    const status = error.statusCode ? ` (HTTP ${error.statusCode})` : '';
    return `Network error${status}: ${error.message}`;
  }
  if (error instanceof RegistryError) {
    return `Registry error for '${error.packageName}': ${error.message}`;
  }
  if (error instanceof ParseError) {
    return `Parse error: ${error.message}`;
  }
  if (error instanceof PackageJsonError) {
    return `Package.json error: ${error.message}`;
  }
  if (error instanceof OutdatedPlusError) {
    return `Error: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
