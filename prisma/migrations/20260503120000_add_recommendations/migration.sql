-- CreateTable
CREATE TABLE "StoryInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "subscriberId" TEXT,
    "readerId" TEXT NOT NULL,
    "storyId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "count" INTEGER NOT NULL DEFAULT 1,
    "storyTitle" TEXT NOT NULL,
    "storyUrl" TEXT,
    "storyBy" TEXT,
    "storyScore" INTEGER,
    "storyComments" INTEGER,
    "storyTime" INTEGER,
    "domain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoryInteraction_readerId_storyId_type_key" ON "StoryInteraction"("readerId", "storyId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "StoryInteraction_subscriberId_storyId_type_key" ON "StoryInteraction"("subscriberId", "storyId", "type");

-- CreateIndex
CREATE INDEX "StoryInteraction_readerId_updatedAt_idx" ON "StoryInteraction"("readerId", "updatedAt");

-- CreateIndex
CREATE INDEX "StoryInteraction_subscriberId_updatedAt_idx" ON "StoryInteraction"("subscriberId", "updatedAt");

-- CreateIndex
CREATE INDEX "StoryInteraction_userId_updatedAt_idx" ON "StoryInteraction"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "StoryInteraction_storyId_idx" ON "StoryInteraction"("storyId");

-- AlterTable
ALTER TABLE "Subscriber" ADD COLUMN "recommendationToken" TEXT NOT NULL DEFAULT md5(random()::text || clock_timestamp()::text);

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_recommendationToken_key" ON "Subscriber"("recommendationToken");

-- AddForeignKey
ALTER TABLE "StoryInteraction" ADD CONSTRAINT "StoryInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryInteraction" ADD CONSTRAINT "StoryInteraction_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;
