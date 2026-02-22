#!/usr/bin/env python3
"""
seed_audit_tables.py — bulk COPY seeder for audit tables.
Usage: python3 galaxy-iep-accommodations/scripts/seed_audit_tables.py
"""
import os, csv, subprocess, sys, tempfile, io
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT  = SCRIPT_DIR.parent
AUDIT_ROOT = REPO_ROOT.parent
OUTPUT     = AUDIT_ROOT / "output"
INPUT      = AUDIT_ROOT / "input"
CANONICAL  = INPUT / "_CANONICAL"
NWEA_DIR   = INPUT / "_NWEA_ANALYSIS"

DB_URL = (
    "postgresql://postgres.oknwpgijmruhrxugclnm:"
    "putzys-dAtxa1-zaqmos"
    "@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
)
PSQL = os.environ.get("PSQL_BIN", "/opt/homebrew/opt/libpq/bin/psql")

def read_xlsx(path):
    try: import openpyxl
    except ImportError: print("pip install openpyxl"); sys.exit(1)
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    if not rows: return [], []
    return [str(h or "").strip() for h in rows[0]], rows[1:]

def read_csv_file(path, skip_rows=0):
    with open(path, newline="", encoding="utf-8-sig") as f:
        r = csv.reader(f)
        for _ in range(skip_rows): next(r)
        headers = next(r)
        return headers, list(r)

def bulk_insert(table, db_cols, data_rows, source_col=None):
    subprocess.run([PSQL, DB_URL, "-c",
        f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE;"],
        capture_output=True)
    all_cols = ([source_col[0]] + db_cols) if source_col else db_cols
    buf = io.StringIO()
    w = csv.writer(buf, quoting=csv.QUOTE_ALL)
    for row in data_rows:
        vals = ([source_col[1]] if source_col else []) + [
            str(row[i]) if i < len(row) and row[i] is not None else ""
            for i in range(len(db_cols))]
        w.writerow(vals)
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False, encoding="utf-8") as f:
        f.write(buf.getvalue()); csv_path = f.name
    r = subprocess.run([PSQL, DB_URL, "-c",
        f"\\COPY {table} ({', '.join(all_cols)}) FROM '{csv_path}' CSV NULL ''"],
        capture_output=True, text=True)
    os.unlink(csv_path)
    if r.returncode != 0: print(f"  ERROR {table}: {r.stderr[:200]}")
    else: print(f"  OK  {len(data_rows):>5} rows -> {table}")

def mc(headers, col_map):
    db_cols, idxs = [], []
    for i, h in enumerate(headers):
        if h in col_map: db_cols.append(col_map[h]); idxs.append(i)
    return db_cols, idxs

def remap(rows, idxs):
    return [[row[i] if i < len(row) else "" for i in idxs] for row in rows]

def seed_compliance():
    print("compliance_table...")
    h, rows = read_xlsx(OUTPUT / "COMPLIANCE_TABLE__ALL_CASE_MANAGERS.xlsx")
    cm = {"Student ID":"student_id","Student Name":"student_name","Case Manager":"case_manager",
        "School":"school","Grade":"grade","Age":"age","Primary Disability":"primary_disability",
        "Plan Status":"plan_status","Plan Start":"plan_start","Plan End":"plan_end",
        "ARD Status":"ard_status","Days to ARD":"days_to_ard","Last FIE Date":"last_fie_date",
        "Next FIE Due":"next_fie_due","FIE Status":"fie_status","Days to FIE":"days_to_fie",
        "Eval Needed":"eval_needed","REED Type":"reed_type","REED Date":"reed_date",
        "REED Eval Due":"reed_eval_due","REED Status":"reed_status","Days to REED":"days_to_reed",
        "Has BIP":"has_bip","BIP Date":"bip_date","BIP Status":"bip_status",
        "Has FBA":"has_fba","FBA Date":"fba_date","FBA Status":"fba_status",
        "ESY":"esy","Medically Fragile":"medically_fragile","Assistive Tech":"assistive_tech",
        "Dyslexia":"dyslexia","Compliance Score":"compliance_score",
        "Overdue Count":"overdue_count","Warning Count":"warning_count"}
    dc, ix = mc(h, cm); bulk_insert("compliance_table", dc, remap(rows, ix))

