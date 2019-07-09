/* @flow */

export const isDev = process.env.NODE_ENV === 'development';
export const isVerbose = process.env.VERBOSE === 'true';

export const log = (
  logger: any => void = console.error.bind(console),
  ...args: any
) =>
  // This should be more configurable: tracked in colonyDapp#1435
  isDev || isVerbose ? logger(...args) : null;

log.warn = (...args: any) => log(console.warn.bind(console), ...args);

log.info = (...args: any) => log(console.info.bind(console), ...args);
log.debug = log.info; // Just an alias for `info`

// This will always log, and is only defined for consistency's sake
log.error = console.error.bind(console);

log.verbose = (message: string, ...args: any) =>
  isVerbose
    ? log(
        console.info.bind(console),
        `%c verbose: ${message}`,
        'color: #f2f',
        ...args,
      )
    : null;
