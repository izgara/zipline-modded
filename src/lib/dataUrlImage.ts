import type { FastifyReply } from 'fastify';

// Raster formats only. SVG is an image as well, but it can carry script, and
// these bytes are served from the miyav.tv origin itself.
const SAFE_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

// Avatars and tag icons are stored as whatever data: URL the client sent, and
// the write routes accept any string. Serving one back with the mimetype it
// names would let anyone store `data:text/html;base64,...` and have it render
// as a page on this origin - the same hole upstream closed for file types - so
// the type is checked here, at the point it becomes a response, which also
// covers anything stored before this check existed.
export function parseImageDataUrl(value: string): { mimetype: string; bytes: Buffer } | null {
  const match = value.match(/^data:([^,]*);base64,(.*)$/s);
  if (!match) return null;

  const mimetype = match[1].split(';')[0].trim().toLowerCase();
  if (!SAFE_IMAGE_TYPES.has(mimetype)) return null;

  return { mimetype, bytes: Buffer.from(match[2], 'base64') };
}

export function sendImage(res: FastifyReply, image: { mimetype: string; bytes: Buffer }) {
  return (
    res
      .type(image.mimetype)
      // Belt and braces: never let the browser sniff these into something
      // else, and if one is opened directly, run it with no script and no
      // same-origin access.
      .header('x-content-type-options', 'nosniff')
      .header('content-security-policy', "default-src 'none'; sandbox")
      .send(image.bytes)
  );
}
