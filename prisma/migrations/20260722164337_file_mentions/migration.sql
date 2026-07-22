-- AlterTable
ALTER TABLE "public"."File" ADD COLUMN     "mentions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
