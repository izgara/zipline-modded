import { ApiError } from '@/lib/api/errors';
import { config } from '@/lib/config';
import { createToken } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { secondlyRatelimit } from '@/lib/ratelimits';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiFilesIdLikeResponse = {
  liked: boolean;
  likes: number;
};

const VISITOR_COOKIE = 'zipline_visitor';
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 5; // 5 years

export const PATH = '/api/files/:id/like';
export default typedPlugin(
  async (server) => {
    server.post(
      PATH,
      {
        schema: {
          description: 'Toggle an anonymous like on a public (showOnProfile) file.',
          params: z.object({
            id: z.string(),
          }),
          response: {
            200: z.object({
              liked: z.boolean(),
              likes: z.number(),
            }),
          },
        },
        ...secondlyRatelimit(10, 5),
      },
      async (req, res) => {
        const file = await prisma.file.findFirst({
          where: { id: req.params.id, showOnProfile: true },
          select: { id: true },
        });
        if (!file) throw new ApiError(9002);

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

        const existingLike = await prisma.fileLike.findUnique({
          where: { fileId_visitorId: { fileId: file.id, visitorId } },
        });

        let liked: boolean;
        if (existingLike) {
          await prisma.fileLike.delete({ where: { id: existingLike.id } });
          liked = false;
        } else {
          await prisma.fileLike.create({ data: { fileId: file.id, visitorId } });
          liked = true;
        }

        const likes = await prisma.fileLike.count({ where: { fileId: file.id } });

        return res.send({ liked, likes });
      },
    );
  },
  { name: PATH },
);
