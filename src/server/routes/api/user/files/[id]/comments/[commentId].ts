import { ApiError } from '@/lib/api/errors';
import { db } from '@/lib/db';
import { fileComments } from '@/lib/db/schema';
import { canInteract } from '@/lib/role';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { and, eq } from 'drizzle-orm';
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
        const file = await db.query.files.findFirst({
          columns: { id: true },
          where: { id: req.params.id },
          with: { user: { columns: { id: true, role: true } } },
        });
        if (!file) throw new ApiError(4000);

        if (req.user.id !== file.user?.id && !canInteract(req.user.role, file.user?.role ?? 'USER'))
          throw new ApiError(4000);

        const deleted = await db
          .delete(fileComments)
          .where(and(eq(fileComments.id, req.params.commentId), eq(fileComments.fileId, file.id)))
          .returning({ id: fileComments.id });
        if (deleted.length === 0) throw new ApiError(9002);

        return res.send({ success: true });
      },
    );
  },
  { name: PATH },
);
