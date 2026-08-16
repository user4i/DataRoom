"use client";

import { AuthGate } from "@/components/auth-gate";
import { AppHeader } from "@/components/app-header";
import { Explorer } from "@/components/Explorer";
import { use } from "react";

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  return (
    <AuthGate>
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <Explorer roomId={roomId} />
        </main>
      </div>
    </AuthGate>
  );
}
