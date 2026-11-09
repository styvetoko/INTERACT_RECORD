-- J2 : vitrine des artistes et back-office.
-- Les colonnes avatarUrl et bannerUrl sont remplacées par des images traitées (MediaImage).
-- Elles n'ont jamais été alimentées par l'API (vérifié : 0 ligne non nulle en développement).

-- CreateEnum
CREATE TYPE "public"."ImagePurpose" AS ENUM ('ARTIST_AVATAR', 'ARTIST_BANNER');

-- AlterTable
ALTER TABLE "public"."Artist" DROP COLUMN "avatarUrl",
DROP COLUMN "bannerUrl",
ADD COLUMN     "avatarImageId" UUID,
ADD COLUMN     "bannerImageId" UUID,
ADD COLUMN     "socialLinks" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "searchName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "tagline" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "suspendedReason" TEXT;

-- CreateTable
CREATE TABLE "public"."ArtistBookingProfile" (
    "artistId" UUID NOT NULL,
    "isBookable" BOOLEAN NOT NULL DEFAULT false,
    "priceMinXaf" INTEGER,
    "priceMaxXaf" INTEGER,
    "travelCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "serviceTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "technicalRider" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistBookingProfile_pkey" PRIMARY KEY ("artistId")
);

-- CreateTable
CREATE TABLE "public"."MediaImage" (
    "id" UUID NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "purpose" "public"."ImagePurpose" NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "dominantColor" TEXT NOT NULL,
    "placeholder" TEXT NOT NULL,
    "variants" JSONB NOT NULL,
    "bytesTotal" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaImage_ownerUserId_idx" ON "public"."MediaImage"("ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_avatarImageId_key" ON "public"."Artist"("avatarImageId");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_bannerImageId_key" ON "public"."Artist"("bannerImageId");

-- CreateIndex
CREATE INDEX "Artist_searchName_idx" ON "public"."Artist"("searchName");

-- CreateIndex
CREATE INDEX "Artist_createdAt_id_idx" ON "public"."Artist"("createdAt", "id");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_id_idx" ON "public"."AuditLog"("createdAt", "id");

-- AddForeignKey
ALTER TABLE "public"."Artist" ADD CONSTRAINT "Artist_avatarImageId_fkey" FOREIGN KEY ("avatarImageId") REFERENCES "public"."MediaImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Artist" ADD CONSTRAINT "Artist_bannerImageId_fkey" FOREIGN KEY ("bannerImageId") REFERENCES "public"."MediaImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArtistBookingProfile" ADD CONSTRAINT "ArtistBookingProfile_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MediaImage" ADD CONSTRAINT "MediaImage_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Remplissage du nom de recherche des artistes existants (accents courants retirés)
UPDATE "public"."Artist"
SET "searchName" = lower(translate("stageName",
  'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÇçÑñ',
  'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'));
