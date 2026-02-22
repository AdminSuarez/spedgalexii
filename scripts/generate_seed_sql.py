#!/usr/bin/env python3
"""
generate_seed_sql.py
────────────────────
Reads all canonical input files and writes INSERT SQL to stdout / a file.
That SQL can be pasted into the Supabase SQL Editor to seed the tables
without needing network access from this machine.

Usage:
    python3 galaxy-iep-accommodations/scripts/generate_seed_sql.py \
        > /tmp/galexii_seed.sql
    # Then open /tmp/galexii_seed.sql and paste into Supabase SQL Editor
"""

import csv, json, sys, re
from pathlib import Path

HERE      = Path(__file__).parent
REPO      = HERE.parent
AUDIT_ROOT = REPO.parent
CANONICAL  = AUDIT_ROOT / "input" / "_CANONICAL"
NWEA_DIR   = AUDIT_ROOT / "input" / "_NWEA_ANALYSIS"
ROOT_INPUT = AUDIT_ROOT / "input"

out = []

def q(v) -> str:
    """Escape a value for SQL."""
    if v is None or str(v).strip() == "":
        return "NULL"
    s = str(v).strip()
    s = s.replace("'", "''")
    return f"'{s}'"

def b(v) -> str:
    """Boolean for SQL."""
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    u = str(v).strip().upper()
    if u in ("TRUE", "YES", "X", "1"):
        return "TRUE"
    return "FALSE"

def nonempty(v):
    s = str(v).strip() if v is not None else ""
    return s if s else None

def truthy(v):
    if v is None: return None
    u = str(v).strip().upper()
    if u in ("TRUE","YES","X","1"): return True
    if u in ("FALSE","NO","","0"): return False
    return None

def emit(sql: str):
    out.append(sql)

