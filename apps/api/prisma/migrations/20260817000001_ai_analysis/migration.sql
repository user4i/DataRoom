-- CreateEnum
CREATE TYPE "AnalysisKind" AS ENUM ('FILE_SUMMARY', 'FOLDER_SUMMARY', 'FOLDER_COMPARE');
CREATE TYPE "AnalysisStatus" AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "dataRoomId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "kind" "AnalysisKind" NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'QUEUED',
    "html" TEXT,
    "payloadJson" JSONB,
    "error" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "contentHash" TEXT,
    "requestedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Analysis_resourceType_resourceId_kind_key" ON "Analysis"("resourceType", "resourceId", "kind");
CREATE INDEX "Analysis_status_updatedAt_idx" ON "Analysis"("status", "updatedAt");
CREATE INDEX "Analysis_dataRoomId_idx" ON "Analysis"("dataRoomId");
