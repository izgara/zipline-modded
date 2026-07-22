import '@mantine/charts/styles.css';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';
import 'mantine-datatable/styles.css';

import { config as zConfig } from '@/lib/config';
import type { Config } from '@/lib/config/validate';
import { prisma } from '@/lib/db';
import { cleanFiles, fileSelect } from '@/lib/db/models/file';
import { limitedUserSelect } from '@/lib/db/models/user';
import { createZiplineSsr } from '@/lib/ssr/createZiplineSsr';
import { stripHtml } from '@/lib/stripHtml';
import type { ZiplineTheme } from '@/lib/theme';
import { readThemes } from '@/lib/theme/file';
import { FastifyRequest } from 'fastify';
import { renderToString } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router-dom';
import { createRoutes } from './routes';

export async function render(
  {
    defaultTheme,
    req,
  }: {
    themes: ZiplineTheme[];
    defaultTheme: Config['website']['theme'];
    req: FastifyRequest<{ Params: { username: string } }>;
  },
  url: string,
) {
  const username = req.params?.username ?? null;
  if (!username) return { html: 'Not Found', meta: '', status: 404 };

  const { config: libConfig, reloadSettings } = await import('@/lib/config');
  if (!libConfig) await reloadSettings();

  const user = await prisma.user.findFirst({
    where: { username },
    select: limitedUserSelect,
  });
  if (!user) return { html: 'Not Found', meta: '', status: 404 };

  let visitorId: string | null = null;
  const visitorCookie = req.cookies?.zipline_visitor;
  if (visitorCookie) {
    const unsigned = req.unsignCookie(visitorCookie);
    if (unsigned.valid) visitorId = unsigned.value;
  }

  const rawFiles = await prisma.file.findMany({
    where: { userId: user.id, showOnProfile: true, password: null },
    select: {
      ...fileSelect,
      _count: { select: { likes: true } },
      likes: visitorId ? { where: { visitorId }, select: { id: true } } : false,
    },
    orderBy: { createdAt: 'desc' },
  });

  const files = cleanFiles(rawFiles, true).map((file: any) => {
    const { _count, likes, ...rest } = file;
    return { ...rest, likeCount: _count.likes, likedByMe: !!likes?.length };
  });

  let host = req.headers.host || 'localhost';
  const proto = req.headers['x-forwarded-proto'];
  try {
    if (
      JSON.parse(req.headers['cf-visitor'] as string)?.scheme === 'https' ||
      proto === 'https' ||
      zConfig.core.returnHttpsUrls
    ) {
      host = `https://${host}`;
    } else {
      host = `http://${host}`;
    }
  } catch {
    host = proto === 'https' || zConfig.core.returnHttpsUrls ? `https://${host}` : `http://${host}`;
  }

  const themes = await readThemes();

  const data = { user, files, username, host };

  const routes = createRoutes(themes, defaultTheme);
  const { query } = createStaticHandler(routes);
  const context = await query(
    new Request('http://client' + url, {
      method: 'GET',
      headers: new Headers({ accept: 'text/html' }),
    }),
  );

  if (context instanceof Response) {
    return context;
  }

  const router = createStaticRouter(routes, context);
  const html = renderToString(<StaticRouterProvider context={context} router={router} />);

  const safeUsername = stripHtml(user.username);
  const pageUrl = `${host}${url.split('?')[0]}`;

  const firstVideoThumbnail = files.find((f) => f.type?.startsWith('video/') && f.thumbnail)?.thumbnail?.path;
  const ogImage = firstVideoThumbnail
    ? `${host}/raw/${firstVideoThumbnail}`
    : `${host}/api/users/${encodeURIComponent(user.username)}/avatar`;

  const headMeta = [
    `<title>${safeUsername}'s clips</title>`,
    `<meta property="og:title" content="${safeUsername}'s clips" />`,
    `<meta property="og:description" content="${files.length} clip${files.length === 1 ? '' : 's'} shared" />`,
    `<meta property="og:url" content="${pageUrl}" />`,
    '<meta property="og:type" content="profile" />',
    `<meta property="og:image" content="${ogImage}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
  ].join('\n');

  return {
    html,
    meta: `${headMeta}\n${createZiplineSsr(data)}`,
  };
}
