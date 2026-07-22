import { prisma } from '@/lib/db';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiUserMentionsResponse = string[];

export const PATH = '/api/user/mentions';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'List distinct names mentioned across all files owned by the authenticated user.',
          response: {
            200: z.array(z.string()),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const files = await prisma.file.findMany({
          where: { userId: req.user.id },
          select: { mentions: true },
        });

        const mentions = new Set<string>();
        for (const file of files) {
          for (const mention of file.mentions) mentions.add(mention);
        }

        return res.send(Array.from(mentions).sort((a, b) => a.localeCompare(b)));
      },
    );
  },
  { name: PATH },
);
