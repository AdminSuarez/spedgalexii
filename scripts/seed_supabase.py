#!/usr/bin/env python3
"""
seed_supabase.py
────────────────
Reads every canonical input spreadsheet and upserts rows into Supabase.

Usage:
    cd galaxy-iep-accommodations
    python3 scripts/seed_supabase.py

Requires:
    pip install supabase python-dotenv openpyxl
"""

import csv
import json
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# ── Env setup ─────────────────────────────────────────────────────────────────
HERE = Path(__file__).parent
REPO = HERE.parent                                      # galaxy-iep-accommodations/
AUDIT_ROOT = REPO.parent                               # AccommodationsAudit/
CANONICAL = AUDIT_ROOT / "input" / "_CANONICAL"
NWEA_DIR  = AUDIT_ROOT / "input" / "_NWEA_ANALYSIS"
ROOT_INPUT = AUDIT_ROOT / "input"

load_dotenv(REPO / ".env.local")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").strip()
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "").strip()
)

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set.")
    sys.exit(1)

from supabase import create_client
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

BATCH = 200   # rows per upsert call

# ── Helpers ───────────────────────────────────────────────────────────────────
def truthy(val: str) -> bool | None:
    if val is None:
        return None
    v = str(val).strip().upper()
    if v in ("TRUE", "YES", "X", "1"):
        return True
    if v in ("FALSE", "NO", "", "0"):
        return False
    return None

def nonempty(val) -> str | None:
    s = str(val).strip() if val is not None else ""
    return s if s else None

def upsert_batch(table: str, rows: list[dict], conflict_cols: list[str] | None = None):
    if not rows:
        return
    for i in range(0, len(rows), BATCH):
        chunk = rows[i : i + BATCH]
        q = sb.table(table).upsert(chunk)
        q.execute()
    print(f"  ✓ {len(rows):,} rows → {table}")