# ── roster ────────────────────────────────────────────────────────────────────
def gen_roster():
    f = CANONICAL / "roster.csv"
    if not f.exists(): return
    rows = []
    with open(f, newline="", encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            sid = nonempty(r.get("Student ID") or r.get("student_id"))
            if not sid: continue
            rows.append(f"({q(sid)},{q(r.get('District Student ID'))},{q(r.get('Last Name'))},{q(r.get('First Name'))},{q(r.get('Student Name'))},{q(r.get('Grade'))},{q(r.get('Case Manager'))},{q(r.get('School'))},{q(r.get('Campus'))},{q(f.name)})")
    if not rows: return
    emit("-- ── roster ──────────────────────────────────────────────────────────────")
    emit("TRUNCATE TABLE roster RESTART IDENTITY CASCADE;")
    emit("INSERT INTO roster (student_id,district_student_id,last_name,first_name,student_name,grade,case_manager,school,campus,source_file) VALUES")
    emit(",\n".join(rows) + ";")
    emit("")

# ── accommodations ────────────────────────────────────────────────────────────
def gen_accommodations():
    f = CANONICAL / "accommodations.csv"
    if not f.exists(): return
    rows = []
    with open(f, newline="", encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            sid = nonempty(r.get("student_id") or r.get("Student ID"))
            if not sid: continue
            rows.append(f"({q(sid)},{q(r.get('last_name'))},{q(r.get('first_name'))},{q(r.get('case_manager'))},{q(r.get('campus'))},{q(r.get('grade'))},{q(r.get('status'))},{q(r.get('program_type'))},{q(r.get('disabilities'))},{q(r.get('event_name'))},{q(r.get('lle_meeting_date'))},{q(r.get('accommodation_type'))},{q(r.get('accommodation_name'))},{q(r.get('subjects'))},{q(r.get('description'))},{q(r.get('startdate') or r.get('start_date'))},{q(r.get('end_date'))},{q(f.name)})")
    if not rows: return
    emit("-- ── accommodations ──────────────────────────────────────────────────────")
    emit("TRUNCATE TABLE accommodations RESTART IDENTITY CASCADE;")
    cols = "student_id,last_name,first_name,case_manager,campus,grade,status,program_type,disabilities,event_name,lle_meeting_date,accommodation_type,accommodation_name,subjects,description,start_date,end_date,source_file"
    # Split into chunks of 500 to avoid huge single statements
    for i in range(0, len(rows), 500):
        chunk = rows[i:i+500]
        emit(f"INSERT INTO accommodations ({cols}) VALUES")
        emit(",\n".join(chunk) + ";")
    emit("")

# ── state_testing_accommodations ──────────────────────────────────────────────
ACCOM_COLS_SQL = [
    "staar_alt2","asl_videos","auto_text_to_speech","basic_calculator_online",
    "content_and_language_supports","permissive_mode","proctored_administration",
    "refreshable_braille_contracted","refreshable_braille_uncontracted",
    "spanish_online","speech_to_text","spell_check","text_to_speech","word_prediction",
    "braille_contracted","braille_uncontracted","large_print","spanish",
    "basic_transcribing","calculation_aids","extra_time",
    "individualized_structured_reminders","manipulating_test_materials",
    "mathematics_manipulatives","oral_admin_student_request_paper",
    "oral_admin_change_support_paper","oral_admin_qa_paper",
    "signed_administration","spelling_assistance","supplemental_aids",
    "complex_transcribing","extra_day","math_scribe","other_ds",
    "amplification_devices","bilingual_dictionary","blank_place_markers",
    "color_overlays","highlighters","individual_administration",
    "magnifying_devices","photocopy_nonsecure_materials","projection_devices",
    "read_test_aloud_to_self","reading_aloud_signing_writing",
    "reading_assistance_grade3_math","reminders_to_stay_on_task",
    "scratch_paper","signing_test_directions","small_group_administration",
    "tools_minimize_distractions","translating_test_directions",
]

def gen_state_testing():
    f = CANONICAL / "All_Lively_MS_Students_Accomodations_State_Testing.csv"
    if not f.exists(): return
    with open(f, newline="", encoding="utf-8-sig") as fh:
        all_rows = list(csv.reader(fh))
    rows = []
    for raw in all_rows[4:]:
        if not raw or not str(raw[0]).strip().isdigit(): continue
        def c(i): return raw[i] if i < len(raw) else None
        identity = f"({q(c(0))},{q(c(1))},{q(c(2))},{q(c(3))},{q(c(4))},{b(truthy(c(5)))},{b(truthy(c(6)))},{b(truthy(c(7)))},{q(c(8))}"
        accom = ",".join(b(truthy(c(9+i))) for i in range(len(ACCOM_COLS_SQL)))
        rows.append(f"{identity},{accom},{q(f.name)})")
    if not rows: return
    id_cols = "student_id,first_name,middle_initial,last_name,grade_level,is_sped,is_504,is_lep,subject"
    all_cols = f"{id_cols},{','.join(ACCOM_COLS_SQL)},source_file"
    emit("-- ── state_testing_accommodations ────────────────────────────────────────")
    emit("TRUNCATE TABLE state_testing_accommodations RESTART IDENTITY CASCADE;")
    for i in range(0, len(rows), 500):
        chunk = rows[i:i+500]
        emit(f"INSERT INTO state_testing_accommodations ({all_cols}) VALUES")
        emit(",\n".join(chunk) + ";")
    emit("")

# ── nwea_scores ───────────────────────────────────────────────────────────────
def gen_nwea():
    nwea_files = list(NWEA_DIR.glob("NWEA_*.csv")) if NWEA_DIR.exists() else []
    if not nwea_files: return
    rows = []
    for f in nwea_files:
        with open(f, newline="", encoding="utf-8-sig") as fh:
            for r in csv.DictReader(fh):
                sid = nonempty(r.get("Student ID") or r.get("student_id"))
                if not sid: continue
                def g(k): return q(r.get(k))
                la_authors = g("Language Arts: Author's Purpose and Craft")
                la_vocab   = g("Language Arts: Foundational Language Skills: Vocabulary")
                la_genres  = g("Language Arts: Multiple Genres")
                rows.append(
                    "(" + ",".join([
                        g("Student ID"), g("Student Last Name"), g("Student First Name"), g("Student Middle Initial"),
                        g("Term Tested"), g("Term Rostered"), g("School"), g("Grade"), g("Subject"), g("Course"),
                        g("RIT Score"), g("Rapid-Guessing %"), g("RIT Score 10 Point Range"),
                        g("LexileScore"), g("LexileRange"), g("QuantileScore"), g("QuantileRange"), g("Test Name"),
                        g("Mathematics: Computations and Algebraic Relationships"), g("Mathematics: Data Analysis"),
                        g("Mathematics: Geometry and Measurement"), g("Mathematics: Numerical Representations and Probability"),
                        la_authors, la_vocab, la_genres,
                        g("Science: Earth and space"),
                        g("Science: Matter, force, motion, and energy"), g("Science: Organisms and environments"),
                        g("Mathematics: Describe & Graph Linear Functions, Equations, & Inequalities"),
                        g("Mathematics: Number and Algebraic Methods"),
                        g("Mathematics: Quadratic and Exponential Functions and Equations"),
                        g("Mathematics: Write & Solve Linear Functions, Equations, & Inequalities"),
                        q(f.name),
                    ]) + ")"
                )
    if not rows: return
    cols = ("student_id,last_name,first_name,middle_initial,term_tested,term_rostered,school,grade,subject,course,"
            "rit_score,rapid_guessing_pct,rit_score_10pt_range,lexile_score,lexile_range,quantile_score,quantile_range,test_name,"
            "math_computations_algebraic,math_data_analysis,math_geometry_measurement,math_numerical_probability,"
            "la_authors_purpose_craft,la_foundational_vocabulary,la_multiple_genres,"
            "sci_earth_space,sci_matter_force_motion,sci_organisms_environments,"
            "math_linear_functions,math_number_algebraic_methods,math_quadratic_exponential,math_write_solve_linear,"
            "source_file")
    emit("-- ── nwea_scores ──────────────────────────────────────────────────────────")
    emit("TRUNCATE TABLE nwea_scores RESTART IDENTITY CASCADE;")
    for i in range(0, len(rows), 500):
        chunk = rows[i:i+500]
        emit(f"INSERT INTO nwea_scores ({cols}) VALUES")
        emit(",\n".join(chunk) + ";")
    emit("")

# ── grades_template ───────────────────────────────────────────────────────────
def gen_grades():
    f = ROOT_INPUT / "jacob_spreadsht_ForTemplate.csv"
    if not f.exists(): return
    with open(f, newline="", encoding="utf-8-sig") as fh:
        all_rows = list(csv.reader(fh))
    if len(all_rows) < 3: return
    headers = all_rows[1]
    rows = []
    current = None
    for raw in all_rows[2:]:
        if not any(c.strip() for c in raw): continue
        fn = nonempty(raw[0]) if raw else None
        if fn: current = fn
        def c(i): return q(raw[i] if i < len(raw) else None)
        raw_json = q(json.dumps(dict(zip(headers, raw))))
        rows.append(f"(NULL,{q(current)},{c(2)},{c(3)},{c(4)},{c(5)},{c(6)},{c(7)},{c(8)},{c(9)},{c(10)},{c(11)},{c(12)},{c(13)},{c(14)},{c(15)},{c(16)},{c(17)},{c(18)},{c(19)},{raw_json},{q(f.name)})")
    if not rows: return
    cols = "student_id,first_name,teacher,course_id,course_name,nine_wk_1,nine_wk_2,s1_exam,s1_avg,s1_att,pr_5,pr_6,nine_wk_3,nine_wk_4,s2_exam,s2_avg,s2_att,year_avg,yr_avg,yr_att,raw_row,source_file"
    emit("-- ── grades_template ─────────────────────────────────────────────────────")
    emit("TRUNCATE TABLE grades_template RESTART IDENTITY CASCADE;")
    emit(f"INSERT INTO grades_template ({cols}) VALUES")
    emit(",\n".join(rows) + ";")
    emit("")

# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    output_path = Path("/tmp/galexii_seed.sql")
    gen_roster()
    gen_accommodations()
    gen_state_testing()
    gen_nwea()
    gen_grades()

    sql = "\n".join(out)
    output_path.write_text(sql, encoding="utf-8")
    line_count = sql.count("\n")
    print(f"✓ Wrote {line_count:,} lines to {output_path}", file=sys.stderr)
    print(f"  Now paste {output_path} into the Supabase SQL Editor.", file=sys.stderr)
