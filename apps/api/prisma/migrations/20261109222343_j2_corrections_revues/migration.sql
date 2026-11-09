-- J2, corrections après les revues de sécurité et de qualité.
-- 1. Les images appartiennent au profil artiste ; l'auteur de l'envoi est conservé pour la traçabilité.
--    La colonne ownerUserId est renommée (aucune donnée perdue) puis rendue facultative.

-- AlterTable : User
ALTER TABLE "public"."User" ADD COLUMN "suspendedById" UUID;

-- AlterTable : Artist
ALTER TABLE "public"."Artist" ADD COLUMN "searchCity" TEXT NOT NULL DEFAULT '';
CREATE INDEX "Artist_searchCity_idx" ON "public"."Artist"("searchCity");
UPDATE "public"."Artist"
SET "searchCity" = lower(translate("city",
  'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÇçÑñ',
  'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'));

-- AlterTable : MediaImage
ALTER TABLE "public"."MediaImage" DROP CONSTRAINT "MediaImage_ownerUserId_fkey";
DROP INDEX "public"."MediaImage_ownerUserId_idx";
ALTER TABLE "public"."MediaImage" RENAME COLUMN "ownerUserId" TO "uploadedById";
ALTER TABLE "public"."MediaImage" ALTER COLUMN "uploadedById" DROP NOT NULL;
ALTER TABLE "public"."MediaImage" ADD COLUMN "artistId" UUID;
UPDATE "public"."MediaImage" m SET "artistId" = a."id"
FROM "public"."Artist" a WHERE a."avatarImageId" = m."id" OR a."bannerImageId" = m."id";
CREATE INDEX "MediaImage_artistId_idx" ON "public"."MediaImage"("artistId");
CREATE INDEX "MediaImage_uploadedById_idx" ON "public"."MediaImage"("uploadedById");
CREATE INDEX "MediaImage_createdAt_idx" ON "public"."MediaImage"("createdAt");
ALTER TABLE "public"."MediaImage" ADD CONSTRAINT "MediaImage_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."MediaImage" ADD CONSTRAINT "MediaImage_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable : file des suppressions de fichiers
CREATE TABLE "public"."StorageDeletion" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StorageDeletion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StorageDeletion_key_key" ON "public"."StorageDeletion"("key");
CREATE INDEX "StorageDeletion_nextAttemptAt_idx" ON "public"."StorageDeletion"("nextAttemptAt");
