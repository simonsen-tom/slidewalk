#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.js';
import { DEFAULT_PORT, DEFAULT_HOST } from './constants.js';

interface CliOptions {
  deckDir: string;
  port: number;
  host: string;
}

function printUsageAndExit(message?: string): never {
  if (message) {
    console.error(`Error: ${message}\n`);
  }
  console.error('Usage: slidewalk <deck-folder> [--port <number>] [--host <address>]');
  process.exit(1);
}

/**
 * Figures out where a relative <deck-folder> should be resolved from.
 * `npm start` always runs with cwd set to Slidewalk's own package root, so in
 * that one case we use INIT_CWD (the folder you actually ran npm from).
 * Otherwise `npm --prefix ~/slidewalk start -- ./my-deck` would go looking
 * for the deck inside the repo.
 */
function invocationDir(): string {
  const { INIT_CWD, npm_lifecycle_event, npm_package_name } = process.env;
  if (INIT_CWD && npm_lifecycle_event === 'start' && npm_package_name === 'slidewalk') return INIT_CWD;
  return process.cwd();
}

function parseArgv(argv: string[]): CliOptions {
  let deckArg: string | undefined;
  let port = DEFAULT_PORT;
  let host = DEFAULT_HOST;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === '--port') {
      const value = argv[i + 1];
      if (!value || Number.isNaN(Number(value))) printUsageAndExit('--port needs a number after it');
      port = Number(value);
      i += 1;
    } else if (arg === '--host') {
      const value = argv[i + 1];
      if (!value) printUsageAndExit('--host needs a value after it');
      host = value;
      i += 1;
    } else if (!arg.startsWith('--') && deckArg === undefined) {
      deckArg = arg;
    } else {
      printUsageAndExit(`Not sure what to do with "${arg}"`);
    }
  }

  if (!deckArg) {
    printUsageAndExit('Tell me which <deck-folder> to serve');
  }

  const deckDir = path.resolve(invocationDir(), deckArg);
  if (!fs.existsSync(deckDir) || !fs.statSync(deckDir).isDirectory()) {
    printUsageAndExit(`"${deckArg}" isn't a folder`);
  }
  if (!fs.existsSync(path.join(deckDir, 'index.html'))) {
    printUsageAndExit(`"${deckArg}" doesn't have an index.html in it`);
  }

  return { deckDir, port, host };
}

const { deckDir, port, host } = parseArgv(process.argv.slice(2));
const runtimeDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../runtime');

const server = startServer({ deckDir, runtimeDir, port, host });
server.on('listening', () => {
  console.log(`Slidewalk serving "${deckDir}" at http://${host}:${port}`);
  console.log(`(the app's own files are served under http://${host}:${port}/__slidewalk__/)`);
});
