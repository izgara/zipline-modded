import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db';
import { cleanTag, cleanTags, Tag, tagSchema, tagSelect } from '@/lib/db/models/tag';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { zStringTrimmed } from '@/lib/validation';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiUserTagsResponse = Tag | Tag[];

const logger = log('api').c('user').c('tags');

export const PATH = '/api/user/tags';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'List all tags. Tags are shared/global across all users.',
          response: {
            200: z.array(tagSchema),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const tags = await prisma.tag.findMany({
          select: tagSelect,
        });

        return res.send(cleanTags(tags));
      },
    );

    server.post(
      PATH,
      {
        schema: {
          description: 'Create a new tag with a name and color for organizing files.',
          body: z.object({
            name: zStringTrimmed,
            color: z.string().regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/),
            icon: z.string().nullish(),
          }),
          response: {
            200: tagSchema,
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
        ...secondlyRatelimit(1),
      },
      async (req, res) => {
        const { name, color, icon } = req.body;

        const existingTag = await prisma.tag.findFirst({
          where: {
            name,
          },
        });

        if (existingTag) throw new ApiError(1033);

        const tag = await prisma.tag.create({
          data: {
            name,
            color,
            icon: icon || null,
            userId: req.user.id,
          },
          select: tagSelect,
        });

        logger.info('tag created', {
          id: tag.id,
          name: tag.name,
          user: req.user.username,
        });

        return res.send(cleanTag(tag));
      },
    );
  },
  { name: PATH },
);
