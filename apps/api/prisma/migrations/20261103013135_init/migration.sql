-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('FAN', 'ARTIST', 'MANAGER', 'ADMIN', 'MODERATOR', 'FINANCE', 'SUPPORT', 'EDITOR');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETION_PENDING');

-- CreateEnum
CREATE TYPE "public"."Locale" AS ENUM ('fr', 'en');

-- CreateEnum
CREATE TYPE "public"."ContentFormat" AS ENUM ('AUDIO', 'VIDEO', 'IMAGE', 'TEXT', 'LIVE', 'PHYSICAL_WORK', 'SERVICE');

-- CreateEnum
CREATE TYPE "public"."ArtistType" AS ENUM ('INDIVIDUAL', 'COLLECTIVE');

-- CreateEnum
CREATE TYPE "public"."ArtistMemberRole" AS ENUM ('OWNER', 'MEMBER', 'MANAGER');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "locale" "public"."Locale" NOT NULL DEFAULT 'fr',
    "country" TEXT NOT NULL DEFAULT 'CM',
    "city" TEXT,
    "roles" "public"."Role"[] DEFAULT ARRAY['FAN']::"public"."Role"[],
    "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "pinHash" TEXT,
    "kycLevel" INTEGER NOT NULL DEFAULT 0,
    "birthYear" INTEGER,
    "deletionRequestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OtpChallenge" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "deviceName" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Discipline" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "allowedFormats" "public"."ContentFormat"[],
    "metadataSchema" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discipline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" UUID NOT NULL,
    "disciplineId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserInterest" (
    "userId" UUID NOT NULL,
    "disciplineId" UUID NOT NULL,

    CONSTRAINT "UserInterest_pkey" PRIMARY KEY ("userId","disciplineId")
);

-- CreateTable
CREATE TABLE "public"."Artist" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "stageName" TEXT NOT NULL,
    "type" "public"."ArtistType" NOT NULL DEFAULT 'INDIVIDUAL',
    "country" TEXT NOT NULL DEFAULT 'CM',
    "city" TEXT NOT NULL,
    "bioFr" TEXT,
    "bioEn" TEXT,
    "avatarUrl" TEXT,
    "bannerUrl" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ArtistMember" (
    "artistId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "public"."ArtistMemberRole" NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistMember_pkey" PRIMARY KEY ("artistId","userId")
);

-- CreateTable
CREATE TABLE "public"."ArtistDiscipline" (
    "artistId" UUID NOT NULL,
    "disciplineId" UUID NOT NULL,

    CONSTRAINT "ArtistDiscipline_pkey" PRIMARY KEY ("artistId","disciplineId")
);

-- CreateTable
CREATE TABLE "public"."ArtistCategory" (
    "artistId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,

    CONSTRAINT "ArtistCategory_pkey" PRIMARY KEY ("artistId","categoryId")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "public"."User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "OtpChallenge_phone_createdAt_idx" ON "public"."OtpChallenge"("phone", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "public"."Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Discipline_slug_key" ON "public"."Discipline"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Category_disciplineId_slug_key" ON "public"."Category"("disciplineId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_slug_key" ON "public"."Artist"("slug");

-- CreateIndex
CREATE INDEX "Artist_city_idx" ON "public"."Artist"("city");

-- CreateIndex
CREATE INDEX "ArtistMember_userId_idx" ON "public"."ArtistMember"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "public"."AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "public"."AuditLog"("actorId");

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Category" ADD CONSTRAINT "Category_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "public"."Discipline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserInterest" ADD CONSTRAINT "UserInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserInterest" ADD CONSTRAINT "UserInterest_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "public"."Discipline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArtistMember" ADD CONSTRAINT "ArtistMember_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArtistMember" ADD CONSTRAINT "ArtistMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArtistDiscipline" ADD CONSTRAINT "ArtistDiscipline_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArtistDiscipline" ADD CONSTRAINT "ArtistDiscipline_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "public"."Discipline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArtistCategory" ADD CONSTRAINT "ArtistCategory_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArtistCategory" ADD CONSTRAINT "ArtistCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
