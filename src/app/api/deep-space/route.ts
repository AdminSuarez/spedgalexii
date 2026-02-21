import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeFile, mkdir, readFile, readdir, unlink } from "fs/promises";
import path from "path";
import os from "os";

export const runtime = "nodejs";
export const maxDuration = 120; // 2 minutes for processing

/**
 * POST /api/deep-dive
 * 
 * Accepts uploaded IEP PDFs for a single student and runs the deep dive analyzer.
 * Returns the analysis JSON and markdown report.
 */
export async function POST(req: NextRequest) {
  try {
    // Vercel's Node runtime does not provide a Python binary, so the
    // analyzer can only run in environments where `python3` is installed
    // (your local machine or a custom backend). In production on Vercel,
    // surface a clear message instead of a generic 500.
    if (process.env.VERCEL === "1") {
      return NextResponse.json(
        {
          error:
            "Deep Space analysis is currently only available when running SpEdGalexii on a machine with Python installed (local dev). The Vercel runtime does not include Python.",
        },
        { status: 503 },
      );
    }

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const studentId = formData.get("studentId") as string;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files uploaded" },
        { status: 400 }
      );
    }

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    // Create a temporary directory for this analysis
    const tempDir = path.join(os.tmpdir(), `galexii-dive-${Date.now()}`);
    const iepsDir = path.join(tempDir, "ieps");
    const auditDir = path.join(tempDir, "audit");
    
    await mkdir(iepsDir, { recursive: true });
    await mkdir(auditDir, { recursive: true });

    // Save uploaded files with student ID prefix
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      // Ensure filename starts with student ID for the analyzer
      const filename = file.name.startsWith(studentId) 
        ? file.name 
        : `${studentId}_${file.name}`;
      await writeFile(path.join(iepsDir, filename), buffer);
    }

    // Get the path to the analyzer script
    const projRoot = process.cwd().replace("/galaxy-iep-accommodations", "");
    const analyzerPath = path.join(projRoot, "scripts", "deep_dive_analyzer.py");

    // Run the analyzer
    const result = await runAnalyzer(analyzerPath, studentId, tempDir);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Analysis failed" },
        { status: 500 }
      );
    }

    // Read the generated files from the temporary audit directory
    const jsonPath = path.join(auditDir, `DEEP_DIVE_${studentId}.json`);
    const mdPath = path.join(auditDir, `DEEP_DIVE_${studentId}_REPORT.md`);

    let analysisJson = null;
    let reportMarkdown = null;

    try {
      const jsonContent = await readFile(jsonPath, "utf-8");
      analysisJson = JSON.parse(jsonContent);
    } catch (e) {
      console.error("Failed to read analysis JSON:", e);
    }

    try {
      reportMarkdown = await readFile(mdPath, "utf-8");
    } catch (e) {
      console.error("Failed to read report markdown:", e);
    }

    // Persist Deep Dive artifacts to the main audit folder so
    // other tools (IEP Prep, ARD packet builder) can reuse them
    try {
      if (analysisJson) {
        const auditRoot = path.resolve(process.cwd(), "..");
        const canonicalAudit = path.join(auditRoot, "audit");
        await mkdir(canonicalAudit, { recursive: true });

        const canonicalJsonPath = path.join(canonicalAudit, `DEEP_DIVE_${studentId}.json`);
        await writeFile(
          canonicalJsonPath,
          JSON.stringify(analysisJson, null, 2),
          "utf-8",
        );

        if (reportMarkdown) {
          const canonicalMdPath = path.join(
            canonicalAudit,
            `DEEP_DIVE_${studentId}_REPORT.md`,
          );
          await writeFile(canonicalMdPath, reportMarkdown, "utf-8");
        }
      }
    } catch (e) {
      console.error("Failed to persist Deep Dive artifacts to audit/:", e);
    }

    // Cleanup temp files
    try {
      const iepFiles = await readdir(iepsDir);
      for (const f of iepFiles) {
        await unlink(path.join(iepsDir, f));
      }
      const auditFiles = await readdir(auditDir);
      for (const f of auditFiles) {
        await unlink(path.join(auditDir, f));
      }
    } catch (e) {
      // Ignore cleanup errors
    }

    return NextResponse.json({
      success: true,
      studentId,
      filesProcessed: files.length,
      analysis: analysisJson,
      report: reportMarkdown,
    });

  } catch (error) {
    console.error("Deep dive API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

async function runAnalyzer(
  analyzerPath: string,
  studentId: string,
  workDir: string
): Promise<{ success: boolean; error?: string; stdout?: string }> {
  return new Promise((resolve) => {
    // Resolve the project root from the analyzer script path
    // analyzerPath = /path/to/AccommodationsAudit/scripts/deep_dive_analyzer.py
    const projectRoot = path.dirname(path.dirname(analyzerPath));
    const assessmentProfilePath = path.join(projectRoot, "output", "ASSESSMENT_PROFILE__ALL_CASE_MANAGERS.xlsx");
    
    const env = {
      ...process.env,
      GALEXII_IEP_FOLDER: path.join(workDir, "ieps"),
      GALEXII_OUTPUT_FOLDER: path.join(workDir, "audit"),
      GALEXII_ASSESSMENT_PROFILE: assessmentProfilePath,
    };

    const proc = spawn("python3", [analyzerPath, "--student", studentId], {
      cwd: workDir,
      env,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true, stdout });
      } else {
        resolve({ 
          success: false, 
          error: stderr || `Process exited with code ${code}`,
          stdout 
        });
      }
    });

    proc.on("error", (err) => {
      resolve({ success: false, error: err.message });
    });

    // Timeout after 90 seconds
    setTimeout(() => {
      proc.kill();
      resolve({ success: false, error: "Analysis timed out" });
    }, 90000);
  });
}
