export const RESERVED_ROUTES = [
  '/dashboard',
  '/auth',
  '/api',
  '/raw',
  '/r',
  '/invite',
  '/view',
  '/profile',
  '/robots.txt',
  '/manifest.json',
  '/favicon.ico',
] as const;

// A username is served at the root as /<username>, so it must not collide with a
// route the router matches first - otherwise that user's profile is unreachable.
// The files and urls routes are configurable (default /u and /go), so they are
// checked too rather than hard-coded.
export function isReservedUsername(username: string, filesRoute?: string, urlsRoute?: string): boolean {
  const strip = (route: string) => route.replace(/^\/+/, '').toLowerCase();

  const reserved = new Set<string>([
    ...RESERVED_ROUTES.map(strip),
    'folder',
    ...[filesRoute, urlsRoute].filter((r): r is string => !!r).map(strip),
  ]);
  reserved.delete('');

  return reserved.has(username.trim().toLowerCase());
}
