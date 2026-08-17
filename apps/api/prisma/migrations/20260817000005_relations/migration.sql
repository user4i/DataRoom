CREATE TABLE "ResourceLink" (
    "id" TEXT NOT NULL,
    "dataRoomId" TEXT NOT NULL,
    "leftType" "ResourceType" NOT NULL,
    "leftId" TEXT NOT NULL,
    "rightType" "ResourceType" NOT NULL,
    "rightId" TEXT NOT NULL,
    "leftFileId" TEXT,
    "leftFolderId" TEXT,
    "rightFileId" TEXT,
    "rightFolderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResourceLink_leftType_leftId_rightType_rightId_key" ON "ResourceLink"("leftType", "leftId", "rightType", "rightId");
CREATE INDEX "ResourceLink_leftType_leftId_idx" ON "ResourceLink"("leftType", "leftId");
CREATE INDEX "ResourceLink_rightType_rightId_idx" ON "ResourceLink"("rightType", "rightId");
CREATE INDEX "ResourceLink_dataRoomId_idx" ON "ResourceLink"("dataRoomId");

ALTER TABLE "ResourceLink" ADD CONSTRAINT "ResourceLink_dataRoomId_fkey" FOREIGN KEY ("dataRoomId") REFERENCES "DataRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceLink" ADD CONSTRAINT "ResourceLink_leftFileId_fkey" FOREIGN KEY ("leftFileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceLink" ADD CONSTRAINT "ResourceLink_leftFolderId_fkey" FOREIGN KEY ("leftFolderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceLink" ADD CONSTRAINT "ResourceLink_rightFileId_fkey" FOREIGN KEY ("rightFileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceLink" ADD CONSTRAINT "ResourceLink_rightFolderId_fkey" FOREIGN KEY ("rightFolderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
