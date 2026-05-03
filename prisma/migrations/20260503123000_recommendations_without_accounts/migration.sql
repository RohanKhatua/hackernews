-- Keep recommendation storage subscriber/browser based instead of requiring reader accounts.
ALTER TABLE "Subscriber" ADD COLUMN IF NOT EXISTS "recommendationToken" TEXT;
UPDATE "Subscriber"
SET "recommendationToken" = md5(random()::text || clock_timestamp()::text)
WHERE "recommendationToken" IS NULL;
ALTER TABLE "Subscriber" ALTER COLUMN "recommendationToken" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Subscriber_recommendationToken_key" ON "Subscriber"("recommendationToken");

ALTER TABLE "StoryInteraction" ADD COLUMN IF NOT EXISTS "subscriberId" TEXT;
ALTER TABLE "StoryInteraction" ADD COLUMN IF NOT EXISTS "readerId" TEXT;
UPDATE "StoryInteraction"
SET "readerId" = COALESCE("readerId", "userId", md5(random()::text || clock_timestamp()::text))
WHERE "readerId" IS NULL;
ALTER TABLE "StoryInteraction" ALTER COLUMN "readerId" SET NOT NULL;
ALTER TABLE "StoryInteraction" ALTER COLUMN "userId" DROP NOT NULL;

DROP INDEX IF EXISTS "StoryInteraction_userId_storyId_type_key";
DROP INDEX IF EXISTS "StoryInteraction_userId_updatedAt_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "StoryInteraction_readerId_storyId_type_key" ON "StoryInteraction"("readerId", "storyId", "type");
CREATE UNIQUE INDEX IF NOT EXISTS "StoryInteraction_subscriberId_storyId_type_key" ON "StoryInteraction"("subscriberId", "storyId", "type");
CREATE INDEX IF NOT EXISTS "StoryInteraction_readerId_updatedAt_idx" ON "StoryInteraction"("readerId", "updatedAt");
CREATE INDEX IF NOT EXISTS "StoryInteraction_subscriberId_updatedAt_idx" ON "StoryInteraction"("subscriberId", "updatedAt");
CREATE INDEX IF NOT EXISTS "StoryInteraction_userId_updatedAt_idx" ON "StoryInteraction"("userId", "updatedAt");

ALTER TABLE "StoryInteraction" DROP CONSTRAINT IF EXISTS "StoryInteraction_userId_fkey";
ALTER TABLE "StoryInteraction" ADD CONSTRAINT "StoryInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StoryInteraction_subscriberId_fkey'
  ) THEN
    ALTER TABLE "StoryInteraction" ADD CONSTRAINT "StoryInteraction_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
