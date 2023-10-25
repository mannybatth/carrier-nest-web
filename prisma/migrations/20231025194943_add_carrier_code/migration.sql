-- DropIndex
DROP INDEX "Carrier_name_email_idx";

-- AlterTable to add the carrierCode column without NOT NULL constraint temporarily
ALTER TABLE "Carrier" ADD COLUMN "carrierCode" TEXT;

-- Create a sequence for generating unique numbers
CREATE SEQUENCE carrier_code_seq;

-- Create a function to convert integers to base62
CREATE OR REPLACE FUNCTION int_to_base62(bigint) RETURNS text AS $$
DECLARE
    chars char(62) := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    ret text := '';
BEGIN
    IF $1 = 0 THEN
        RETURN '0';
    END IF;
    WHILE $1 > 0 LOOP
        ret := substring(chars from ($1 % 62 + 1)::integer for 1) || ret;
        $1 := $1 / 62;
    END LOOP;
    RETURN ret;
END;
$$ LANGUAGE plpgsql;

-- Update carrierCode for rows where it's NULL
DO $$
DECLARE
   rec RECORD;
BEGIN
   FOR rec IN (SELECT "id" FROM "Carrier" WHERE "carrierCode" IS NULL) LOOP
      UPDATE "Carrier" SET "carrierCode" = int_to_base62(nextval('carrier_code_seq')) WHERE "id" = rec.id;
   END LOOP;
END $$;

-- Now set the carrierCode column to NOT NULL
ALTER TABLE "Carrier" ALTER COLUMN "carrierCode" SET NOT NULL;

-- AlterTable to make phone column in Driver table NOT NULL
-- (Ensure you've handled any NULL values in this column before running this)
ALTER TABLE "Driver" ALTER COLUMN "phone" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Carrier_carrierCode_key" ON "Carrier"("carrierCode");

-- CreateIndex
CREATE INDEX "Carrier_name_email_carrierCode_idx" ON "Carrier"("name", "email", "carrierCode");

-- Optionally, drop the sequence and function if not needed anymore
DROP SEQUENCE carrier_code_seq;
DROP FUNCTION int_to_base62(bigint);
