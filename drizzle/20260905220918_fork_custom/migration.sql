CREATE TABLE IF NOT EXISTS "FileComment" (
	"id" text PRIMARY KEY,
	"createdAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"fileId" text NOT NULL,
	"visitorId" text NOT NULL,
	"displayName" text NOT NULL,
	"content" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "FileLike" (
	"id" text PRIMARY KEY,
	"createdAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"fileId" text NOT NULL,
	"visitorId" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "FileComment" ALTER COLUMN "createdAt" TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "FileLike" ALTER COLUMN "createdAt" TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "File" ADD COLUMN IF NOT EXISTS "showOnProfile" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "File" ADD COLUMN IF NOT EXISTS "profileCaption" text;--> statement-breakpoint
ALTER TABLE "File" ADD COLUMN IF NOT EXISTS "mentions" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "Tag" ADD COLUMN IF NOT EXISTS "icon" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "FileComment_fileId_idx" ON "FileComment" ("fileId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "FileLike_fileId_idx" ON "FileLike" ("fileId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "FileLike_fileId_visitorId_key" ON "FileLike" ("fileId","visitorId");--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "FileComment" ADD CONSTRAINT "FileComment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "FileLike" ADD CONSTRAINT "FileLike_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
