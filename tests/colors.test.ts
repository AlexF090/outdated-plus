import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  colorAge,
  colorBumpType,
  colors,
  isColorEnabled,
} from '../src/lib/colors.js';

describe('colors utility', () => {
  describe('with colors enabled', () => {
    beforeEach(() => {
      delete process.env.NO_COLOR;
      process.env.FORCE_COLOR = '1';
    });

    afterEach(() => {
      delete process.env.FORCE_COLOR;
      vi.unstubAllEnvs();
    });

    it('should wrap text with red color', () => {
      const result = colors.red('test');
      expect(result).toContain('test');
      expect(result).toContain('\x1b[31m');
    });

    it('should wrap text with green color', () => {
      const result = colors.green('test');
      expect(result).toContain('test');
      expect(result).toContain('\x1b[32m');
    });

    it('should wrap text with yellow color', () => {
      const result = colors.yellow('test');
      expect(result).toContain('test');
      expect(result).toContain('\x1b[33m');
    });

    it('should wrap text with bold', () => {
      const result = colors.bold('test');
      expect(result).toContain('test');
      expect(result).toContain('\x1b[1m');
    });
  });

  describe('with colors disabled', () => {
    beforeEach(() => {
      process.env.NO_COLOR = '1';
      delete process.env.FORCE_COLOR;
    });

    afterEach(() => {
      delete process.env.NO_COLOR;
      vi.unstubAllEnvs();
    });

    it('should return plain text without ANSI codes', () => {
      const result = colors.red('test');
      expect(result).toBe('test');
      expect(result).not.toContain('\x1b[31m');
    });

    it('should return plain text for bold', () => {
      const result = colors.bold('test');
      expect(result).toBe('test');
      expect(result).not.toContain('\x1b[1m');
    });
  });
});

describe('colorBumpType', () => {
  it('should return major with color', () => {
    const result = colorBumpType('major');
    expect(result).toContain('major');
  });

  it('should return minor with color', () => {
    const result = colorBumpType('minor');
    expect(result).toContain('minor');
  });

  it('should return patch with color', () => {
    const result = colorBumpType('patch');
    expect(result).toContain('patch');
  });

  it('should return prerelease with color', () => {
    const result = colorBumpType('prerelease');
    expect(result).toContain('prerelease');
  });

  it('should return same with color', () => {
    const result = colorBumpType('same');
    expect(result).toContain('same');
  });

  it('should return unknown unchanged', () => {
    const result = colorBumpType('unknown');
    expect(result).toContain('unknown');
  });
});

describe('colorAge', () => {
  it('should return dash for null', () => {
    expect(colorAge(null)).toBe('-');
  });

  it('should color old packages (>365 days)', () => {
    const result = colorAge(400);
    expect(result).toContain('400');
  });

  it('should color medium-old packages (>90 days)', () => {
    const result = colorAge(100);
    expect(result).toContain('100');
  });

  it('should color fresh packages (<90 days)', () => {
    const result = colorAge(30);
    expect(result).toContain('30');
  });

  it('should handle zero', () => {
    const result = colorAge(0);
    expect(result).toContain('0');
  });
});

describe('isColorEnabled', () => {
  afterEach(() => {
    delete process.env.NO_COLOR;
    delete process.env.FORCE_COLOR;
    vi.unstubAllEnvs();
  });

  it('should return true when FORCE_COLOR is set', () => {
    process.env.FORCE_COLOR = '1';
    delete process.env.NO_COLOR;
    expect(isColorEnabled()).toBe(true);
  });

  it('should return false when NO_COLOR is set', () => {
    process.env.NO_COLOR = '1';
    delete process.env.FORCE_COLOR;
    expect(isColorEnabled()).toBe(false);
  });

  it('should prioritize NO_COLOR over FORCE_COLOR', () => {
    process.env.NO_COLOR = '1';
    process.env.FORCE_COLOR = '1';
    expect(isColorEnabled()).toBe(false);
  });
});