# ── 1. roster.csv ─────────────────────────────────────────────────────────────
def seed_roster():
    f = CANONICAL / "roster.csv"
    if not f.exists():
        print(f"  SKIP roster.csv (not found at {f})")
        return

    rows = []
    with open(f, newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        for r in reader:
            sid = nonempty(r.get("Student ID") or r.get("student_id"))
            if not sid:
                continue
            rows.append({
                "student_id":          sid,
                "district_student_id": nonempty(r.get("District Student ID")),
                "last_name":           nonempty(r.get("Last Name")),
                "first_name":          nonempty(r.get("First Name")),
                "student_name":        nonempty(r.get("Student Name")),
                "grade":               nonempty(r.get("Grade")),
                "case_manager":        nonempty(r.get("Case Manager")),
                "school":              nonempty(r.get("School")),
                "campus":              nonempty(r.get("Campus")),
                "source_file":         f.name,
            })

    # Delete old rows then insert fresh (roster replaces itself)
    sb.table("roster").delete().neq("id", 0).execute()
    upsert_batch("roster", rows)

# ── 2. accommodations.csv ─────────────────────────────────────────────────────
def seed_accommodations():
    f = CANONICAL / "accommodations.csv"
    if not f.exists():
        print(f"  SKIP accommodations.csv (not found at {f})")
        return

    rows = []
    with open(f, newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        for r in reader:
            sid = nonempty(r.get("student_id") or r.get("Student ID"))
            if not sid:
                continue
            rows.append({
                "student_id":         sid,
                "last_name":          nonempty(r.get("last_name")),
                "first_name":         nonempty(r.get("first_name")),
                "case_manager":       nonempty(r.get("case_manager")),
                "campus":             nonempty(r.get("campus")),
                "grade":              nonempty(r.get("grade")),
                "status":             nonempty(r.get("status")),
                "program_type":       nonempty(r.get("program_type")),
                "disabilities":       nonempty(r.get("disabilities")),
                "event_name":         nonempty(r.get("event_name")),
                "lle_meeting_date":   nonempty(r.get("lle_meeting_date")),
                "accommodation_type": nonempty(r.get("accommodation_type")),
                "accommodation_name": nonempty(r.get("accommodation_name")),
                "subjects":           nonempty(r.get("subjects")),
                "description":        nonempty(r.get("description")),
                "start_date":         nonempty(r.get("startdate") or r.get("start_date")),
                "end_date":           nonempty(r.get("end_date")),
                "source_file":        f.name,
            })

    sb.table("accommodations").delete().neq("id", 0).execute()
    upsert_batch("accommodations", rows)

# ── 3. All_Lively_MS_Students_Accomodations_State_Testing.csv ─────────────────
def seed_state_testing():
    f = CANONICAL / "All_Lively_MS_Students_Accomodations_State_Testing.csv"
    if not f.exists():
        print(f"  SKIP state testing CSV (not found)")
        return

    # File has 4 header rows; row 4 (index 3) is Student ID, First Name etc.
    # Rows 5+ are data.
    with open(f, newline="", encoding="utf-8-sig") as fh:
        all_rows = list(csv.reader(fh))

    if len(all_rows) < 5:
        print("  SKIP state testing CSV (too few rows)")
        return

    # Column 0..8 = student identity; columns 9+ = accommodation booleans
    # We map by position (header row 4 has the col names we care about)
    ACCOM_COLS = [
        "staar_alt2", "asl_videos", "auto_text_to_speech", "basic_calculator_online",
        "content_and_language_supports", "permissive_mode", "proctored_administration",
        "refreshable_braille_contracted", "refreshable_braille_uncontracted",
        "spanish_online", "speech_to_text", "spell_check", "text_to_speech",
        "word_prediction", "braille_contracted", "braille_uncontracted", "large_print",
        "spanish", "basic_transcribing", "calculation_aids", "extra_time",
        "individualized_structured_reminders", "manipulating_test_materials",
        "mathematics_manipulatives", "oral_admin_student_request_paper",
        "oral_admin_change_support_paper", "oral_admin_qa_paper",
        "signed_administration", "spelling_assistance", "supplemental_aids",
        "complex_transcribing", "extra_day", "math_scribe", "other_ds",
        "amplification_devices", "bilingual_dictionary", "blank_place_markers",
        "color_overlays", "highlighters", "individual_administration",
        "magnifying_devices", "photocopy_nonsecure_materials", "projection_devices",
        "read_test_aloud_to_self", "reading_aloud_signing_writing",
        "reading_assistance_grade3_math", "reminders_to_stay_on_task",
        "scratch_paper", "signing_test_directions", "small_group_administration",
        "tools_minimize_distractions", "translating_test_directions",
    ]

    rows = []
    for raw in all_rows[4:]:
        if not raw or not str(raw[0]).strip().isdigit():
            continue
        row: dict = {
            "student_id":     nonempty(raw[0]),
            "first_name":     nonempty(raw[1]) if len(raw) > 1 else None,
            "middle_initial": nonempty(raw[2]) if len(raw) > 2 else None,
            "last_name":      nonempty(raw[3]) if len(raw) > 3 else None,
            "grade_level":    nonempty(raw[4]) if len(raw) > 4 else None,
            "is_sped":        truthy(raw[5]) if len(raw) > 5 else None,
            "is_504":         truthy(raw[6]) if len(raw) > 6 else None,
            "is_lep":         truthy(raw[7]) if len(raw) > 7 else None,
            "subject":        nonempty(raw[8]) if len(raw) > 8 else None,
            "source_file":    f.name,
        }
        for idx, col in enumerate(ACCOM_COLS):
            cell_idx = 9 + idx
            row[col] = truthy(raw[cell_idx]) if cell_idx < len(raw) else None

        rows.append(row)

    sb.table("state_testing_accommodations").delete().neq("id", 0).execute()
    upsert_batch("state_testing_accommodations", rows)

# ── 4. NWEA_180303524.csv ─────────────────────────────────────────────────────
def seed_nwea():
    # Grab all NWEA CSVs from the analysis dir
    nwea_files = list(NWEA_DIR.glob("NWEA_*.csv")) if NWEA_DIR.exists() else []
    if not nwea_files:
        print("  SKIP nwea (no NWEA_*.csv files found)")
        return

    all_rows = []
    for f in nwea_files:
        with open(f, newline="", encoding="utf-8-sig") as fh:
            reader = csv.DictReader(fh)
            for r in reader:
                sid = nonempty(r.get("Student ID") or r.get("student_id"))
                if not sid:
                    continue

                def g(k): return nonempty(r.get(k))

                all_rows.append({
                    "student_id":         sid,
                    "last_name":          g("Student Last Name"),
                    "first_name":         g("Student First Name"),
                    "middle_initial":     g("Student Middle Initial"),
                    "term_tested":        g("Term Tested"),
                    "term_rostered":      g("Term Rostered"),
                    "school":             g("School"),
                    "grade":              g("Grade"),
                    "subject":            g("Subject"),
                    "course":             g("Course"),
                    "rit_score":          g("RIT Score"),
                    "rapid_guessing_pct": g("Rapid-Guessing %"),
                    "rit_score_10pt_range": g("RIT Score 10 Point Range"),
                    "lexile_score":       g("LexileScore"),
                    "lexile_range":       g("LexileRange"),
                    "quantile_score":     g("QuantileScore"),
                    "quantile_range":     g("QuantileRange"),
                    "test_name":          g("Test Name"),
                    "math_computations_algebraic": g("Mathematics: Computations and Algebraic Relationships"),
                    "math_data_analysis":          g("Mathematics: Data Analysis"),
                    "math_geometry_measurement":   g("Mathematics: Geometry and Measurement"),
                    "math_numerical_probability":  g("Mathematics: Numerical Representations and Probability"),
                    "la_authors_purpose_craft":    g("Language Arts: Author's Purpose and Craft"),
                    "la_foundational_vocabulary":  g("Language Arts: Foundational Language Skills: Vocabulary"),
                    "la_multiple_genres":          g("Language Arts: Multiple Genres"),
                    "sci_earth_space":             g("Science: Earth and space"),
                    "sci_matter_force_motion":     g("Science: Matter, force, motion, and energy"),
                    "sci_organisms_environments":  g("Science: Organisms and environments"),
                    "math_linear_functions":       g("Mathematics: Describe & Graph Linear Functions, Equations, & Inequalities"),
                    "math_number_algebraic_methods": g("Mathematics: Number and Algebraic Methods"),
                    "math_quadratic_exponential":  g("Mathematics: Quadratic and Exponential Functions and Equations"),
                    "math_write_solve_linear":     g("Mathematics: Write & Solve Linear Functions, Equations, & Inequalities"),
                    "source_file":                 f.name,
                })

    sb.table("nwea_scores").delete().neq("id", 0).execute()
    upsert_batch("nwea_scores", all_rows)

# ── 5. jacob_spreadsht_ForTemplate.csv ────────────────────────────────────────
def seed_grades_template():
    f = ROOT_INPUT / "jacob_spreadsht_ForTemplate.csv"
    if not f.exists():
        print(f"  SKIP grades template (not found at {f})")
        return

    with open(f, newline="", encoding="utf-8-sig") as fh:
        all_rows = list(csv.reader(fh))

    # Row 0: metadata (Data Source, SIS, ..., Current Year ...)
    # Row 1: column headers (First Name, Teacher, ID, Course, 1st 9Wk, ...)
    if len(all_rows) < 3:
        print("  SKIP grades template (too few rows)")
        return

    headers = all_rows[1]
    rows = []
    current_student = None

    for raw in all_rows[2:]:
        if not any(c.strip() for c in raw):
            continue

        first_name = nonempty(raw[0]) if raw else None
        if first_name:
            current_student = first_name

        def col(idx):
            return nonempty(raw[idx]) if idx < len(raw) else None

        rows.append({
            "student_id":  None,           # not present in this file
            "first_name":  current_student,
            "teacher":     col(2),
            "course_id":   col(3),
            "course_name": col(4),
            "nine_wk_1":   col(5),
            "nine_wk_2":   col(6),
            "s1_exam":     col(7),
            "s1_avg":      col(8),
            "s1_att":      col(9),
            "pr_5":        col(10),
            "pr_6":        col(11),
            "nine_wk_3":   col(12),
            "nine_wk_4":   col(13),
            "s2_exam":     col(14),
            "s2_avg":      col(15),
            "s2_att":      col(16),
            "year_avg":    col(17),
            "yr_avg":      col(18),
            "yr_att":      col(19),
            "raw_row":     json.dumps(dict(zip(headers, raw))),
            "source_file": f.name,
        })

    sb.table("grades_template").delete().neq("id", 0).execute()
    upsert_batch("grades_template", rows)

# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print(f"\n🚀 Seeding Supabase at {SUPABASE_URL[:40]}...\n")

    steps = [
        ("roster",                       seed_roster),
        ("accommodations",               seed_accommodations),
        ("state_testing_accommodations", seed_state_testing),
        ("nwea_scores",                  seed_nwea),
        ("grades_template",              seed_grades_template),
    ]

    for label, fn in steps:
        print(f"→ {label}")
        try:
            fn()
        except Exception as e:
            print(f"  ✗ ERROR: {e}")

    print("\n✅ Done.\n")
