import { files, tags } from '@/lib/db/schema';
import { createSelectSchema } from 'drizzle-orm/zod';
import { z } from 'zod';

export const tagColumns = { userId: false } as const;

const tagFileSchema = createSelectSchema(files).pick({ id: true });

export const tagSchema = createSelectSchema(tags)
  .omit({ userId: true })
  .extend({
    // icon is stored as a data URI but cleaned down to a boolean before leaving the API
    icon: z.union([z.string(), z.boolean()]).nullish(),
    files: z.array(tagFileSchema).optional(),
    // fork: whether the user asking created the tag (they may edit it; only admins delete)
    mine: z.boolean().optional(),
  });

export type Tag = z.infer<typeof tagSchema>;

/** The tag as `userId` sees it: whether they made it, without the maker's id. */
export function ownTag<T extends { userId?: string | null }>(tag: T, userId: string): Tag {
  const { userId: owner, ...rest } = tag;

  return { ...rest, mine: owner === userId } as unknown as Tag;
}

export function cleanTag(tag: Tag) {
  tag.icon = !!tag.icon;

  return tag;
}

export function cleanTags(tags: Tag[]) {
  for (let i = 0; i !== tags.length; ++i) {
    if (tags[i].icon) tags[i].icon = true;
  }

  return tags;
}
