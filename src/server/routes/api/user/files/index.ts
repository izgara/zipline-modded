import { ApiError } from '@/lib/api/errors';
import { db } from '@/lib/db';
import { fileColumns, filePasswordExtra, fileRelations, fileSchema, formatFiles } from '@/lib/db/models/file';
import { getFolderWithOwner } from '@/lib/db/models/folder';
import { getUserIdentity } from '@/lib/db/models/user';
import { files, filesToTags, incompleteFiles, tags } from '@/lib/db/schema';
import { containsText } from '@/lib/db/utils';
import { canInteract, canManage } from '@/lib/role';
import { paginationQs } from '@/lib/validation';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { and, eq, exists, inArray, like, ne, notExists, notInArray, or, sql } from 'drizzle-orm';
import z from 'zod';

const searchFieldSchema = z.enum(['name', 'originalName', 'type', 'tags', 'id']);
const responseSchema = z.object({
  page: z.array(fileSchema),
  search: z
    .object({
      field: searchFieldSchema,
      query: z.union([z.string(), z.array(z.string())]),
    })
    .optional(),
  total: z.number().optional(),
  pages: z.number().optional(),
});

export const UNTAGGED = 'untagged';

export type FileSearchField = z.infer<typeof searchFieldSchema>;
export type ApiUserFilesResponse = z.infer<typeof responseSchema>;

export const PATH = '/api/user/files';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description:
            'List, filter, and search files for the authenticated user (or another user if permitted).',
          querystring: paginationQs.extend({
            searchField: searchFieldSchema.optional().default('name'),
            searchQuery: z.string().optional(),
            id: z.string().optional(),
            folder: z.string().optional(),
          }),
          response: {
            200: responseSchema,
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const user = await getUserIdentity(req.query.id ?? req.user.id);

        if (!user || (user.id !== req.user.id && !canInteract(req.user.role, user.role)))
          throw new ApiError(9002);

        const { perpage, searchQuery, searchField, page, filter, favorite, sortBy, order, folder } =
          req.query;

        let folderId: string | undefined;
        if (folder) {
          const targetFolder = await getFolderWithOwner(folder);
          if (!targetFolder || !canManage(req.user, targetFolder.user)) throw new ApiError(9002);

          folderId = targetFolder.id;
        }

        const incompleteIds = db
          .select({ id: sql<string>`${incompleteFiles.metadata}->'file'->>'id'` })
          .from(incompleteFiles)
          .where(and(eq(incompleteFiles.userId, user.id), ne(incompleteFiles.status, 'COMPLETE')));

        // Fork: "untagged" in place of tag ids lists the files with no tag at all.
        const untagged = searchField === 'tags' && searchQuery?.trim() === UNTAGGED;
        let tagIds: string[] = [];
        if (searchQuery && searchField === 'tags' && !untagged) {
          tagIds = searchQuery
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag);

          if (!tagIds.length) return res.send({ page: [], search: { field: searchField, query: tagIds } });

          // Fork: tags are shared by everyone, so a tag only has to exist, not belong to
          // this user. The files themselves are still limited to the user below.
          const tagCount = await db.$count(tags, inArray(tags.id, tagIds));
          if (tagCount !== tagIds.length) throw new ApiError(1032);
        }

        const fileFilter = (file: typeof files) =>
          and(
            eq(file.userId, user.id),
            filter === 'dashboard'
              ? or(
                  like(file.type, 'image/%'),
                  like(file.type, 'video/%'),
                  like(file.type, 'audio/%'),
                  like(file.type, 'text/%'),
                )
              : undefined,
            favorite && filter !== 'all' ? eq(file.favorite, true) : undefined,
            folderId ? eq(file.folderId, folderId) : undefined,
            notInArray(file.id, incompleteIds),
            searchQuery && searchField !== 'tags' ? containsText(file[searchField], searchQuery) : undefined,
            untagged
              ? notExists(
                  db
                    .select({ one: sql`1` })
                    .from(filesToTags)
                    .where(eq(filesToTags.fileId, file.id)),
                )
              : undefined,
          )!;

        const fileRows = await db.query.files.findMany({
          columns: fileColumns,
          extras: searchQuery ? undefined : filePasswordExtra,
          where: {
            RAW: fileFilter,
            AND: tagIds.map((id) => ({ tags: { id } })),
          },
          orderBy: (file, { asc, desc }) => (order === 'asc' ? asc(file[sortBy]) : desc(file[sortBy])),
          offset: (page - 1) * perpage,
          limit: perpage,
          with: fileRelations,
        });
        const filePage = formatFiles(fileRows);

        if (searchQuery && searchField === 'tags') {
          // Fork: a tag filter is paged like the plain list, so it reports its total too.
          const total = await db.$count(
            files,
            and(
              fileFilter(files),
              ...tagIds.map((id) =>
                exists(
                  db
                    .select({ one: sql`1` })
                    .from(filesToTags)
                    .where(and(eq(filesToTags.fileId, files.id), eq(filesToTags.tagId, id))),
                ),
              ),
            ),
          );

          return res.send({
            page: filePage,
            search: { field: searchField, query: untagged ? [UNTAGGED] : tagIds },
            total,
            pages: Math.ceil(total / perpage),
          });
        }

        if (searchQuery)
          return res.send({
            page: filePage,
            search: {
              field: searchField,
              query: searchField === 'tags' ? tagIds : searchQuery,
            },
          });

        const total = await db.$count(files, fileFilter(files));

        return res.send({
          page: filePage,
          total,
          pages: Math.ceil(total / perpage),
        });
      },
    );
  },
  { name: PATH },
);
