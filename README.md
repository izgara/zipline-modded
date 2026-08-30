<div align="center">
  <img src="https://raw.githubusercontent.com/diced/zipline/trunk/public/zipline_small.png"/>

# zipline-modded

A fork of [Zipline](https://github.com/diced/zipline) — the next generation ShareX / file upload server — with an added **public profile page** feature for showcasing and sharing video clips, Medal.tv-style.

Based on **Zipline v4.7.0**. Original project by [diced](https://github.com/diced) and contributors, licensed [MIT](LICENSE).

</div>

---

## What's different in this fork

Everything Zipline already does (upload, folders, tags, URL shortening, OAuth2, 2FA, S3, etc. — see [Core Zipline features](#core-zipline-features) below) still works exactly the same. On top of that, this fork adds:

### 🎬 Public Profile Pages

Every user gets a public, shareable profile at `/profile/<username>` — a curated showcase of their video clips that anyone can browse without an account, similar to a Medal.tv or Twitch clips page.

- **Curated clips** — only files you explicitly mark "Show on profile" appear; everything else in your library stays private.
- **Home / Favorites / Stats tabs** — Home lists all shared clips (paginated, sortable by newest/views/likes), Favorites shows your starred clips, Stats shows total views/likes and a views-by-tag breakdown chart.
- **Captions** — an optional caption shown instead of the raw filename.
- **Tags** — shared/global across all users (a game or category tag created by one person shows up for everyone), with optional icons, and a searchable filter on the profile page.
- **Mentions** — tag other people who appear in a clip (they don't need a Zipline account). Visitors can search a profile by a mentioned person's name to find every clip they're tagged in.
- **Likes & comments** — visitors can like clips and leave anonymous named comments, no login required.
- **Share links & embeds** — a one-click "copy share link" button, and clips embed nicely in Discord/social previews (title, caption, avatar).
- **Fullscreen lightbox** — clicking a clip opens a fullscreen viewer with keyboard navigation (arrow keys) between clips, plus the comments panel.

### ⚡ Quick-edit controls

You don't need to open the full "Edit Details" modal to tag or caption a clip. Both the dashboard file grid and your own public profile page (while logged in) have inline controls directly on each clip card:

- A tag/game picker (top-left) — click to check/uncheck from the shared tag list.
- A mentions picker — a searchable, clickable list of people you've mentioned before, or type a new name.
- A caption editor (pencil icon) — edit or add a caption without leaving the grid.
- A "show on profile" toggle — add or remove a clip from your public profile with one click.

### How to use it

1. Upload a video clip as you normally would.
2. In the dashboard Files grid, click the profile icon on the clip's thumbnail (or open **Edit Details**) to toggle **Show on profile**.
3. Optionally set a caption, tag it with a game/category, and mention anyone who appears in it — either through **Edit Details** or the quick-edit icons directly on the card.
4. Visit `/profile/<your-username>` to see your public page. Share the link — visitors can browse, filter by tag or mentioned person, like, and comment without needing an account.
5. While logged in, your own profile page has the same quick-edit controls as the dashboard, so you can manage clips without switching back and forth.

---

## Core Zipline features

- Setup Quickly: [Get Started with Docker](https://zipline.diced.sh/docs/get-started/docker)
- Configure
- Upload any file
- Folders
- Tags
- URL shortening
- Embeds
- Discord Webhooks
- HTTP Webhooks
- OAuth2
- 2FA
- Passkeys
- Password Protection
- Image Compression
- Video Thumbnails
- API
- PWA
- Partial Uploads
- Invites
- Quotas
- Custom Themes
- ... and more!

For full documentation on everything inherited from upstream Zipline, see [zipline.diced.sh](https://zipline.diced.sh) — this fork doesn't change any of that behavior, it only adds the profile pages feature described above.

# Usage

## Install and Run with Docker

This fork isn't published to a public container registry, so you build the image yourself from source:

```bash
git clone https://github.com/izgara/zipline-modded.git
cd zipline-modded
docker build -t zipline-modded .
```

Then use it in your `docker-compose.yml`:

```yaml
services:
  postgresql:
    image: postgres:16
    restart: unless-stopped
    env_file:
      - .env
    environment:
      POSTGRES_USER: ${POSTGRESQL_USER:-zipline}
      POSTGRES_PASSWORD: ${POSTGRESQL_PASSWORD:?POSTGRESSQL_PASSWORD is required}
      POSTGRES_DB: ${POSTGRESQL_DB:-zipline}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD', 'pg_isready', '-U', 'zipline']
      interval: 10s
      timeout: 5s
      retries: 5

  zipline:
    image: zipline-modded
    ports:
      - '3000:3000'
    env_file:
      - .env
    environment:
      - DATABASE_URL=postgres://${POSTGRESQL_USER:-zipline}:${POSTGRESQL_PASSWORD}@postgresql:5432/${POSTGRESQL_DB:-zipline}
    depends_on:
      postgresql:
        condition: service_healthy
    volumes:
      - './uploads:/zipline/uploads'
      - './public:/zipline/public'
      - './themes:/zipline/themes'
    healthcheck:
      test: ['CMD', 'wget', '-q', '--spider', 'http://localhost:3000/api/healthcheck']
      interval: 15s
      timeout: 2s
      retries: 2

volumes:
  pgdata:
```

> [!WARNING]
> Zipline requires a cpu with AVX support. We don't provide binaries or images that have support for non-AVX cpus

### Volumes

- `./uploads` - The folder where all the user uploads are stored (the default is `./uploads`)
- `./public` - The folder where all the public assets are stored (must mount to `/zipline/public`)
- `./themes` - The folder where all the custom themes are stored (must mount to `/zipline/themes`)

Temporary files default to `./uploads/.tmp`. Setting `CORE_TEMP_DIRECTORY` to another filesystem, such as tmpfs, can reduce local upload performance.

### Generating Secrets

```bash
echo "POSTGRESQL_PASSWORD=$(openssl rand -base64 42 | tr -dc A-Za-z0-9 | cut -c -32 | tr -d '\n')" > .env
echo "CORE_SECRET=$(openssl rand -base64 42 | tr -dc A-Za-z0-9 | cut -c -32 | tr -d '\n')" >> .env
```

Without the `CORE_SECRET` environment variable, Zipline will not start.

### Changing where uploads are stored

By default, Zipline will default to the `./uploads` folder, which is also reflected in the `docker-compose.yml` above. If you want to change this, you can set the `DATASOURCE_LOCAL_DIRECTORY` environment variable to a different path.

```bash
DATASOURCE_LOCAL_DIRECTORY=/path/to/your/local/files
# or relative to the working directory
DATASOURCE_LOCAL_DIRECTORY=./relative/path/to/files
```

> [!NOTE]  
> Remember to change volume mappings in the docker-compose.yml file if you change this.

### Changing the port and hostname

By default, Zipline binds to `0.0.0.0:3000`, which is also reflected in the `docker-compose.yml` above. If you want to change this, you can set the `CORE_PORT` and `CORE_HOSTNAME` environment variables to a different port and hostname.

```bash
CORE_PORT=80
CORE_HOSTNAME=localhost
```

> [!NOTE]
> If you change the port, you will need to update the `ports` section in the `docker-compose.yml` file.

### Using S3

If you want to use S3 instead of the local filesystem, you can set the following environment variables:

```bash
DATASOURCE_TYPE=s3

DATASOURCE_S3_ACCESS_KEY_ID=access_key_id
DATASOURCE_S3_SECRET_ACCESS_KEY=secret
DATASOURCE_S3_BUCKET=zipline
DATASOURCE_S3_REGION=us-west-2
```

For more information, like other providers, see the [docs](https://zipline.diced.sh/docs/config/datasource#s3-datasource).

### Starting Zipline

Simply run the following command to start the server:

```bash
docker compose up -d
```

You should be able to access the website at `http://localhost:3000` or the port you specified.

### Redeploying after pulling updates

Since there's no public image, rebuild after pulling changes:

```bash
git pull
docker build -t zipline-modded .
docker compose up -d
```

## Manual Install

See [upstream docs](https://zipline.diced.sh/docs/get-started/source) for the general process — it's unchanged in this fork, aside from the extra profile-page routes and the `File.mentions` / `File.profileCaption` / `File.showOnProfile` database columns, which are applied automatically by the normal migration process on startup.

# Migrating from v3

Zipline v4 was a complete rewrite, and as such, there is no upgrade path from v3 to v4. You will need to export your data from v3 and import it into v4. This process is made easier by the fact that v4 has a built-in importer to import data from v3.

See [migration](https://zipline.diced.sh/docs/migrate) for more information.

# Development

Here's how to set this fork up for development.

#### Nix

If you have [Nix](https://nixos.org) and [direnv](https://direnv.net/) installed, you can simply cd into the cloned directory and run the following command:

```bash
direnv allow
```

After doing so, your shell will be setup for development.

If you aren't using direnv, you can run the following command to enter the nix shell:

```bash
nix develop --no-pure-eval
```

Useful commands regarding the postgres server:

| Command         | Description                                   |
| --------------- | ---------------------------------------------- |
| `pgup`          | Starts the postgres server in the background. |
| `pg_ctl status` | See if the postgres server is running         |
| `minioup`       | Start a Minio server for testing S3           |
| `downall`       | Stops any running postgres or minio service.  |

After familiarizing yourself with the environment, you can continue below (skipping the prerequisites since they are already installed).

#### Prerequisites

- nodejs (lts -> 20.x, 22.x)
- pnpm (10.x)
- a postgresql server

#### Setup

You should probably use a `.env` file to manage your environment variables, here is an example .env file with every available environment variable:

```bash
DEBUG=zipline

# required
CORE_SECRET="a secret that is 32 characters long"

# required
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zipline?schema=public"

# these are optional
CORE_PORT=3000
CORE_HOSTNAME=0.0.0.0

# one of these is required
DATASOURCE_TYPE="local"
# DATASOURCE_TYPE="s3"

# if DATASOURCE_TYPE=local
DATASOURCE_LOCAL_DIRECTORY="/path/to/your/local/files"

# if DATASOURCE_TYPE=s3
# DATASOURCE_S3_ACCESS_KEY_ID="your-access-key-id"
# DATASOURCE_S3_SECRET_ACCESS_KEY="your-secret-access-key"
# DATASOURCE_S3_REGION="your-region"
# DATASOURCE_S3_BUCKET="your-bucket"
# DATASOURCE_S3_ENDPOINT="your-endpoint"
# ^ if using a custom endpoint other than aws s3
```

Install dependencies:

```bash
pnpm install
```

Finally you may start the development server:

```bash
pnpm dev
```

If you wish to build the production version, you can run the following command:

```bash
pnpm build
```

And to run the production version:

```bash
pnpm start
```

#### Making changes to the database schema

Zipline uses [prisma](https://www.prisma.io/) as its ORM, and as such, you will need to use the prisma CLI to facilitate any changes to the database schema.

Once you have made a change to `prisma.schema`, you can run the script `db:migrate` to generate a migration file. This script doesn't apply the migration, as Zipline handles applying migrations itself on startup.

```bash
pnpm db:migrate
```

#### Linting and Formatting

Zipline will fail to build unless the code is properly formatted and linted. To format the code, you can run the following command:

```bash
pnpm validate
```

# Changelog

All notable changes made in this fork, on top of Zipline v4.7.0. Dates are in `YYYY-MM-DD`.

## 2026-07-23

- Made shared tags global across all users instead of per-user (a game/category tag created by one person is now usable by everyone).
- Added quick-edit controls directly on dashboard file cards: tag picker, mentions picker, caption editor, and a "show on profile" toggle — no need to open the Edit Details modal.
- Fixed videos auto-starting muted when opened from the dashboard (now matches the profile page's playback behavior).
- Fixed the caption edit button being unclickable because the mentions quick-edit icon was invisibly overlapping it.
- Added a "View Profile" link to the account menu.
- Brought the same quick-edit controls (tags, mentions, caption, visibility) to the owner's own public profile page, when logged in.
- Fixed profile URLs and avatars being case-sensitive (`/profile/popcorn` now resolves the same as `/profile/Popcorn`).

## 2026-07-22

- Added public profile pages (`/profile/<username>`) with a curated video clip showcase.
- Added the `File.showOnProfile`, `File.profileCaption`, and `File.mentions` fields and matching migrations.
- Added clip captions, tag browsing, and a Medal.tv-style profile redesign.
- Added share links, a fullscreen clip lightbox with keyboard navigation, and anonymous clip comments.
- Added tag logo uploads and anonymous, sortable clip likes.
- Merged the separate Clips tab into Home; added a Favorites tab and a Stats tab (views/likes totals, views-by-tag chart).
- Paginated the Home clip grid.
- Added clip mentions (tag people who appear in a clip) with profile search, later made searchable/clickable to match the tag filter's UX.
- Various fixes: lightbox video sizing/letterboxing, profile-page Discord embed formatting, SSR crash on the profile page, "Edit Profile" button routing, and a pinned `tzdata` bump for the Docker build.

# Documentation

Core Zipline documentation is located at [zipline.diced.sh](https://zipline.diced.sh) and the source is at [github.com/diced/zipline-docs](https://github.com/diced/zipline-docs). It does not cover the profile-pages feature described above, since that's specific to this fork.

# Credits

This project is a fork of [diced/zipline](https://github.com/diced/zipline), created and maintained by [diced](https://github.com/diced) and its contributors. All core upload/sharing functionality, and the vast majority of the codebase, is their work — this fork only adds the public profile pages feature and related quick-edit tooling on top. Licensed under [MIT](LICENSE), same as upstream.

# Security

Security issues are taken seriously. For more information see the [security policy](SECURITY.md).
