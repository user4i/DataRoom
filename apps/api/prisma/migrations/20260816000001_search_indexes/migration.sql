-- CreateIndex
CREATE INDEX "Folder_dataRoomId_name_idx" ON "Folder"("dataRoomId", "name");
CREATE INDEX "File_dataRoomId_name_idx" ON "File"("dataRoomId", "name");
