export type ResourceType = "DATA_ROOM" | "FOLDER" | "FILE";
export type ShareKind = "PUBLIC_LINK" | "USER";
export type ShareRole = "VIEWER" | "EDITOR";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export type DataRoomDto = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  access: "OWNER" | "VIEWER";
  owner?: { id: string; name: string; email: string };
};

export type FolderDto = {
  id: string;
  dataRoomId: string;
  parentId: string | null;
  name: string;
  path: string;
  totalSize: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type FileDto = {
  id: string;
  dataRoomId: string;
  folderId: string | null;
  name: string;
  size: string;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
};

export type BreadcrumbItem = {
  id: string;
  name: string;
};

export type ListingDto = {
  folder: FolderDto | null;
  dataRoom: DataRoomDto;
  breadcrumbs: BreadcrumbItem[];
  folders: FolderDto[];
  files: FileDto[];
  access: "OWNER" | "VIEWER";
};

export type ShareDto = {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  kind: ShareKind;
  role: ShareRole;
  token: string | null;
  userId: string | null;
  invitedEmail: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
};

export type DeletionPreviewDto = {
  folderCount: number;
  fileCount: number;
  totalSize: string;
  sampleNames: string[];
};
