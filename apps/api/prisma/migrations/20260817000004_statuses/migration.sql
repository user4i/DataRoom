CREATE TABLE "StatusDef" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusDef_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResourceStatus" (
    "id" TEXT NOT NULL,
    "statusId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "fileId" TEXT,
    "folderId" TEXT,

    CONSTRAINT "ResourceStatus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StatusDef_userId_name_key" ON "StatusDef"("userId", "name");
CREATE INDEX "StatusDef_userId_sortOrder_idx" ON "StatusDef"("userId", "sortOrder");
CREATE UNIQUE INDEX "ResourceStatus_resourceType_resourceId_key" ON "ResourceStatus"("resourceType", "resourceId");
CREATE UNIQUE INDEX "ResourceStatus_fileId_key" ON "ResourceStatus"("fileId");
CREATE UNIQUE INDEX "ResourceStatus_folderId_key" ON "ResourceStatus"("folderId");
CREATE INDEX "ResourceStatus_statusId_idx" ON "ResourceStatus"("statusId");

ALTER TABLE "StatusDef" ADD CONSTRAINT "StatusDef_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceStatus" ADD CONSTRAINT "ResourceStatus_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "StatusDef"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceStatus" ADD CONSTRAINT "ResourceStatus_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceStatus" ADD CONSTRAINT "ResourceStatus_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
