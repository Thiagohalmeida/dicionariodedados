ALTER TABLE "validations" ALTER COLUMN "origin_detail" TYPE text USING "origin_detail"::text;
DROP TYPE "public"."origin_detail";