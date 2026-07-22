import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db';
import { canInteract } from '@/lib/role';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiUserFilesIdCommentsIdResponse = {
  success: boolean;
};

const paramsSchema = z.object({
  id: z.string(),
  commentId: z.string(),
});

export const PATH = '/api/user/files/:id/comments/:commentId';
export default typedPlugin(
  async (server) => {
    server.delete(
      PATH,
      {
        schema: {
          description: "Delete a comment on one of the authenticated user's files (moderation).",
          params: paramsSchema,
          response: {
            200: z.object({ success: z.boolean() }),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const file = await prisma.file.findFirst({
          where: { id: req.params.id },
          select: { id: true, User: true },
        });
        if (!file) throw new ApiError(4000);

        if (req.user.id !== file.User?.id && !canInteract(req.user.role, file.User?.role ?? 'USER'))
          throw new ApiError(4000);

        const deleted = await prisma.fileComment.deleteMany({
          where: { id: req.params.commentId, fileId: file.id },
        });
        if (deleted.count === 0) throw new ApiError(9002);

        return res.send({ success: true });
      },
    );
  },
  { name: PATH },
);
