-- Update all RecurringRule records to MONTHLY frequency
UPDATE "RecurringRule" SET "frequency" = 'MONTHLY' WHERE "frequency" != 'MONTHLY';

-- AlterEnum: remove all values except MONTHLY
ALTER TYPE "RecurrenceFrequency" RENAME TO "RecurrenceFrequency_old";
CREATE TYPE "RecurrenceFrequency" AS ENUM ('MONTHLY');
ALTER TABLE "RecurringRule" ALTER COLUMN "frequency" DROP DEFAULT;
ALTER TABLE "RecurringRule" ALTER COLUMN "frequency" TYPE "RecurrenceFrequency" USING ("frequency"::text::"RecurrenceFrequency");
ALTER TABLE "RecurringRule" ALTER COLUMN "frequency" SET DEFAULT 'MONTHLY'::RecurrenceFrequency;
DROP TYPE "RecurrenceFrequency_old";
