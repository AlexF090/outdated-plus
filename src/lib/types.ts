export type OutdatedEntry = {
  current: string;
  wanted: string;
  latest: string;
};

export type OutdatedMap = Record<string, OutdatedEntry>;

export type Meta = {
  latest: string;
  timeMap: Record<string, string>;
};

export interface NpmRegistryResponse {
  'dist-tags'?: {
    latest?: string;
    [tag: string]: string | undefined;
  };
  time?: Record<string, unknown>;
  versions?: Record<string, unknown>;
  name?: string;
  description?: string;
}

export type Row = {
  Package: string;
  Current: string;
  Wanted: string;
  ToWanted: BumpType;
  Latest: string;
  ToLatest: BumpType;
  PublishedWanted: string;
  AgeWanted: string;
  PublishedLatest: string;
  AgeLatest: string;
  _name: string;
  _published_wanted: number;
  _published_latest: number;
  _age_wanted: number;
  _age_latest: number;
  _latest: string;
};

export type Args = {
  olderThan: number;
  showAll: boolean;
  showWanted: boolean;
  quiet: boolean;
  checkAll: boolean;
  iso: boolean;
  concurrency: number;
  sortBy:
    | 'name'
    | 'age'
    | 'published'
    | 'age_latest'
    | 'age_wanted'
    | 'published_latest'
    | 'published_wanted'
    | 'current'
    | 'wanted'
    | 'latest';
  order: 'asc' | 'desc';
  format: 'plain' | 'md';
  skip: string[];
  _skipConfig?: SkipFileConfig | null;
  _skipFilePath?: string | null;
  _commandLineSkips?: string[];
};

export type SkipFileConfig = {
  packages: string[];
  reason?: string;
  autoCleanup?: boolean;
};

export type BumpType =
  | 'major'
  | 'minor'
  | 'patch'
  | 'prerelease'
  | 'same'
  | 'unknown';
