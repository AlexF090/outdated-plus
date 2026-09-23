import { vi } from 'vitest';
import type { Meta, OutdatedMap } from '../types.js';

export const mockOutdatedData: OutdatedMap = {
  react: {
    current: '18.2.0',
    wanted: '18.3.0',
    latest: '19.0.0',
  },
  typescript: {
    current: '5.0.0',
    wanted: '5.1.0',
    latest: '5.2.0',
  },
  lodash: {
    current: '4.17.20',
    wanted: '4.17.21',
    latest: '4.17.21',
  },
};

export const mockMetaData: Record<string, Meta> = {
  react: {
    latest: '19.0.0',
    timeMap: {
      '18.3.0': '2023-11-01T10:00:00Z',
      '19.0.0': '2023-11-15T10:00:00Z',
    },
  },
  typescript: {
    latest: '5.2.0',
    timeMap: {
      '5.1.0': '2023-10-15T10:00:00Z',
      '5.2.0': '2023-11-10T10:00:00Z',
    },
  },
  lodash: {
    latest: '4.17.21',
    timeMap: {
      '4.17.21': '2023-11-05T10:00:00Z',
    },
  },
};

export function createMockSpawnJson() {
  return vi.fn().mockImplementation((cmd: string, args: string[]) => {
    if (cmd === 'npm' && args.includes('outdated')) {
      return Promise.resolve(mockOutdatedData);
    }
    if (cmd === 'npm' && args.includes('view')) {
      const packageName = args[1];
      return Promise.resolve(
        mockMetaData[packageName] || { latest: '', timeMap: {} },
      );
    }
    return Promise.resolve({});
  });
}
