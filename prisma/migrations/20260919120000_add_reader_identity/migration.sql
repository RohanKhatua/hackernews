-- Reader identity model:
-- Reader becomes the single owner of StoryInteraction rows (one per browser
-- cookie / device, plus the synthetic `email:<subscriberId>` reader for email
-- link clicks). Subscribers link to Readers instead of interactions carrying
-- subscriber/user ids directly. The dead userId and subscriberId columns on
-- StoryInteraction are dropped; subscriber linkage moves to Reader.subscriberId.

-- DropForeignKey
ALTER TABLE "StoryInteraction" DROP CONSTRAINT "StoryInteraction_userId_fkey";

-- DropForeignKey
ALTER TABLE "StoryInteraction" DROP CONSTRAINT "StoryInteraction_subscriberId_fkey";

-- DropIndex
DROP INDEX "StoryInteraction_subscriberId_updatedAt_idx";

-- DropIndex
DROP INDEX "StoryInteraction_userId_updatedAt_idx";

-- DropIndex
DROP INDEX "StoryInteraction_subscriberId_storyId_type_key";

-- CreateTable
CREATE TABLE "Reader" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT,
    "mergedFrom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reader_pkey" PRIMARY KEY ("id")
);

-- Backfill: every existing interaction's readerId becomes a Reader row.
INSERT INTO "Reader" ("id", "createdAt", "lastSeenAt")
SELECT DISTINCT "readerId", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "StoryInteraction"
ON CONFLICT ("id") DO NOTHING;

-- Preserve the pre-existing subscriber linkage: whichever subscriber an
-- interaction's reader was last linked to (by updatedAt) becomes that
-- reader's subscriberId. Must run while StoryInteraction.subscriberId
-- still exists.
UPDATE "Reader" AS r
SET "subscriberId" = s."subscriberId"
FROM (
    SELECT DISTINCT ON ("readerId") "readerId", "subscriberId"
    FROM "StoryInteraction"
    WHERE "subscriberId" IS NOT NULL
    ORDER BY "readerId", "updatedAt" DESC
) AS s
WHERE r."id" = s."readerId";

-- CreateIndex
CREATE INDEX "Reader_subscriberId_idx" ON "Reader"("subscriberId");

-- AddForeignKey
ALTER TABLE "Reader" ADD CONSTRAINT "Reader_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "StoryInteraction" DROP COLUMN "subscriberId",
DROP COLUMN "userId";

-- AddForeignKey
ALTER TABLE "StoryInteraction" ADD CONSTRAINT "StoryInteraction_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "Reader"("id") ON DELETE CASCADE ON UPDATE CASCADE;
