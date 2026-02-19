import { NextResponse } from "next/server";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import type { Dirent } from "node:fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIT_ROOT = path.resolve(process.cwd(), "..");
const CANON_DIR = path.join(AUDIT_ROOT, "input", "_CANONICAL");
const IEPS_DIR = path.join(AUDIT_ROOT, "ieps");

type Scope = "all" | "case_manager";
type Module =
  | "accommodations"
  | "goals"
  | "plaafp"
  | "services"
  | "compliance"
  | "assessments";

type PreflightSeverity = "info" | "warning" | "error";

type PreflightCheck = {
  id: string;
  label: string;
  passed: boolean;
  severity: PreflightSeverity;
  details?: string | undefined;
};

type PreflightResponse = {
  ok: true;
  module: Module;
  scope: Scope;
  caseManagerName?: string | undefined;
  checks: PreflightCheck[];
  overallStatus: "ok" | "warning" | "error";
};

function toModule(raw: string | null): Module {
  switch (raw) {
    case "goals":
    case "plaafp":
    case "services":
    case "compliance":
    case "assessments":
    case "accommodations":
      return raw;
    default:
      return "accommodations";
  }
}

function toScope(raw: string | null): Scope {
  return raw === "case_manager" ? "case_manager" : "all";
}

async function dirExists(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p);
    return st.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p);
    return st.isFile();
  } catch {
    return false;
  }
}

