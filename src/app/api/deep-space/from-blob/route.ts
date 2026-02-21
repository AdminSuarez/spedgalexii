import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeFile, mkdir, readFile, readdir, unlink } from "fs/promises";
import path from "path";
import os from "os";
import { get, head } from "@vercel/blob";

export const runtime = "nodejs";
export const maxDuration = 120; // 2 minutes for processing

type BlobFile = {
  pathname: string;
  name: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      studentId?: string;
      files?: BlobFile[];
    };

    const studentId = body.studentId?.trim();
    const files = body.files ?? [];

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
    }

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const apiUrl = process.env.DEEP_SPACE_API_URL?.trim();

    // If a remote Deep Space API is configured, use it (cloud path).
    if (apiUrl) {
      try {
        // Turn private blob pathnames into signed download URLs.
        // Use head() instead of get() — we only need the downloadUrl metadata,
        // not the actual blob content stream. head() is a lightweight HEAD
        // request that returns the blob's signed downloadUrl without
        // downloading any bytes.
        const externalFiles: { name: string; url: string }[] = [];

        for (const f of files) {
          const blobMeta = await head(f.pathname);
          if (!blobMeta) {
            throw new Error(
              `Blob not found or token missing for: ${f.pathname}`,
            );
          }
          externalFiles.push({ name: f.name, url: blobMeta.downloadUrl });
        }

        const target = apiUrl.replace(/\/$/, "") + "/analyze";
        const apiRes = await fetch(target, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(process.env.DEEP_SPACE_API_KEY
              ? { "x-api-key": process.env.DEEP_SPACE_API_KEY }
              : {}),
          },
          body: JSON.stringify({ 
            studentId, 
            files: externalFiles,
            blobToken: process.env.BLOB_READ_WRITE_TOKEN
          }),
        });

        const apiJson = (await apiRes.json().catch(() => ({}))) as {
          analysis?: unknown;
          report?: string | null;
          detail?: string;
          error?: string;
        };

        if (!apiRes.ok || !apiJson.analysis) {
          const msg =
            apiJson.error || apiJson.detail || `Deep Space API error (${apiRes.status})`;
          return NextResponse.json({ error: msg }, { status: 502 });
        }

        return NextResponse.json({
          success: true,
          studentId,
          filesProcessed: files.length,
          analysis: apiJson.analysis,
          report: apiJson.report ?? null,
        });
      } catch (e) {
        console.error("Deep Space from-blob remote API error:", e);
        return NextResponse.json(
          {
            error:
              e instanceof Error
                ? e.message
                : "Failed to contact Deep Space analyzer API",
          },
          { status: 502 },
        );
      }
    }

    // Fallback: local Python analyzer (dev / on-prem environments only).
    // On Vercel, this will not work because python3 is not available.
    if (process.env.VERCEL === "1") {
      return NextResponse.json(
        {
          error:
            "Deep Space analyzer API is not configured (DEEP_SPACE_API_URL). Configure it to enable Deep Space in the cloud.",
        },
        { status: 503 },
      );
    }

    const tempDir = path.join(os.tmpdir(), `galexii-dive-${Date.now()}`);
    const iepsDir = path.join(tempDir, "ieps");
    const auditDir = path.join(tempDir, "audit");

    await mkdir(iepsDir, { recursive: true });
    await mkdir(auditDir, { recursive: true });

    for (const f of files) {
      const blobResult = await get(f.pathname, { access: "private" });

      if (!blobResult) {
        throw new Error(`Blob not found: ${f.pathname} — check BLOB_READ_WRITE_TOKEN`);
      }

      if (blobResult.statusCode !== 200 || !blobResult.stream) {
        throw new Error(
          `Download failed: ${f.pathname} (HTTP ${blobResult.statusCode})`,
        );
      }

      // blobResult.statusCode === 200 here; TypeScript narrows stream to ReadableStream.
      const arrayBuf = await new Response(blobResult.stream).arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      const baseName = f.name || "document.pdf";
      const filename = baseName.startsWith(studentId) ? baseName : `${studentId}_${baseName}`;
      await writeFile(path.join(iepsDir, filename), buffer);
    }

    const projRoot = process.cwd().replace("/galaxy-iep-accommodations", "");
    const analyzerPath = path.join(projRoot, "scripts", "deep_dive_analyzer.py");

    const result = await runAnalyzer(analyzerPath, studentId, tempDir);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Analysis failed" },
        { status: 500 },
      );
    }

    const jsonPath = path.join(auditDir, `DEEP_DIVE_${studentId}.json`);
    const mdPath = path.join(auditDir, `DEEP_DIVE_${studentId}_REPORT.md`);

    let analysisJson: unknown = null;
    let reportMarkdown: string | null = null;

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

    try {
      if (analysisJson) {
        const auditRoot = path.resolve(process.cwd(), "..");
        const canonicalAudit = path.join(auditRoot, "audit");
        await mkdir(canonicalAudit, { recursive: true });

        const canonicalJsonPath = path.join(canonicalAudit, `DEEP_DIVE_${studentId}.json`);
        await writeFile(canonicalJsonPath, JSON.stringify(analysisJson, null, 2), "utf-8");

        if (reportMarkdown) {
          const canonicalMdPath = path.join(canonicalAudit, `DEEP_DIVE_${studentId}_REPORT.md`);
          await writeFile(canonicalMdPath, reportMarkdown, "utf-8");
        }
      }
    } catch (e) {
      console.error("Failed to persist Deep Dive artifacts to audit/:", e);
    }

    try {
      const iepFiles = await readdir(iepsDir);
      for (const f of iepFiles) {
        await unlink(path.join(iepsDir, f));
      }
      const auditFiles = await readdir(auditDir);
      for (const f of auditFiles) {
        await unlink(path.join(auditDir, f));
      }
    } catch {
      // ignore cleanup errors
    }

    return NextResponse.json({
      success: true,
      studentId,
      filesProcessed: files.length,
      analysis: analysisJson,
      report: reportMarkdown,
    });
  } catch (error) {
    console.error("Deep Space from-blob error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

async function runAnalyzer(
  analyzerPath: string,
  studentId: string,
  workDir: string,
): Promise<{ success: boolean; error?: string; stdout?: string }> {
  return new Promise((resolve) => {
    const projectRoot = path.dirname(path.dirname(analyzerPath));
    const assessmentProfilePath = path.join(
      projectRoot,
      "output",
      "ASSESSMENT_PROFILE__ALL_CASE_MANAGERS.xlsx",
    );

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
          stdout,
        });
      }
    });

    proc.on("error", (err) => {
      resolve({ success: false, error: err.message });
    });

    setTimeout(() => {
      proc.kill();
      resolve({ success: false, error: "Analysis timed out" });
    }, 90000);
  });
}
