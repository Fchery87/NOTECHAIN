/**
 * Root Bun test preload.
 *
 * Keep this dependency-free: it is loaded by root `bunfig.toml` for any `bun test`
 * invocation from the workspace root. Browser-heavy app tests should use the web
 * package Vitest setup instead:
 *
 *   bun --filter='@notechain/web' run test -- src/path/to/file.test.ts
 */

if (!globalThis.atob) {
  globalThis.atob = (value: string) => Buffer.from(value, 'base64').toString('binary');
}

if (!globalThis.btoa) {
  globalThis.btoa = (value: string) => Buffer.from(value, 'binary').toString('base64');
}
