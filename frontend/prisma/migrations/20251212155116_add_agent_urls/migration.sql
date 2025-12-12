-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "chainOfThoughtEndpoint" TEXT,
ADD COLUMN     "url" TEXT NOT NULL DEFAULT '';

-- Update existing agents to have a default URL
UPDATE "Agent" SET "url" = 'https://localhost:4000' WHERE "url" = '';

-- Remove the default constraint after updating existing records
ALTER TABLE "Agent" ALTER COLUMN "url" DROP DEFAULT;