async function listDirSafe(dir: string): Promise<Dirent[]> {
  try {
    // fs.readdir with withFileTypes returns Dirent objects
    // @ts-ignore
    return await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function anyCsvMatching(dir: string, prefixes: string[]): Promise<boolean> {
  const entries = await listDirSafe(dir);
  for (const ent of entries) {
    if (!ent.isFile?.()) continue;
    const name = ent.name.toLowerCase();
    if (!name.endsWith(".csv")) continue;
    if (prefixes.some((p) => name.startsWith(p.toLowerCase()))) {
      return true;
    }
  }
  return false;
}

async function anyPdfInDir(dir: string): Promise<boolean> {
  const entries = await listDirSafe(dir);
  for (const ent of entries) {
    if (!ent.isFile?.()) continue;
    const name = ent.name.toLowerCase();
    if (name.endsWith(".pdf")) return true;
  }
  return false;
}

function overallStatusFromChecks(checks: PreflightCheck[]): "ok" | "warning" | "error" {
  if (checks.some((c) => !c.passed && c.severity === "error")) return "error";
  if (checks.some((c) => !c.passed && c.severity === "warning")) return "warning";
  return "ok";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const module = toModule(url.searchParams.get("module"));
  const scope = toScope(url.searchParams.get("scope"));
  const caseManagerNameRaw = url.searchParams.get("caseManagerName") ?? "";
  const caseManagerName = caseManagerNameRaw.trim() || undefined;

  const checks: PreflightCheck[] = [];

  // Shared: canonical input folder
  const canonExists = await dirExists(CANON_DIR);
  checks.push({
    id: "canon_dir",
    label: `Canonical input folder at "${CANON_DIR}"`,
    passed: canonExists,
    severity: canonExists ? "info" : "error",
    details: canonExists
      ? undefined
      : "Expected input/_CANONICAL folder is missing. Place your CSV exports there.",
  });

  if (module === "goals") {
    if (canonExists) {
      const hasGoalsCsv = await anyCsvMatching(CANON_DIR, [
        "fullgoals_by_student",
        "goals_by_student",
        "goals",
      ]);
      checks.push({
        id: "goals_csv",
        label: "Goals CSV present (FULLGoals_By_Student / Goals_By_Student / goals*.csv)",
        passed: hasGoalsCsv,
        severity: hasGoalsCsv ? "info" : "error",
        details: hasGoalsCsv
          ? undefined
          : "Place a FULLGoals_By_Student or Goals_By_Student CSV into input/_CANONICAL.",
      });
    }
  } else if (module === "services") {
    if (canonExists) {
      const hasServicesCsv = await anyCsvMatching(CANON_DIR, [
        "fulliep_program_names_and_instructional_setting",
        "iep_program_names",
        "program_names",
        "services",
      ]);
      checks.push({
        id: "services_csv",
        label:
          "Services/program CSV present (FULLIEP_Program_Names_and_Instructional_Setting / IEP_Program_Names / Program_Names / services*.csv)",
        passed: hasServicesCsv,
        severity: hasServicesCsv ? "info" : "error",
        details: hasServicesCsv
          ? undefined
          : "Place the program/services CSV export into input/_CANONICAL so Services Galexii can run.",
      });
    }
  } else if (module === "plaafp") {
    const iepsExists = await dirExists(IEPS_DIR);
    checks.push({
      id: "ieps_dir",
      label: `IEP PDFs folder at "${IEPS_DIR}"`,
      passed: iepsExists,
      severity: iepsExists ? "info" : "error",
      details: iepsExists
        ? undefined
        : "Expected ieps/ folder with IEP PDFs is missing.",
    });

    if (iepsExists) {
      const hasPdf = await anyPdfInDir(IEPS_DIR);
      checks.push({
        id: "ieps_pdfs",
        label: "At least one IEP PDF in ieps/",
        passed: hasPdf,
        severity: hasPdf ? "info" : "warning",
        details: hasPdf
          ? undefined
          : "No PDFs detected in ieps/. Place exported IEP PDFs there before running.",
      });
    }

    const rosterPath = path.join(CANON_DIR, "roster.csv");
    const rosterExists = await fileExists(rosterPath);
    checks.push({
      id: "roster_csv",
      label: `Roster CSV at "${rosterPath}"`,
      passed: rosterExists,
      severity: rosterExists ? "info" : "warning",
      details: rosterExists
        ? undefined
        : "roster.csv is optional but recommended so PLAAFP Galexii can map students to case managers.",
    });

    if (rosterExists && scope === "case_manager" && caseManagerName) {
      try {
        const rosterText = await fs.readFile(rosterPath, "utf8");
        const needle = caseManagerName.toLowerCase();
        const hasMapping = rosterText.toLowerCase().includes(needle);
        checks.push({
          id: "roster_mapping",
          label: `Roster has at least one student for ${caseManagerName}`,
          passed: hasMapping,
          severity: hasMapping ? "info" : "warning",
          details: hasMapping
            ? undefined
            : "No row in roster.csv matched that case manager. A case-manager PLAAFP run may produce 0 records and no Excel.",
        });
      } catch {
        // best-effort only
      }
    }
  } else if (module === "accommodations") {
    if (canonExists) {
      const hasAccomCsv = await anyCsvMatching(CANON_DIR, [
        "testhound_export",
        "all case mgr student_state_testing_accommodations",
      ]);
      checks.push({
        id: "accommodations_source",
        label:
          "Accommodations source present (testhound_export*.csv or All Case Mgr Student_State_Testing_Accommodations.csv)",
        passed: hasAccomCsv,
        severity: hasAccomCsv ? "info" : "error",
        details: hasAccomCsv
          ? undefined
          : "Place your TestHound or All Case Mgr Student_State_Testing_Accommodations export into input/_CANONICAL.",
      });

      const suarezCaseloadPath = path.join(CANON_DIR, "Suarez_CaseLoad_Student_Accommodations_Full.txt");
      const suarezCaseloadExists = await fileExists(suarezCaseloadPath);
      checks.push({
        id: "suarez_caseload_full",
        label: `Optional Suarez caseload accommodations at "${suarezCaseloadPath}"`,
        passed: suarezCaseloadExists,
        severity: "info",
        details: suarezCaseloadExists
          ? "Suarez caseload accommodations file will be used for Suarez case-manager runs."
          : "Optional: if you use a Suarez caseload accommodations file, place Suarez_CaseLoad_Student_Accommodations_Full.txt into input/_CANONICAL.",
      });

      const rosterPath = path.join(CANON_DIR, "roster.csv");
      const rosterExists = await fileExists(rosterPath);
      checks.push({
        id: "roster_csv",
        label: `Roster CSV at "${rosterPath}"`,
        passed: rosterExists,
        severity: rosterExists ? "info" : "error",
        details: rosterExists
          ? undefined
          : "roster.csv is required so Accommodations Galexii can map students and case managers.",
      });

      const idCrosswalkPath = path.join(CANON_DIR, "id_crosswalk.csv");
      const idCrosswalkExists = await fileExists(idCrosswalkPath);
      checks.push({
        id: "id_crosswalk_csv",
        label: `ID crosswalk CSV at "${idCrosswalkPath}"`,
        passed: idCrosswalkExists,
        severity: idCrosswalkExists ? "info" : "warning",
        details: idCrosswalkExists
          ? undefined
          : "id_crosswalk.csv is recommended so outputs can include local IDs and SIS IDs.",
      });
    }
  } else if (module === "compliance") {
    if (canonExists) {
      const fullSummaryPath = path.join(CANON_DIR, "FULLSummary_By_Student.csv");
      const fullSummaryExists = await fileExists(fullSummaryPath);
      checks.push({
        id: "compliance_fullsummary",
        label: `FULLSummary_By_Student.csv at "${fullSummaryPath}"`,
        passed: fullSummaryExists,
        severity: fullSummaryExists ? "info" : "error",
        details: fullSummaryExists
          ? undefined
          : "Place FULLSummary_By_Student.csv from Frontline into input/_CANONICAL before running Compliance Galexii.",
      });

      const evalPath = path.join(CANON_DIR, "IEP_Evaluation_by_Student-2.csv");
      const evalExists = await fileExists(evalPath);
      checks.push({
        id: "compliance_evaluations",
        label: `IEP_Evaluation_by_Student-2.csv at "${evalPath}"`,
        passed: evalExists,
        severity: evalExists ? "info" : "warning",
        details: evalExists
          ? undefined
          : "IEP_Evaluation_by_Student-2.csv is optional but recommended for a complete compliance picture.",
      });

      const reedPath = path.join(CANON_DIR, "REED_Determined_Evaluations_by_Student-2.csv");
      const reedExists = await fileExists(reedPath);
      checks.push({
        id: "compliance_reed",
        label: `REED_Determined_Evaluations_by_Student-2.csv at "${reedPath}"`,
        passed: reedExists,
        severity: reedExists ? "info" : "warning",
        details: reedExists
          ? undefined
          : "REED_Determined_Evaluations_by_Student-2.csv is optional but recommended for a complete compliance picture.",
      });

      const bipPath = path.join(CANON_DIR, "IEP_Students_With_A_BIP.csv");
      const bipExists = await fileExists(bipPath);
      checks.push({
        id: "compliance_bip",
        label: `IEP_Students_With_A_BIP.csv at "${bipPath}"`,
        passed: bipExists,
        severity: bipExists ? "info" : "warning",
        details: bipExists
          ? undefined
          : "IEP_Students_With_A_BIP.csv is optional but recommended so BIP status is included.",
      });
    }
  } else if (module === "assessments") {
    if (canonExists) {
      const rosterPath = path.join(CANON_DIR, "roster.csv");
      const rosterExists = await fileExists(rosterPath);
      checks.push({
        id: "assess_roster",
        label: `Roster CSV at "${rosterPath}"`,
        passed: rosterExists,
        severity: rosterExists ? "info" : "error",
        details: rosterExists
          ? undefined
          : "roster.csv is required so Assessments Galexii can join assessment data to students and case managers.",
      });

      const fullAccomPath = path.join(CANON_DIR, "FULLStudent_Accommodations-6.csv");
      const fullAccomExists = await fileExists(fullAccomPath);
      checks.push({
        id: "assess_full_accommodations",
        label: `FULLStudent_Accommodations-6.csv at "${fullAccomPath}"`,
        passed: fullAccomExists,
        severity: fullAccomExists ? "info" : "error",
        details: fullAccomExists
          ? undefined
          : "Place FULLStudent_Accommodations-6.csv into input/_CANONICAL so Assessments Galexii can build full profiles.",
      });

      const altAssessPath = path.join(CANON_DIR, "Student_Alternate_Assessments-2.csv");
      const altAssessExists = await fileExists(altAssessPath);
      checks.push({
        id: "assess_alt_assessments",
        label: `Student_Alternate_Assessments-2.csv at "${altAssessPath}"`,
        passed: altAssessExists,
        severity: altAssessExists ? "info" : "warning",
        details: altAssessExists
          ? undefined
          : "Student_Alternate_Assessments-2.csv is optional but recommended so alternate assessment participation is visible.",
      });

      const telpasPath = path.join(CANON_DIR, "Telpas_By_Student.csv");
      const telpasExists = await fileExists(telpasPath);
      checks.push({
        id: "assess_telpas",
        label: `Telpas_By_Student.csv at "${telpasPath}"`,
        passed: telpasExists,
        severity: telpasExists ? "info" : "warning",
        details: telpasExists
          ? undefined
          : "Telpas_By_Student.csv is optional but recommended so TELPAS information is included.",
      });

      const disabilitiesPath = path.join(CANON_DIR, "Disabilities_By_Student.csv");
      const disabilitiesExists = await fileExists(disabilitiesPath);
      checks.push({
        id: "assess_disabilities",
        label: `Disabilities_By_Student.csv at "${disabilitiesPath}"`,
        passed: disabilitiesExists,
        severity: disabilitiesExists ? "info" : "warning",
        details: disabilitiesExists
          ? undefined
          : "Disabilities_By_Student.csv is optional but recommended so disability codes are available in assessment views.",
      });
    }
  }

  const overallStatus = overallStatusFromChecks(checks);

  const body: PreflightResponse = {
    ok: true,
    module,
    scope,
    caseManagerName,
    checks,
    overallStatus,
  };

  return NextResponse.json(body);
}
