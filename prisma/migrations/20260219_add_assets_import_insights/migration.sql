-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('PROCESSING', 'DONE', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "InsightTimeframe" AS ENUM ('SEVEN_DAYS', 'THIRTY_DAYS', 'NINETY_DAYS', 'ALL_TIME');

-- CreateTable: Asset
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "AssetType" NOT NULL DEFAULT 'IMAGE',
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "filename" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ImportBatch
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'hootsuite',
    "uploadedByUserId" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalFilename" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'PROCESSING',
    "errors" JSONB,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ImportedPost
CREATE TABLE "ImportedPost" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "externalId" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'linkedin',
    "text" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "isPartial" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportedPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PostMetricSnapshot
CREATE TABLE "PostMetricSnapshot" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "impressions" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "clicks" INTEGER,
    "reach" INTEGER,
    "engagementRate" DOUBLE PRECISION,
    "ctr" DOUBLE PRECISION,
    "isPartial" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostMetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InsightAggregate
CREATE TABLE "InsightAggregate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "timeframe" "InsightTimeframe" NOT NULL,
    "totalImpressions" INTEGER NOT NULL DEFAULT 0,
    "totalReactions" INTEGER NOT NULL DEFAULT 0,
    "totalComments" INTEGER NOT NULL DEFAULT 0,
    "totalShares" INTEGER NOT NULL DEFAULT 0,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "engagementRateAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctrAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deltaVsPrev" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsightAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WinningPattern
CREATE TABLE "WinningPattern" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "hookType" TEXT NOT NULL,
    "avgEngRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgImpressions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "exampleTexts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "features" JSONB NOT NULL,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WinningPattern_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Asset_workspaceId_idx" ON "Asset"("workspaceId");

-- CreateIndex
CREATE INDEX "ImportBatch_workspaceId_idx" ON "ImportBatch"("workspaceId");

-- CreateIndex
CREATE INDEX "ImportBatch_uploadedAt_idx" ON "ImportBatch"("uploadedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImportedPost_workspaceId_contentHash_key" ON "ImportedPost"("workspaceId", "contentHash");

-- CreateIndex
CREATE INDEX "ImportedPost_workspaceId_idx" ON "ImportedPost"("workspaceId");

-- CreateIndex
CREATE INDEX "ImportedPost_publishedAt_idx" ON "ImportedPost"("publishedAt");

-- CreateIndex
CREATE INDEX "ImportedPost_workspaceId_publishedAt_idx" ON "ImportedPost"("workspaceId", "publishedAt");

-- CreateIndex
CREATE INDEX "PostMetricSnapshot_postId_idx" ON "PostMetricSnapshot"("postId");

-- CreateIndex
CREATE INDEX "PostMetricSnapshot_batchId_idx" ON "PostMetricSnapshot"("batchId");

-- CreateIndex
CREATE INDEX "PostMetricSnapshot_createdAt_idx" ON "PostMetricSnapshot"("createdAt");

-- CreateIndex
CREATE INDEX "InsightAggregate_workspaceId_timeframe_idx" ON "InsightAggregate"("workspaceId", "timeframe");

-- CreateIndex
CREATE INDEX "InsightAggregate_workspaceId_generatedAt_idx" ON "InsightAggregate"("workspaceId", "generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WinningPattern_workspaceId_hookType_key" ON "WinningPattern"("workspaceId", "hookType");

-- CreateIndex
CREATE INDEX "WinningPattern_workspaceId_idx" ON "WinningPattern"("workspaceId");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedPost" ADD CONSTRAINT "ImportedPost_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostMetricSnapshot" ADD CONSTRAINT "PostMetricSnapshot_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ImportedPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostMetricSnapshot" ADD CONSTRAINT "PostMetricSnapshot_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsightAggregate" ADD CONSTRAINT "InsightAggregate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WinningPattern" ADD CONSTRAINT "WinningPattern_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
