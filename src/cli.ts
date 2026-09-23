import { parseArgs } from 'node:util';
import { ProjectError, readDependencies } from './project.ts';
import { fetchAllMetadata, loadRegistryConfiguration } from './registry.ts';
import { buildRows, sortRows } from './rows.ts';
import { renderTable } from './table.ts';

export interface OutputStream {
  write: (text: string) => unknown;
}

export interface RunOptions {
  arguments: readonly string[];
  version: string;
  directory: string;
  homeDirectory: string;
  environment: NodeJS.ProcessEnv;
  fetch: typeof fetch;
  signal: AbortSignal;
  now: Date;
  stdout: OutputStream;
  stderr: OutputStream;
  colors: boolean;
}

const HELP = `Usage: outdated-plus [options]

Lists every direct dependency of the package.json in the current directory
with the installed and the latest version and when each was released.

Works with npm, pnpm, yarn (node_modules linker) and bun. Registry URLs and
credentials are read from .npmrc.

Options:
  -h, --help     Show this help
  -v, --version  Show the version number
`;

const parseOptions = (
  argumentList: readonly string[],
): { help: boolean; version: boolean } => {
  const { values } = parseArgs({
    args: [...argumentList],
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
    },
    strict: true,
    allowPositionals: false,
  });
  return { help: values.help, version: values.version };
};

/** Runs the command and returns the process exit code. */
export const run = async (options: RunOptions): Promise<number> => {
  let flags: { help: boolean; version: boolean };
  try {
    flags = parseOptions(options.arguments);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    options.stderr.write(`${message}\n\n${HELP}`);
    return 1;
  }
  if (flags.help) {
    options.stdout.write(HELP);
    return 0;
  }
  if (flags.version) {
    options.stdout.write(`${options.version}\n`);
    return 0;
  }

  try {
    const dependencies = await readDependencies(options.directory);
    if (dependencies.length === 0) {
      options.stdout.write('No dependencies found in package.json.\n');
      return 0;
    }

    const configuration = await loadRegistryConfiguration(options);
    const metadata = await fetchAllMetadata(
      dependencies.map(({ registryName }) => registryName),
      { configuration, fetch: options.fetch, signal: options.signal },
    );
    const rows = sortRows(buildRows(dependencies, metadata));
    options.stdout.write(
      `${renderTable(rows, { now: options.now, colors: options.colors })}\n`,
    );

    let failureCount = 0;
    for (const [packageName, result] of metadata) {
      if (result.status !== 'failed') {
        continue;
      }
      failureCount += 1;
      options.stderr.write(
        `Could not load ${packageName} from the registry: ${result.reason}\n`,
      );
    }
    return failureCount === metadata.size ? 1 : 0;
  } catch (error) {
    if (error instanceof ProjectError) {
      options.stderr.write(`${error.message}\n`);
      return 1;
    }
    throw error;
  }
};
