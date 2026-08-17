CREATE TABLE "TagDef" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TagDef_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResourceTag" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "fileId" TEXT,
    "folderId" TEXT,

    CONSTRAINT "ResourceTag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TagDef_userId_name_key" ON "TagDef"("userId", "name");
CREATE INDEX "TagDef_userId_sortOrder_idx" ON "TagDef"("userId", "sortOrder");
CREATE UNIQUE INDEX "ResourceTag_tagId_resourceType_resourceId_key" ON "ResourceTag"("tagId", "resourceType", "resourceId");
CREATE INDEX "ResourceTag_resourceType_resourceId_idx" ON "ResourceTag"("resourceType", "resourceId");

ALTER TABLE "TagDef" ADD CONSTRAINT "TagDef_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceTag" ADD CONSTRAINT "ResourceTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "TagDef"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceTag" ADD CONSTRAINT "ResourceTag_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceTag" ADD CONSTRAINT "ResourceTag_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
