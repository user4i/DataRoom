export type ResourceType = "DATA_ROOM" | "FOLDER" | "FILE";
export type ShareKind = "PUBLIC_LINK" | "USER";
export type ShareRole = "VIEWER" | "EDITOR";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export type OwnerDto = {
  id: string;
  name: string;
  email: string;
};

export type DataRoomDto = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  access: "OWNER" | "VIEWER";
  owner?: OwnerDto;
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
  owner?: OwnerDto;
  analysisStatus?: AnalysisPublicStatus;
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
  owner?: OwnerDto;
  versionCount?: number;
  analysisStatus?: AnalysisPublicStatus;
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
  page: number;
  pageSize: number;
  total: number;
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
  viewers: {
    publicLinkCount: number;
    peopleCount: number;
    people: string[];
  };
};

export type AiProvider = "GEMINI" | "OPENAI_COMPATIBLE";

export type AiSettingsDto = {
  locale: "en" | "uk";
  provider: AiProvider;
  baseUrl: string | null;
  model: string | null;
  hasKey: boolean;
  apiKeyLast4: string | null;
};

export type AnalysisKind = "FILE_SUMMARY" | "FOLDER_SUMMARY" | "FOLDER_COMPARE";
export type AnalysisPublicStatus = "no" | "in_process" | "done" | "failed";

export type AnalysisDto = {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  kind: AnalysisKind;
  status: AnalysisPublicStatus;
  html: string | null;
  error: string | null;
  locale: string;
  updatedAt: string;
};

export type CommentDto = {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; email: string };
  mine: boolean;
  canDelete: boolean;
};
