import { DeliberationsDoc } from "@/components/deliberations/DeliberationsDoc";
import type { DeliberationsPayload } from "@/lib/deliberations/types";

export const dynamic = "force-dynamic";

async function getPayload(studentId: string): Promise<DeliberationsPayload | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/deliberations?studentId=${encodeURIComponent(studentId)}`, {
    cache: "no-store",
  }).catch(() => null);

  if (!res || !res.ok) return null;

  const json = (await res.json()) as unknown;
  if (!json || typeof json !== "object") return null;

  const payload = (json as any).payload as DeliberationsPayload | undefined;
  return payload ?? null;
}

export default async function DeliberationsPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const sp = await searchParams;
  const studentId = (sp.studentId ?? "").trim();

  if (!studentId) {
    return (
      <main className="mx-auto max-w-3xl p-6 text-white/90">
        <h1 className="text-2xl font-semibold">Deliberations</h1>
        <p className="mt-2 text-white/70">
          Add a studentId in the URL, like: <span className="font-mono">/deliberations?studentId=10166903</span>
        </p>
      </main>
    );
  }

  const payload = await getPayload(studentId);

  if (!payload) {
    return (
      <main className="mx-auto max-w-3xl p-6 text-white/90">
        <h1 className="text-2xl font-semibold">Deliberations</h1>
        <p className="mt-2 text-white/70">
          Could not load deliberations for studentId <span className="font-mono">{studentId}</span>.
        </p>
        <p className="mt-2 text-white/70">
          MVP expects a file at: <span className="font-mono">output/extractions/{studentId}.json</span>
        </p>
      </main>
    );
  }

  return <DeliberationsDoc data={payload} />;
}
