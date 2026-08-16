import { HealthBadge } from "@/components/health-badge";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">GS1 Data Room</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Virtual data room MVP
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Nested folders, PDF files, and sharing. Sign in after Phase 1 lands.
        </p>
      </div>
      <HealthBadge />
    </main>
  );
}
