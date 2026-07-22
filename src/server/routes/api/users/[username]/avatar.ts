import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export const PATH = '/api/users/:username/avatar';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description:
            "Return a user's avatar as raw image bytes, for use in public profile pages and link embeds.",
          params: z.object({
            username: z.string(),
          }),
        },
      },
      async (req, res) => {
        const user = await prisma.user.findFirst({
          where: { username: req.params.username },
          select: { avatar: true },
        });

        if (!user?.avatar) throw new ApiError(9002);

        const match = user.avatar.match(/^data:(.+);base64,(.+)$/);
        if (!match) throw new ApiError(9002);

        const [, mimeType, base64Data] = match;

        return res.type(mimeType).send(Buffer.from(base64Data, 'base64'));
      },
    );
  },
  { name: PATH },
);
