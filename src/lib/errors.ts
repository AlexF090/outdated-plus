/**
 * Custom error classes for outdated-plus
 */

export class OutdatedPlusError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'OutdatedPlusError';
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class NetworkError extends OutdatedPlusError {
  constructor(
    message: string,
    public readonly url?: string,
    public readonly statusCode?: number,
  ) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class RegistryError extends OutdatedPlusError {
  constructor(
    message: string,
    public readonly packageName: string,
  ) {
    super(message, 'REGISTRY_ERROR');
    this.name = 'RegistryError';
  }
}

export class ParseError extends OutdatedPlusError {
  constructor(
    message: string,
    public readonly source?: string,
  ) {
    super(message, 'PARSE_ERROR');
    this.name = 'ParseError';
  }
}

export class PackageJsonError extends OutdatedPlusError {
  constructor(message: string) {
    super(message, 'PACKAGE_JSON_ERROR');
    this.name = 'PackageJsonError';
  }
}

export function isOutdatedPlusError(
  error: unknown,
): error is OutdatedPlusError {
  return error instanceof OutdatedPlusError;
}

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
