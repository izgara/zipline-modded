import { ApiError } from '@/lib/api/errors';
import { db } from '@/lib/db';
import { fileComments } from '@/lib/db/schema';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { ensureVisitorId } from '@/lib/visitor';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

const commentSchema = z.object({
  id: z.string(),
  createdAt: z.union([z.date(), z.string()]),
  displayName: z.string(),
  content: z.string(),
});

export type FileComment = z.infer<typeof commentSchema>;
export type ApiFilesIdCommentsResponse = FileComment | FileComment[];

const commentColumns = {
  id: true,
  createdAt: true,
  displayName: true,
  content: true,
} as const;

export const PATH = '/api/files/:id/comments';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: "List a public (showOnProfile) file's comments.",
          params: z.object({
            id: z.string(),
          }),
          response: {
            200: z.array(commentSchema),
          },
        },
      },
      async (req, res) => {
        const file = await db.query.files.findFirst({
          columns: { id: true },
          where: { id: req.params.id, showOnProfile: true },
        });
        if (!file) throw new ApiError(9002);

        const comments = await db.query.fileComments.findMany({
          columns: commentColumns,
          where: { fileId: file.id },
          orderBy: { createdAt: 'asc' },
        });

        return res.send(comments);
      },
    );

    server.post(
      PATH,
      {
        schema: {
          description: 'Post an anonymous comment on a public (showOnProfile) file.',
          params: z.object({
            id: z.string(),
          }),
          body: z.object({
            displayName: z.string().trim().min(1).max(32),
            content: z.string().trim().min(1).max(500),
          }),
          response: {
            200: commentSchema,
          },
        },
        ...secondlyRatelimit(30, 3),
      },
      async (req, res) => {
        const file = await db.query.files.findFirst({
          columns: { id: true },
          where: { id: req.params.id, showOnProfile: true },
        });
        if (!file) throw new ApiError(9002);

        const visitorId = ensureVisitorId(req, res);

        const [comment] = await db
          .insert(fileComments)
          .values({
            fileId: file.id,
            visitorId,
            displayName: req.body.displayName,
            content: req.body.content,
          })
          .returning({
            id: fileComments.id,
            createdAt: fileComments.createdAt,
            displayName: fileComments.displayName,
            content: fileComments.content,
          });

        return res.send(comment);
      },
    );
  },
  { name: PATH },
);