def seed_goals():
    print("goals_table...")
    h, rows = read_xlsx(OUTPUT / "GOALS_TABLE__ALL_CASE_MANAGERS.xlsx")
    cm = {"Student ID":"student_id","Last Name":"last_name","First Name":"first_name",
        "Case Manager":"case_manager","School Name":"school_name","Grade":"grade",
        "Status":"status","Domain":"domain","Goal Description":"goal_description",
        "Is Academic Goal Type":"is_academic_goal","Is Functional Goal Type":"is_functional_goal",
        "Is Related Services Goal Type":"is_related_services_goal",
        "Is Transition Related":"is_transition_related",
        "Objective Description":"objective_description","Implementer":"implementer",
        "total_score":"total_score","Quality Rating":"quality_rating",
        "timeframe_score":"timeframe_score","condition_score":"condition_score",
        "behavior_score":"behavior_score","criterion_score":"criterion_score",
        "timeframe_excerpt":"timeframe_excerpt","condition_excerpt":"condition_excerpt",
        "behavior_excerpt":"behavior_excerpt","criterion_excerpt":"criterion_excerpt"}
    dc, ix = mc(h, cm); bulk_insert("goals_table", dc, remap(rows, ix))

def seed_required_audit():
    print("required_audit_table...")
    h, rows = read_xlsx(OUTPUT / "REQUIRED_AUDIT_TABLE__ALL_CASE_MANAGERS.xlsx")
    db_cols = ["student_name","id_number","case_manager","testhound_state_id",
        "testhound_included","testhound_status","date_accommodation",
        "annual_ard_question","classroom_testing_match","testhound_match","notes"]
    mapped = [[row[i] if i < len(row) else "" for i in range(len(db_cols))] for row in rows]
    bulk_insert("required_audit_table", db_cols, mapped)

def seed_services():
    print("services_table...")
    h, rows = read_xlsx(OUTPUT / "SERVICES_TABLE__ALL_CASE_MANAGERS.xlsx")
    cm = {"Student ID":"student_id","Last Name":"last_name","First Name":"first_name",
        "Case Manager":"case_manager","School Name":"school_name","Grade":"grade",
        "Status":"status","Disability":"disability","Program Name":"program_name",
        "Instructional Setting Code":"instructional_setting_code",
        "Setting Category":"setting_category","Speech Therapy Code":"speech_therapy_code",
        "Start Date":"start_date","End Date":"end_date",
        "Plan Start Date":"plan_start_date","Plan End Date":"plan_end_date",
        "IEP Event Name":"iep_event_name","BIP Date":"bip_date","FBA Date":"fba_date",
        "Evaluation Date":"evaluation_date","Assistive Tech Indicator":"assistive_tech_indicator",
        "ESY":"esy","Nursing":"nursing","Dyslexia Indicator Code":"dyslexia_indicator_code",
        "Medically Fragile":"medically_fragile","EL/EB":"el_eb",
        "Speech Indicator":"speech_indicator","OT Indicator":"ot_indicator",
        "PT Indicator":"pt_indicator","Counseling":"counseling","Audiology":"audiology",
        "Interpreter":"interpreter","Psych Services":"psych_services",
        "Rec Therapy":"rec_therapy","School Health":"school_health",
        "Social Work":"social_work","Transition":"transition",
        "Assistive Tech (PEIMS)":"assistive_tech_peims",
        "Med Fragile (PEIMS)":"med_fragile_peims","RDSPD Service":"rdspd_service"}
    dc, ix = mc(h, cm); bulk_insert("services_table", dc, remap(rows, ix))

