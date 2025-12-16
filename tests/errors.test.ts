import { describe, expect, it } from 'vitest';
import {
  NetworkError,
  OutdatedPlusError,
  PackageJsonError,
  ParseError,
  RegistryError,
  formatError,
  isOutdatedPlusError,
} from '../src/lib/errors.js';

describe('Error Classes', () => {
  describe('OutdatedPlusError', () => {
    it('should create error with message and code', () => {
      const error = new OutdatedPlusError('Test error', 'TEST_CODE');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('OutdatedPlusError');
    });

    it('should be instanceof Error', () => {
      const error = new OutdatedPlusError('Test', 'CODE');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('NetworkError', () => {
    it('should create error with url and status code', () => {
      const error = new NetworkError(
        'Connection failed',
        'http://example.com',
        500,
      );
      expect(error.message).toBe('Connection failed');
      expect(error.url).toBe('http://example.com');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.name).toBe('NetworkError');
    });

    it('should work without optional parameters', () => {
      const error = new NetworkError('Connection failed');
      expect(error.url).toBeUndefined();
      expect(error.statusCode).toBeUndefined();
    });
  });

  describe('RegistryError', () => {
    it('should create error with package name', () => {
      const error = new RegistryError('Package not found', 'my-package');
      expect(error.message).toBe('Package not found');
      expect(error.packageName).toBe('my-package');
      expect(error.code).toBe('REGISTRY_ERROR');
      expect(error.name).toBe('RegistryError');
    });
  });

  describe('ParseError', () => {
    it('should create error with source', () => {
      const error = new ParseError('Invalid JSON', 'package.json');
      expect(error.message).toBe('Invalid JSON');
      expect(error.source).toBe('package.json');
      expect(error.code).toBe('PARSE_ERROR');
      expect(error.name).toBe('ParseError');
    });
  });

  describe('PackageJsonError', () => {
    it('should create error', () => {
      const error = new PackageJsonError('File not found');
      expect(error.message).toBe('File not found');
      expect(error.code).toBe('PACKAGE_JSON_ERROR');
      expect(error.name).toBe('PackageJsonError');
    });
  });
});

describe('isOutdatedPlusError', () => {
  it('should return true for OutdatedPlusError', () => {
    expect(isOutdatedPlusError(new OutdatedPlusError('test', 'CODE'))).toBe(
      true,
    );
  });

  it('should return true for subclasses', () => {
    expect(isOutdatedPlusError(new NetworkError('test'))).toBe(true);
    expect(isOutdatedPlusError(new RegistryError('test', 'pkg'))).toBe(true);
    expect(isOutdatedPlusError(new ParseError('test'))).toBe(true);
  });

  it('should return false for regular Error', () => {
    expect(isOutdatedPlusError(new Error('test'))).toBe(false);
  });

  it('should return false for non-errors', () => {
    expect(isOutdatedPlusError('string')).toBe(false);
    expect(isOutdatedPlusError(null)).toBe(false);
    expect(isOutdatedPlusError(undefined)).toBe(false);
  });
});

describe('formatError', () => {
  it('should format NetworkError with status code', () => {
    const error = new NetworkError('Failed', 'http://test.com', 404);
    expect(formatError(error)).toBe('Network error (HTTP 404): Failed');
  });

  it('should format NetworkError without status code', () => {
    const error = new NetworkError('Failed', 'http://test.com');
    expect(formatError(error)).toBe('Network error: Failed');
  });

  it('should format RegistryError', () => {
    const error = new RegistryError('Not found', 'my-pkg');
    expect(formatError(error)).toBe("Registry error for 'my-pkg': Not found");
  });

  it('should format ParseError', () => {
    const error = new ParseError('Invalid JSON');
    expect(formatError(error)).toBe('Parse error: Invalid JSON');
  });

  it('should format PackageJsonError', () => {
    const error = new PackageJsonError('Missing');
    expect(formatError(error)).toBe('Package.json error: Missing');
  });

  it('should format regular Error', () => {
    const error = new Error('Something went wrong');
    expect(formatError(error)).toBe('Something went wrong');
  });

  it('should format non-Error values', () => {
    expect(formatError('string error')).toBe('string error');
    expect(formatError(123)).toBe('123');
  });
});
