import { db } from '@/lib/db';
import { urls, users } from '@/lib/db/schema';
import { log } from '@/lib/logger';
import { eq, or, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import loadRoutes from '../routes';
import { filesRoute } from '../routes/files.dy';
import { urlsRoute } from '../routes/urls.dy';

const logger = log('server');

export async function registerRoutes(server: FastifyInstance, mode: string) {
  const config = global.__config__;

  server.get<{ Params: { id: string } }>('/r/:id', async (req, res) => {
    return res.redirect('/raw/' + req.params.id, 301);
  });

  server.get<{ Params: { id: string } }>('/view/:id', async (_req, res) => {
    return res.ssr('view');
  });

  server.get<{ Params: { id: string } }>('/view/url/:id', async (_req, res) => {
    return res.ssr('view-url');
  });

  // Old profile path, kept as a permanent redirect so links shared before the
  // move to root-level usernames keep working.
  server.get<{ Params: { username: string } }>('/profile/:username', async (req, res) => {
    return res.redirect(`/${req.params.username}`, 301);
  });

  if (config.files.route === '/' && config.urls.route === '/') {
    logger.debug('files & urls route = /, using catch-all route');

    server.get<{ Params: { id: string }; Querystring: { token?: string; download?: string } }>(
      '/:id',
      async (req, res) => {
        const { id } = req.params;

        if (id === '') return res.callNotFound();
        else if (id === 'dashboard') return res.callNotFound(); // todo render dashboard

        const urlCount = await db.$count(urls, or(eq(urls.code, id), eq(urls.vanity, id)));
        if (urlCount > 0) return urlsRoute(req, res);
        else return filesRoute(req, res);
      },
    );
  } else {
    server.get(config.files.route === '/' ? '/:id' : `${config.files.route}/:id`, filesRoute);
    server.get(config.urls.route === '/' ? '/:id' : `${config.urls.route}/:id`, urlsRoute);
  }

  const routes = await loadRoutes();
  const routePlugins = Object.values(routes);
  await Promise.all(routePlugins.map((route) => server.register(route)));

  if (mode === 'production') {
    server.serveIndex('/dashboard*');
    server.serveIndex('/auth*');
    server.serveIndex('/folder*');
  }

  // Public profiles live at the root: /<username>. Fastify matches static segments
  // (/dashboard, /auth, /api, /u, /go, /robots.txt, ...) before this parametric
  // route, and it only matches a single segment so /assets/* is unaffected.
  // Unknown names call notFound so they fall through to the normal 404 page.
  server.get<{ Params: { username: string } }>('/:username', async (req, res) => {
    const { username } = req.params;
    if (!username) return res.callNotFound();

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.username}) = lower(${username})`)
      .limit(1);

    if (!user) return res.callNotFound();

    return res.ssr('profile');
  });

  server.get('/', (_, res) => res.redirect('/dashboard', 301));
}
