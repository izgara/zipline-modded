import { db } from '@/lib/db';
import { files, filesToTags } from '@/lib/db/schema';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { and, count, eq, notExists, sql } from 'drizzle-orm';
import z from 'zod';

// Fork: tags are shared by everyone, so the tag list alone cannot say which tags this
// user's files carry. The files page's tag bar reads it from here.
export type ApiUserFilesTagCountsResponse = Record<string, number>;

export const PATH = '/api/user/files/tag-counts';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description:
            'How many of the authenticated user’s files carry each tag, keyed by tag id, plus `untagged`: how many carry none.',
          response: {
            200: z.record(z.string(), z.number()),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const rows = await db
          .select({ tagId: filesToTags.tagId, files: count() })
          .from(filesToTags)
          .innerJoin(files, eq(files.id, filesToTags.fileId))
          .where(eq(files.userId, req.user.id))
          .groupBy(filesToTags.tagId);

        const untagged = await db.$count(
          files,
          and(
            eq(files.userId, req.user.id),
            notExists(
              db
                .select({ one: sql`1` })
                .from(filesToTags)
                .where(eq(filesToTags.fileId, files.id)),
            ),
          ),
        );

        return res.send({ ...Object.fromEntries(rows.map((row) => [row.tagId, row.files])), untagged });
      },
    );
  },
  { name: PATH },
);
