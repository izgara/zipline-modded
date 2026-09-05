import { ApiError } from '@/lib/api/errors';
import { db } from '@/lib/db';
import { fileLikes } from '@/lib/db/schema';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { ensureVisitorId } from '@/lib/visitor';
import typedPlugin from '@/server/typedPlugin';
import { eq } from 'drizzle-orm';
import z from 'zod';

export type ApiFilesIdLikeResponse = {
  liked: boolean;
  likes: number;
};

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
        const file = await db.query.files.findFirst({
          columns: { id: true },
          where: { id: req.params.id, showOnProfile: true },
        });
        if (!file) throw new ApiError(9002);

        const visitorId = ensureVisitorId(req, res);

        const existingLike = await db.query.fileLikes.findFirst({
          columns: { id: true },
          where: { fileId: file.id, visitorId },
        });

        let liked: boolean;
        if (existingLike) {
          await db.delete(fileLikes).where(eq(fileLikes.id, existingLike.id));
          liked = false;
        } else {
          await db.insert(fileLikes).values({ fileId: file.id, visitorId });
          liked = true;
        }

        const likes = await db.$count(fileLikes, eq(fileLikes.fileId, file.id));

        return res.send({ liked, likes });
      },
    );
  },
  { name: PATH },
);
