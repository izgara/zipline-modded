import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db';
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

const commentSelect = {
  id: true,
  createdAt: true,
  displayName: true,
  content: true,
};

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
        const file = await prisma.file.findFirst({
          where: { id: req.params.id, showOnProfile: true },
          select: { id: true },
        });
        if (!file) throw new ApiError(9002);

        const comments = await prisma.fileComment.findMany({
          where: { fileId: file.id },
          select: commentSelect,
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
        const file = await prisma.file.findFirst({
          where: { id: req.params.id, showOnProfile: true },
          select: { id: true },
        });
        if (!file) throw new ApiError(9002);

        const visitorId = ensureVisitorId(req, res);

        const comment = await prisma.fileComment.create({
          data: {
            fileId: file.id,
            visitorId,
            displayName: req.body.displayName,
            content: req.body.content,
          },
          select: commentSelect,
        });

        return res.send(comment);
      },
    );
  },
  { name: PATH },
);