def seed_assessment():
    print("assessment_profile...")
    h, rows = read_xlsx(OUTPUT / "ASSESSMENT_PROFILE__ALL_CASE_MANAGERS.xlsx")
    cm = {"Student ID":"student_id","Student Name":"student_name","Case Manager":"case_manager",
        "School":"school","Grade":"grade","Primary Disability":"primary_disability",
        "Secondary Disability":"secondary_disability","Tertiary Disability":"tertiary_disability",
        "LLE Meeting Date":"lle_meeting_date","Assessment Pathway":"assessment_pathway",
        "STAAR Alt 2":"staar_alt2","STAAR Alt 2 Summary":"staar_alt2_summary",
        "Considered for STAAR Alt 2":"considered_for_staar_alt2",
        "Medical Eligibility":"medical_eligibility","NAAR Eligibility":"naar_eligibility",
        "TELPAS Type":"telpas_type","TELPAS Alt":"telpas_alt",
        "TELPAS: Basic Transcribing":"telpas_basic_transcribing",
        "TELPAS: Structured Reminder":"telpas_structured_reminder",
        "TELPAS: Large Print":"telpas_large_print",
        "TELPAS: Manipulating Materials":"telpas_manipulating_materials",
        "Testing Accommodation Count":"testing_accommodation_count",
        "Testing Accommodations":"testing_accommodations",
        "All Accommodation Count":"all_accommodation_count",
        "All Accommodations":"all_accommodations"}
    dc, ix = mc(h, cm); bulk_insert("assessment_profile", dc, remap(rows, ix))

def seed_nwea():
    print("nwea_map...")
    path = NWEA_DIR / "NWEA_180303524.csv"
    h, rows = read_csv_file(path)
    db_cols = ["student_id","student_last_name","student_first_name","student_middle_initial",
        "term_tested","term_rostered","school","grade","subject","course",
        "rit_score","rapid_guessing_pct","rit_score_10pt_range",
        "lexile_score","lexile_range","quantile_score","quantile_range","test_name",
        "math_computations_algebraic","math_data_analysis","math_geometry_measurement",
        "math_numerical_representations","ela_authors_purpose","ela_vocabulary",
        "ela_multiple_genres","science_earth_space","science_matter_force_motion",
        "science_organisms_environments","math_linear_functions",
        "math_number_algebraic_methods","math_quadratic_exponential","math_write_solve_linear"]
    bulk_insert("nwea_map", db_cols, rows, source_col=("source_file", path.name))

def seed_lively():
    print("lively_accommodations...")
    path = CANONICAL / "All_Lively_MS_Students_Accomodations_State_Testing.csv"
    with open(path, newline="", encoding="utf-8-sig") as f:
        all_rows = list(csv.reader(f))
    data_rows = [r for r in all_rows[4:] if any(v.strip() for v in r)]
    db_cols = ["student_id","first_name","mi","last_name","grade_level","sped","plan_504","lep","subject",
        "staar_alt2","asl_videos","auto_text_to_speech","basic_calculator_online",
        "content_language_supports","permissive_mode","proctored_administration",
        "refreshable_braille_contracted","refreshable_braille_uncontracted",
        "spanish_online","speech_to_text","spell_check","text_to_speech","word_prediction",
        "braille_contracted","braille_uncontracted","large_print","spanish",
        "basic_transcribing","calculation_aids","extra_time",
        "individualized_structured_reminders","manipulating_test_materials",
        "mathematics_manipulatives","oral_admin_student_request_paper",
        "oral_admin_change_support_paper","oral_admin_qa_paper",
        "signed_administration","spelling_assistance","supplemental_aids",
        "complex_transcribing","extra_day","math_scribe","other_ds_tea",
        "amplification_devices","bilingual_dictionary","blank_place_markers",
        "color_overlays","highlighters","individual_administration",
        "magnifying_devices","photocopy_nonsecure","projection_devices",
        "read_test_aloud_to_self","reading_aloud_signing_prompt",
        "reading_assistance_grade3_math","reminders_stay_on_task","scratch_paper",
        "signing_test_admin_directions","small_group_administration",
        "tools_minimize_distractions","translating_test_admin_directions"]
    bulk_insert("lively_accommodations", db_cols, data_rows, source_col=("source_file", path.name))

if __name__ == "__main__":
    print("=== Seeding audit tables -> SpEdGalexii ===\n")
    seed_compliance()
    seed_goals()
    seed_required_audit()
    seed_services()
    seed_assessment()
    seed_nwea()
    seed_lively()
    print("\nDone.")
