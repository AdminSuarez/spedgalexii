import { NextResponse } from "next/server";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { spawn } from "node:child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIT_ROOT = path.resolve(process.cwd(), "..");

function digitsOnly(id: string): string {
  return id.replace(/\D+/g, "");
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function runPythonCapture(cmd: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  return await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(cmd, args, { cwd });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const msg = stderr || stdout || `Exit code ${String(code)} for ${cmd} ${args.join(" ")}`;
        reject(new Error(msg));
      }
    });
  });
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = (await req.json().catch(() => ({}))) as { studentId?: unknown };
    const rawId = typeof body.studentId === "string" ? body.studentId.trim() : "";
    const sid = digitsOnly(rawId);

    if (!sid) {
      return NextResponse.json({ ok: false, error: "Missing or invalid studentId" }, { status: 400 });
    }

    const deepDivePath = path.join(AUDIT_ROOT, "audit", `DEEP_DIVE_${sid}.json`);
    if (!(await fileExists(deepDivePath))) {
      return NextResponse.json(
        { ok: false, error: `Deep Dive JSON not found for student ${sid}. Run Deep Dive/IEP Prep first.` },
        { status: 400 },
      );
    }

    const venvPython = path.join(AUDIT_ROOT, ".venv", "bin", "python");
    const pythonCmd = (await fileExists(venvPython)) ? venvPython : "python3";

    const scriptPath = path.join(AUDIT_ROOT, "scripts", "iep_prep_galexii.py");

    const { stdout } = await runPythonCapture(
      pythonCmd,
      [scriptPath, "--student-id", sid, "--format", "markdown"],
      AUDIT_ROOT,
    );

    const markdown = stdout.trim();

    if (!markdown) {
      return NextResponse.json(
        { ok: false, error: "IEP Prep script returned no content for this student." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, studentId: sid, markdown });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg || "Failed to generate narrative" }, { status: 500 });
  }
}
