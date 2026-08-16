"use client";

import { use } from "react";
import { FileViewer } from "@/components/FileViewer";

export default function PublicFilePage({
  params,
}: {
  params: Promise<{ token: string; fileId: string }>;
}) {
  const { token, fileId } = use(params);
  return <FileViewer fileId={fileId} publicToken={token} />;
}
