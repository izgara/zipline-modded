import { z } from 'zod';

export const tagSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  name: true,
  color: true,
  icon: true,
  files: {
    select: {
      id: true,
    },
  },
};

export const tagSelectNoFiles = {
  id: true,
  createdAt: true,
  updatedAt: true,
  name: true,
  color: true,
  icon: true,
};

export const tagSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  name: z.string(),
  color: z.string(),
  icon: z.union([z.string(), z.boolean()]).nullish(),
  files: z
    .array(
      z.object({
        id: z.string(),
      }),
    )
    .optional(),
});

export type Tag = z.infer<typeof tagSchema>;

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
