/**
 * Custom error classes for outdated-plus
 */

export class OutdatedPlusError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'OutdatedPlusError';
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class NetworkError extends OutdatedPlusError {
  public readonly url?: string;
  public readonly statusCode?: number;

  constructor(message: string, url?: string, statusCode?: number) {
    super(message, 'NETWORK_ERROR');
    this.url = url;
    this.statusCode = statusCode;
    this.name = 'NetworkError';
  }
}

export class RegistryError extends OutdatedPlusError {
  public readonly packageName: string;

  constructor(message: string, packageName: string) {
    super(message, 'REGISTRY_ERROR');
    this.packageName = packageName;
    this.name = 'RegistryError';
  }
}

export class ParseError extends OutdatedPlusError {
  public readonly source?: string;

  constructor(message: string, source?: string) {
    super(message, 'PARSE_ERROR');
    this.source = source;
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
