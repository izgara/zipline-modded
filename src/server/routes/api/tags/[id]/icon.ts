import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export const PATH = '/api/tags/:id/icon';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description:
            "Return a tag's icon as raw image bytes, for use in tag pills and public profile pages.",
          params: z.object({
            id: z.string(),
          }),
        },
      },
      async (req, res) => {
        const tag = await prisma.tag.findFirst({
          where: { id: req.params.id },
          select: { icon: true },
        });

        if (!tag?.icon) throw new ApiError(9002);

        const match = tag.icon.match(/^data:(.+);base64,(.+)$/);
        if (!match) throw new ApiError(9002);

        const [, mimeType, base64Data] = match;

        return res.type(mimeType).send(Buffer.from(base64Data, 'base64'));
      },
    );
  },
  { name: PATH },
);
