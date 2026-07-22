import { config } from '@/lib/config';
import { createToken } from '@/lib/crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

const VISITOR_COOKIE = 'zipline_visitor';
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 5; // 5 years

// Ensures the current anonymous visitor has a durable, signed identifier -
// used to dedupe likes/comments per-visitor without requiring an account.
export function ensureVisitorId(req: FastifyRequest, res: FastifyReply): string {
  let visitorId: string | null = null;

  const existingCookie = req.cookies[VISITOR_COOKIE];
  if (existingCookie) {
    const unsigned = req.unsignCookie(existingCookie);
    if (unsigned.valid) visitorId = unsigned.value;
  }

  if (!visitorId) visitorId = createToken();

  res.setCookie(VISITOR_COOKIE, visitorId, {
    signed: true,
    httpOnly: true,
    sameSite: 'lax',
    secure: config.core.returnHttpsUrls,
    maxAge: VISITOR_COOKIE_MAX_AGE,
    path: '/',
  });

  return visitorId;
}

// Read-only variant for contexts (like SSR render) that shouldn't mint a new
// cookie themselves - returns null if the visitor has no valid identity yet.
export function readVisitorId(req: FastifyRequest): string | null {
  const existingCookie = req.cookies[VISITOR_COOKIE];
  if (!existingCookie) return null;

  const unsigned = req.unsignCookie(existingCookie);
  return unsigned.valid ? unsigned.value : null;
}
