-- DropIndex
DROP INDEX "Article_category_publishedAt_idx";

-- DropIndex
DROP INDEX "Article_category_score_idx";

-- AlterTable
ALTER TABLE "Article" DROP COLUMN "category",
ADD COLUMN     "categories" TEXT[];

-- CreateIndex
CREATE INDEX "Article_categories_idx" ON "Article" USING GIN ("categories" array_ops);

