-- La suspension retient si elle a été prononcée par un administrateur (verrou figé à la décision).
ALTER TABLE "public"."User" ADD COLUMN "suspendedByAdmin" BOOLEAN NOT NULL DEFAULT false;
-- Prudence : les suspensions déjà en cours sont traitées comme décidées par un administrateur.
UPDATE "public"."User" SET "suspendedByAdmin" = true WHERE "status" = 'SUSPENDED';
