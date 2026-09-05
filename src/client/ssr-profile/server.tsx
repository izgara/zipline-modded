import '@mantine/charts/styles.css';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';
import 'mantine-datatable/styles.css';

import { config as zConfig } from '@/lib/config';
import type { Config } from '@/lib/config/validate';
import { db } from '@/lib/db';
import { cleanFiles, fileColumns } from '@/lib/db/models/file';
import { tagColumns } from '@/lib/db/models/tag';
import { users } from '@/lib/db/schema';
import { createZiplineSsr } from '@/lib/ssr/createZiplineSsr';
import { stripHtml } from '@/lib/stripHtml';
import type { ZiplineTheme } from '@/lib/theme';
import { readThemes } from '@/lib/theme/file';
import { readVisitorId } from '@/lib/visitor';
import { sql } from 'drizzle-orm';
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
    req: FastifyRequest<{ Params: { username: string }; Querystring: { clip?: string } }>;
  },
  url: string,
) {
  const username = req.params?.username ?? null;
  if (!username) return { html: 'Not Found', meta: '', status: 404 };

  const { config: libConfig, reloadSettings } = await import('@/lib/config');
  if (!libConfig) await reloadSettings();

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      role: users.role,
      view: users.view,
      avatar: users.avatar,
    })
    .from(users)
    .where(sql`lower(${users.username}) = lower(${username})`)
    .limit(1);
  if (!user) return { html: 'Not Found', meta: '', status: 404 };

  const visitorId = readVisitorId(req);

  const rawFiles = await db.query.files.findMany({
    columns: fileColumns,
    where: { userId: user.id, showOnProfile: true, password: { isNull: true } },
    orderBy: { createdAt: 'desc' },
    with: {
      thumbnail: { columns: { path: true } },
      tags: { columns: tagColumns },
      likes: { columns: { visitorId: true } },
      comments: { columns: { id: true } },
    },
  });

  const files = cleanFiles(rawFiles as any, true).map((file: any) => {
    const { likes, comments, ...rest } = file;
    return {
      ...rest,
      likeCount: likes.length,
      commentCount: comments.length,
      likedByMe: visitorId
        ? likes.some((like: { visitorId: string }) => like.visitorId === visitorId)
        : false,
    };
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

  const openClipId = req.query?.clip;
  const openClip = openClipId ? files.find((f) => f.id === openClipId) : undefined;

  const data = { user, files, username, host, openClipId: openClip?.id ?? null };

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

  let headMeta: string;

  if (openClip) {
    const safeCaption = stripHtml(openClip.profileCaption || openClip.originalName || openClip.name);
    const clipImage = openClip.thumbnail
      ? `${host}/raw/${openClip.thumbnail.path}`
      : `${host}/api/users/${encodeURIComponent(user.username)}/avatar`;

    headMeta = [
      `<title>${safeCaption} — ${safeUsername}'s clips</title>`,
      `<meta property="og:title" content="${safeCaption}" />`,
      `<meta property="og:description" content="A clip shared by ${safeUsername}" />`,
      `<meta property="og:url" content="${pageUrl}?clip=${encodeURIComponent(openClip.id)}" />`,
      '<meta property="og:type" content="video.other" />',
      `<meta property="og:image" content="${clipImage}" />`,
      `<meta property="og:video:url" content="${host}/raw/${openClip.name}" />`,
      '<meta name="twitter:card" content="summary_large_image" />',
    ].join('\n');
  } else {
    const avatarImage = `${host}/api/users/${encodeURIComponent(user.username)}/avatar`;

    headMeta = [
      `<title>${safeUsername}'s clips</title>`,
      `<meta property="og:title" content="${safeUsername}'s clips" />`,
      `<meta property="og:description" content="${files.length} clip${files.length === 1 ? '' : 's'} shared" />`,
      `<meta property="og:url" content="${pageUrl}" />`,
      '<meta property="og:type" content="profile" />',
      `<meta property="og:image" content="${avatarImage}" />`,
      '<meta name="twitter:card" content="summary" />',
    ].join('\n');
  }

  return {
    html,
    meta: `${headMeta}\n${createZiplineSsr(data)}`,
  };
}
