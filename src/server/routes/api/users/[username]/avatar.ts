import { ApiError } from '@/lib/api/errors';
import { parseImageDataUrl, sendImage } from '@/lib/dataUrlImage';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import typedPlugin from '@/server/typedPlugin';
import { sql } from 'drizzle-orm';
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
        const [user] = await db
          .select({ avatar: users.avatar })
          .from(users)
          .where(sql`lower(${users.username}) = lower(${req.params.username})`)
          .limit(1);

        if (!user?.avatar) throw new ApiError(9002);

        const image = parseImageDataUrl(user.avatar);
        if (!image) throw new ApiError(9002);

        return sendImage(res, image);
      },
    );
  },
  { name: PATH },
);
