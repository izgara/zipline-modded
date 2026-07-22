-- AlterTable
ALTER TABLE "public"."Tag" ADD COLUMN     "icon" TEXT;

-- CreateTable
CREATE TABLE "public"."FileLike" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,

    CONSTRAINT "FileLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FileLike_fileId_idx" ON "public"."FileLike"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "FileLike_fileId_visitorId_key" ON "public"."FileLike"("fileId", "visitorId");

-- AddForeignKey
ALTER TABLE "public"."FileLike" ADD CONSTRAINT "FileLike_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "public"."File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
