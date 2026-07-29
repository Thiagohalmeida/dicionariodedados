-- Check if enum exists before dropping, handle if column already text
DO $$
BEGIN
    -- Convert column to text if it's still enum
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'validations' 
        AND column_name = 'origin_detail' 
        AND udt_name = 'origin_detail'
    ) THEN
        ALTER TABLE "validations" ALTER COLUMN "origin_detail" TYPE text USING "origin_detail"::text;
    END IF;
    
    -- Drop enum if it exists
    IF EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'origin_detail'
    ) THEN
        DROP TYPE "public"."origin_detail";
    END IF;
END $$;