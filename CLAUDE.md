# miyav.tv — Zipline fork

A fork of [Zipline](https://github.com/diced/zipline) that serves miyav.tv.
Fastify + React Router + Mantine 9, built with vite/tsup. As of `eabd12a2` the
fork tracks upstream **past the Prisma → Drizzle-ORM rewrite (#1128)** — the DB
layer is Drizzle (`src/lib/db/schema.ts` + `relations.ts` + `drizzle/`), not
Prisma. Do not reintroduce `@/lib/db`'s old `prisma` client; use `db` (the
Drizzle client) and the relational query builder (`db.query.*`).

Upstream is tracked to **`862eed76` (fix: oidc avatar parsing)**, merged as
`8402ba86` — the tip of `diced/zipline` trunk at 2026-09-12.

The fork's own changes sit on top of upstream on the `trunk` branch. Keep them
small and separately committed — every upstream merge has to carry them forward.

To pick up new upstream work: the `upstream` remote exists on vps4 but not in
this clone, so fetch it by URL and merge here, then push and deploy as below.

```sh
git fetch https://github.com/diced/zipline.git trunk
git merge --no-commit --no-ff FETCH_HEAD   # inspect before committing
```

Current fork features (folded onto Drizzle in merge `eabd12a2`):

- public profiles at `/<username>` (SSR in `src/client/ssr-profile/`, route in
  `src/server/startup/routes.ts`)
- reserved-username checks (`src/lib/reservedRoutes.ts`; error code **1071** —
  1070 is upstream's passkey error)
- Clip Manager installers at `/download`, offered on the homepage
- file profile fields (`showOnProfile`, `profileCaption`, `mentions`), file
  likes & comments, tag icons, and **global/shared tags** — all defined in
  `schema.ts`/`relations.ts` and created by migration `20260905220918_fork_custom`
- `react/react-compiler` is set to **warn** (not error) in `.oxlintrc.json`, so
  the fork's sync-from-props effects don't fail the lint gate

None of this is on the `izgara/zipline-modded` GitHub remote — that mirror
stopped at upstream v4.7.0 and everything since lives only on vps4. Pushing there
publishes it, so it is the owner's call, not part of a deploy.

## Where it runs

**vps4, `/opt/zipline-src` (source) and `/opt/zipline` (deployment).** Not on
this PC. There is no nginx in front — cloudflared tunnels `miyav.tv` straight to
`localhost:3000`, configured in `/etc/cloudflared/config.yml`.

## Deploying a change

The image tag is the short commit SHA, so the running container always names the
code it came from.

```sh
ssh vps4 'cd /opt/zipline-src && git rev-parse --short=8 HEAD'          # -> <sha>
ssh vps4 'cd /opt/zipline-src && sudo docker build --build-arg ZIPLINE_GIT_SHA=$(git rev-parse HEAD) -t zipline-profile-pages:<sha> .'
ssh vps4 'cd /opt/zipline && sudo sed -i "s|image: zipline-profile-pages:.*|image: zipline-profile-pages:<sha>|" docker-compose.yml'
ssh vps4 'cd /opt/zipline && sudo docker compose up -d zipline'
ssh vps4 'sudo docker logs --tail 30 zipline-zipline-1'
```

`pnpm run build` runs oxfmt (`--check`), oxlint, `tsc` and the vite builds in
that order, so **format, lint or type errors fail the docker build** — that is
the gate. Format fires first (fast); fix it with `pnpm exec oxfmt <files>`.
Worth reading your own diff for narrowing mistakes before spending the build.

Smoke test afterwards: `/` should 301, `/dashboard` and `/auth/login` should 200,
a public profile `/<username>` should 200.

## Database (Drizzle)

Schema is `src/lib/db/schema.ts` (+ `relations.ts`); migrations live in
`drizzle/<timestamp>_<name>/migration.sql` (+ `snapshot.json`), applied
automatically on startup by `src/lib/db/migration/`. After editing the schema,
generate a migration (no host node — run it in a container):

```sh
ssh vps4 'cd /opt/zipline-src && sudo docker run --rm -v /opt/zipline-src:/app -w /app node:24-alpine3.23 sh -c "corepack enable && pnpm install --frozen-lockfile && pnpm exec drizzle-kit generate --name <name>" && sudo chown -R ubuntu:ubuntu drizzle && sudo rm -rf node_modules'
```

Migrating an existing **Prisma** DB to Drizzle: startup adopts it only if its
`_prisma_migrations` exactly matches upstream's expected stock history
(`src/lib/db/migration/prisma-history.ts`). This fork's five extra prisma
migration rows were deleted from the live `zipline_v4` before the first Drizzle
boot; `20260905220918_fork_custom` is written **idempotently** (`IF NOT EXISTS`,
FK `DO`-blocks) so it no-ops on that already-migrated live DB and fully builds a
fresh one. Dump before any DB change: `docker exec zipline-postgres-1 pg_dump -U
postgres -d zipline_v4 -Fc > backup.dump`.

## Routing gotcha

Usernames are served at the root as `/<username>`, so any new root-level route
must also be added to `RESERVED_ROUTES` in `src/lib/reservedRoutes.ts` —
otherwise a user can register that name and shadow it, or lose their own profile
to it. Check no existing user already holds the name:

```sh
ssh vps4 "sudo docker exec zipline-postgres-1 psql -U postgres -d zipline_v4 -tAc \"select username from \\\"User\\\" where lower(username) = 'name';\""
```

## The Clip Manager download

`src/server/plugins/downloads.ts` serves `/opt/zipline/public/downloads` (the
`public` volume the compose file mounts) at `/download/`, publicly and without
auth. The homepage card is
`src/components/pages/dashboard/parts/ClipManagerCard.tsx`.

Releases deliberately need **no** code change here: the button points at the
fixed name `MiyavClipManager-Setup.exe`, a symlink each release re-points, and
the version, size and alternate packages are read from `latest.json` next to the
files. If that manifest goes missing the button still works, it just loses its
labels.

## Working with vps4

- **`scp` is broken** — vps4's SFTP subsystem is down and modern scp defaults to
  it. Use `scp -O` (legacy protocol) or `ssh vps4 'sudo tee path > /dev/null' < file`.
- The deploy remote is named **`vps4`**, and `trunk` tracks it, so a plain
  `git push` deploys. Pushing there updates vps4's working tree directly
  (`receive.denyCurrentBranch = updateInstead`), so the loop is: edit locally,
  `git push`, then build over ssh. It refuses to move a dirty tree — don't edit
  on vps4 directly.
