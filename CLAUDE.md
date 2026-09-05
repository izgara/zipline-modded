# miyav.tv — Zipline fork

A fork of [Zipline](https://github.com/diced/zipline) v4.7.0 that serves
miyav.tv. Fastify + React Router + Mantine 9, built with vite/tsup.

The fork's own commits sit on top of upstream v4.7.0 on the `trunk` branch. Keep
them small and separately committed — every upstream merge has to carry them
forward.

Current fork commits:

- `9eb235c5` public profiles at `/<username>` instead of `/profile/<username>`
- `5981c52c` reject usernames that collide with a root-level route
- `f91b6461` serve Clip Manager installers at `/download`, offer them on the homepage

None of them exist on the `izgara/zipline-modded` GitHub remote — that mirror
stopped at upstream v4.7.0 and everything since has lived only on vps4. Pushing
them there publishes them, so it is the owner's call, not something to do as
part of a deploy.

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

`pnpm run build` runs eslint, `tsc` and the vite builds, so **type errors fail
the docker build** — that is the gate, and it fires late (about 35 s in). Worth
reading your own diff for narrowing mistakes before spending the build.

Smoke test afterwards: `/` should 301, `/dashboard` and `/auth/login` should 200.

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
