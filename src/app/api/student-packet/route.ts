import { NextResponse } from "next/server";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { spawn } from "node:child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIT_ROOT = path.resolve(process.cwd(), "..");

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

function digitsOnly(id: string): string {
  return id.replace(/\D+/g, "");
}

async function runPython(cmd: string, args: string[], cwd: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const p = spawn(cmd, args, { cwd });

    p.on("error", (err) => reject(err));
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Exit code ${String(code)} for ${cmd} ${args.join(" ")}`));
    });
  });
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => ({}));
    const rawId = typeof body.studentId === "string" ? body.studentId.trim() : "";
    const sid = digitsOnly(rawId);

    if (!sid) {
      return NextResponse.json({ ok: false, error: "Missing or invalid studentId" }, { status: 400 });
    }

    const iepsDir = path.join(AUDIT_ROOT, "ieps");
    const auditDir = path.join(AUDIT_ROOT, "audit");
    const outputDir = path.join(AUDIT_ROOT, "output");

    const deepDivePath = path.join(auditDir, `DEEP_DIVE_${sid}.json`);
    if (!(await fileExists(deepDivePath))) {
      return NextResponse.json(
        {
          ok: false,
          error: `Deep Dive JSON not found for student ${sid}. Run Deep Dive/IEP Prep first.`,
        },
        { status: 400 },
      );
    }

    const iepsEntries = await fs.readdir(iepsDir).catch(() => [] as string[]);
    const pptxName = iepsEntries.find((name) => name.toLowerCase().endsWith(".pptx"));
    if (!pptxName) {
      return NextResponse.json(
        {
          ok: false,
          error: "No PPTX template found in ieps/. Save your ARD template PPTX there.",
        },
        { status: 400 },
      );
    }

    const templatePath = path.join(iepsDir, pptxName);
    const outputPpt = path.join(outputDir, `ARD_Summary_${sid}.pptx`);

    const venvPython = path.join(AUDIT_ROOT, ".venv", "bin", "python");
    const pythonCmd = (await fileExists(venvPython)) ? venvPython : "python3";

    // 1) Build the ARD PPT from Deep Dive JSON + template
    await runPython(pythonCmd, [
      path.join(AUDIT_ROOT, "scripts", "build_presentation_from_deep_dive.py"),
      "--template",
      templatePath,
      "--deep-dive",
      deepDivePath,
      "--output",
      outputPpt,
    ], AUDIT_ROOT);

    // 2) Build the student packet (excels + PDFs + PPT and other artifacts)
    await runPython(pythonCmd, [
      path.join(AUDIT_ROOT, "scripts", "30_build_student_packet.py"),
      sid,
    ], AUDIT_ROOT);

    const packetDir = path.join(outputDir, "student_packets", sid);

    return NextResponse.json({ ok: true, studentId: sid, packetDir });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg || "Packet build failed" }, { status: 500 });
  }
}
