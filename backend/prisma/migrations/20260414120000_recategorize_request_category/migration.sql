-- Recategorize RequestCategory enum: 8 old values → 12 new values
-- Existing CLEANING and STRUCTURAL are remapped to OTHER (closest fit).
-- Existing PLUMBING, ELECTRICAL, HVAC, FURNITURE, SAFETY, OTHER are preserved.
-- New values added: SILICONE, WALLPAPER, PAINTING, LIGHTING, DOOR, APPLIANCE.

-- Step 1. Remap existing rows that use values being dropped.
-- Safe because CLEANING and STRUCTURAL still exist in the current enum at this point.
UPDATE "facility_requests"
   SET "category" = 'OTHER'
 WHERE "category" IN ('CLEANING', 'STRUCTURAL');

UPDATE "recurring_schedules"
   SET "category" = 'OTHER'
 WHERE "category" IN ('CLEANING', 'STRUCTURAL');

-- Step 2. Create new enum type with the 12 target values.
CREATE TYPE "RequestCategory_new" AS ENUM (
  'SILICONE',
  'WALLPAPER',
  'PAINTING',
  'FURNITURE',
  'LIGHTING',
  'PLUMBING',
  'DOOR',
  'APPLIANCE',
  'HVAC',
  'ELECTRICAL',
  'SAFETY',
  'OTHER'
);

-- Step 3. Drop defaults before altering column type (PostgreSQL requirement).
ALTER TABLE "facility_requests"    ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "recurring_schedules"  ALTER COLUMN "category" DROP DEFAULT;

-- Step 4. Alter column types with explicit USING cast.
-- All remaining values (PLUMBING, ELECTRICAL, HVAC, FURNITURE, SAFETY, OTHER)
-- exist in both the old and new enum, so the text cast succeeds.
ALTER TABLE "facility_requests"
  ALTER COLUMN "category" TYPE "RequestCategory_new"
  USING ("category"::text::"RequestCategory_new");

ALTER TABLE "recurring_schedules"
  ALTER COLUMN "category" TYPE "RequestCategory_new"
  USING ("category"::text::"RequestCategory_new");

-- Step 5. Restore defaults using the new enum.
ALTER TABLE "facility_requests"    ALTER COLUMN "category" SET DEFAULT 'OTHER';
ALTER TABLE "recurring_schedules"  ALTER COLUMN "category" SET DEFAULT 'OTHER';

-- Step 6. Drop the old enum type and rename the new one to take its place.
DROP TYPE "RequestCategory";
ALTER TYPE "RequestCategory_new" RENAME TO "RequestCategory";
