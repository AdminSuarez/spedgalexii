import { NextResponse } from "next/server";
import { loadExtractedDocsLocal } from "@/lib/deliberations/localLoader";
import { buildDeliberationsPayload } from "@/lib/deliberations/mergeLatest";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const studentId = (url.searchParams.get("studentId") ?? "").trim();

  if (!studentId) {
    return NextResponse.json({ ok: false, error: "Missing studentId" }, { status: 400 });
  }

  try {
    // ✅ MVP: local JSON fixtures
    // Later: replace with Supabase/Postgres or your extraction store.
    const docs = await loadExtractedDocsLocal(studentId);

    const payload = buildDeliberationsPayload({
      extractedDocs: docs,
      meetingDateISO: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, payload }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to build deliberations payload.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
