#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { run } from './cli.ts';

const readVersion = (): string => {
  const manifest: unknown = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  );
  return typeof manifest === 'object' &&
    manifest !== null &&
    'version' in manifest &&
    typeof manifest.version === 'string'
    ? manifest.version
    : 'unknown';
};

const supportsColor = (): boolean => {
  const forceColor = process.env['FORCE_COLOR'];
  if (forceColor !== undefined) {
    return forceColor !== '0' && forceColor !== 'false';
  }
  return process.stdout.isTTY === true && process.stdout.hasColors();
};

const shutdown = new AbortController();
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => shutdown.abort());
}

try {
  process.exitCode = await run({
    arguments: process.argv.slice(2),
    version: readVersion(),
    directory: process.cwd(),
    homeDirectory: homedir(),
    environment: process.env,
    fetch: globalThis.fetch,
    signal: shutdown.signal,
    now: new Date(),
    stdout: process.stdout,
    stderr: process.stderr,
    colors: supportsColor(),
  });
} catch (error) {
  if (shutdown.signal.aborted) {
    process.exitCode = 130;
  } else {
    console.error(error);
    process.exitCode = 1;
  }
}
