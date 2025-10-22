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

export type Row = {
  Package: string;
  Current: string;
  Wanted: string;
  ToWanted: string;
  Latest: string;
  ToLatest: string;
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
  format: 'plain' | 'tsv' | 'md';
  skip: string[];
  _skipConfig?: SkipFileConfig | null;
  _skipFilePath?: string | null;
  _commandLineSkips?: string[];
};

export type SkippedDependencies = {
  packages: string[];
  reason?: string;
};

export type SkipFileConfig = {
  packages: string[];
  reason?: string;
  autoCleanup?: boolean;
};

export type SkipEntry = {
  package: string;
  version?: string; // If specified, only skip this specific version
  reason?: string;
};
