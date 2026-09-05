import { log } from '@/lib/logger';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { mkdir } from 'fs/promises';
import { basename, resolve } from 'path';

const logger = log('server').c('plugin').c('downloads');

// Where the Clip Manager installers live. This is the `public` volume the
// compose file already mounts, so putting out a new build is a file copy on the
// server - no image rebuild, no database row, and no login to get at it. The
// homepage labels its download button from latest.json in here, which is why a
// release never needs a code change.
export const DOWNLOADS_DIR = resolve(process.env.ZIPLINE_ROOT ?? '.', 'public', 'downloads');

async function downloadsPlugin(fastify: FastifyInstance) {
  // @fastify/static throws when its root is missing, and an empty folder must
  // not be able to stop the whole server from starting.
  await mkdir(DOWNLOADS_DIR, { recursive: true });

  await fastify.register(fastifyStatic, {
    root: DOWNLOADS_DIR,
    prefix: '/download/',
    // The root static handler already owns the reply decorators.
    decorateReply: false,
    index: false,
    dotfiles: 'deny',
    setHeaders(res, path) {
      // Installers should land in the Downloads folder rather than have the
      // browser guess at rendering them. latest.json is read with fetch() by the
      // homepage, so it stays inline.
      if (path.endsWith('.json')) return;
      res.setHeader('content-disposition', `attachment; filename="${basename(path)}"`);
    },
  });

  logger.info('serving downloads', { directory: DOWNLOADS_DIR });
}

export default fastifyPlugin(downloadsPlugin, {
  name: 'downloads',
  fastify: '5.x',
});
