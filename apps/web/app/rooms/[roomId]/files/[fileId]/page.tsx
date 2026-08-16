"use client";

import { use } from "react";
import { AuthGate } from "@/components/auth-gate";
import { FileViewer } from "@/components/FileViewer";

export default function FilePage({
  params,
}: {
  params: Promise<{ roomId: string; fileId: string }>;
}) {
  const { roomId, fileId } = use(params);
  return (
    <AuthGate>
      <FileViewer roomId={roomId} fileId={fileId} />
    </AuthGate>
  );
}
