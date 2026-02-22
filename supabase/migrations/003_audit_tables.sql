-- ============================================================
-- Migration 003: Audit Output Tables + NWEA + All Lively Accommodations
-- Project: SpEdGalexii (oknwpgijmruhrxugclnm)
-- ============================================================

-- ============================================================
-- compliance_table
-- Source: output/COMPLIANCE_TABLE__ALL_CASE_MANAGERS.xlsx
-- 215 rows, 35 cols
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_table (
  id                  BIGSERIAL   PRIMARY KEY,
  student_id          TEXT,
  student_name        TEXT,
  case_manager        TEXT,
  school              TEXT,
  grade               TEXT,
  age                 TEXT,
  primary_disability  TEXT,
  plan_status         TEXT,
  plan_start          TEXT,
  plan_end            TEXT,
  ard_status          TEXT,
  days_to_ard         TEXT,
  last_fie_date       TEXT,
  next_fie_due        TEXT,
  fie_status          TEXT,
  days_to_fie         TEXT,
  eval_needed         TEXT,
  reed_type           TEXT,
  reed_date           TEXT,
  reed_eval_due       TEXT,
  reed_status         TEXT,
  days_to_reed        TEXT,
  has_bip             TEXT,
  bip_date            TEXT,
  bip_status          TEXT,
  has_fba             TEXT,
  fba_date            TEXT,
  fba_status          TEXT,
  esy                 TEXT,
  medically_fragile   TEXT,
  assistive_tech      TEXT,
  dyslexia            TEXT,
  compliance_score    TEXT,
  overdue_count       TEXT,
  warning_count       TEXT,
  generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_student ON compliance_table(student_id);
CREATE INDEX IF NOT EXISTS idx_compliance_cm ON compliance_table(case_manager);


-- ============================================================
-- goals_table
-- Source: output/GOALS_TABLE__ALL_CASE_MANAGERS.xlsx
-- 990 rows, 25 cols
-- ============================================================
CREATE TABLE IF NOT EXISTS goals_table (
  id                          BIGSERIAL   PRIMARY KEY,
  student_id                  TEXT,
  last_name                   TEXT,
  first_name                  TEXT,
  case_manager                TEXT,
  school_name                 TEXT,
  grade                       TEXT,
  status                      TEXT,
  domain                      TEXT,
  goal_description            TEXT,
  is_academic_goal            TEXT,
  is_functional_goal          TEXT,
  is_related_services_goal    TEXT,
  is_transition_related       TEXT,
  objective_description       TEXT,
  implementer                 TEXT,
  total_score                 TEXT,
  quality_rating              TEXT,
  timeframe_score             TEXT,
  condition_score             TEXT,
  behavior_score              TEXT,
  criterion_score             TEXT,
  timeframe_excerpt           TEXT,
  condition_excerpt           TEXT,
  behavior_excerpt            TEXT,
  criterion_excerpt           TEXT,
  generated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_student ON goals_table(student_id);
CREATE INDEX IF NOT EXISTS idx_goals_cm ON goals_table(case_manager);


-- ============================================================
-- required_audit_table
-- Source: output/REQUIRED_AUDIT_TABLE__ALL_CASE_MANAGERS.xlsx
-- 209 rows, 11 cols
-- ============================================================
CREATE TABLE IF NOT EXISTS required_audit_table (
  id                          BIGSERIAL   PRIMARY KEY,
  student_name                TEXT,
  id_number                   TEXT,
  case_manager                TEXT,
  testhound_state_id          TEXT,
  testhound_included          TEXT,
  testhound_status            TEXT,
  date_accommodation          TEXT,
  annual_ard_question         TEXT,
  classroom_testing_match     TEXT,
  testhound_match             TEXT,
  notes                       TEXT,
  generated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_required_audit_id ON required_audit_table(id_number);
CREATE INDEX IF NOT EXISTS idx_required_audit_cm ON required_audit_table(case_manager);


-- ============================================================
-- services_table
-- Source: output/SERVICES_TABLE__ALL_CASE_MANAGERS.xlsx
-- 140 rows, 40 cols
-- ============================================================
CREATE TABLE IF NOT EXISTS services_table (
  id                          BIGSERIAL   PRIMARY KEY,
  student_id                  TEXT,
  last_name                   TEXT,
  first_name                  TEXT,
  case_manager                TEXT,
  school_name                 TEXT,
  grade                       TEXT,
  status                      TEXT,
  disability                  TEXT,
  program_name                TEXT,
  instructional_setting_code  TEXT,
  setting_category            TEXT,
  speech_therapy_code         TEXT,
  start_date                  TEXT,
  end_date                    TEXT,
  plan_start_date             TEXT,
  plan_end_date               TEXT,
  iep_event_name              TEXT,
  bip_date                    TEXT,
  fba_date                    TEXT,
  evaluation_date             TEXT,
  assistive_tech_indicator    TEXT,
  esy                         TEXT,
  nursing                     TEXT,
  dyslexia_indicator_code     TEXT,
  medically_fragile           TEXT,
  el_eb                       TEXT,
  speech_indicator            TEXT,
  ot_indicator                TEXT,
  pt_indicator                TEXT,
  counseling                  TEXT,
  audiology                   TEXT,
  interpreter                 TEXT,
  psych_services              TEXT,
  rec_therapy                 TEXT,
  school_health               TEXT,
  social_work                 TEXT,
  transition                  TEXT,
  assistive_tech_peims        TEXT,
  med_fragile_peims           TEXT,
  rdspd_service               TEXT,
  generated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_student ON services_table(student_id);
CREATE INDEX IF NOT EXISTS idx_services_cm ON services_table(case_manager);


-- ============================================================
-- assessment_profile
-- Source: output/ASSESSMENT_PROFILE__ALL_CASE_MANAGERS.xlsx
-- 209 rows, 25 cols
-- ============================================================
CREATE TABLE IF NOT EXISTS assessment_profile (
  id                          BIGSERIAL   PRIMARY KEY,
  student_id                  TEXT,
  student_name                TEXT,
  case_manager                TEXT,
  school                      TEXT,
  grade                       TEXT,
  primary_disability          TEXT,
  secondary_disability        TEXT,
  tertiary_disability         TEXT,
  lle_meeting_date            TEXT,
  assessment_pathway          TEXT,
  staar_alt2                  TEXT,
  staar_alt2_summary          TEXT,
  considered_for_staar_alt2   TEXT,
  medical_eligibility         TEXT,
  naar_eligibility            TEXT,
  telpas_type                 TEXT,
  telpas_alt                  TEXT,
  telpas_basic_transcribing   TEXT,
  telpas_structured_reminder  TEXT,
  telpas_large_print          TEXT,
  telpas_manipulating_materials TEXT,
  testing_accommodation_count TEXT,
  testing_accommodations      TEXT,
  all_accommodation_count     TEXT,
  all_accommodations          TEXT,
  generated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessment_student ON assessment_profile(student_id);
CREATE INDEX IF NOT EXISTS idx_assessment_cm ON assessment_profile(case_manager);


-- ============================================================
-- nwea_map
-- Source: input/_NWEA_ANALYSIS/NWEA_180303524.csv
-- 468 rows, 32 cols
-- ============================================================
CREATE TABLE IF NOT EXISTS nwea_map (
  id                                              BIGSERIAL   PRIMARY KEY,
  student_id                                      TEXT,
  student_last_name                               TEXT,
  student_first_name                              TEXT,
  student_middle_initial                          TEXT,
  term_tested                                     TEXT,
  term_rostered                                   TEXT,
  school                                          TEXT,
  grade                                           TEXT,
  subject                                         TEXT,
  course                                          TEXT,
  rit_score                                       TEXT,
  rapid_guessing_pct                              TEXT,
  rit_score_10pt_range                            TEXT,
  lexile_score                                    TEXT,
  lexile_range                                    TEXT,
  quantile_score                                  TEXT,
  quantile_range                                  TEXT,
  test_name                                       TEXT,
  -- subject strand scores (stored as TEXT to handle empty cells)
  math_computations_algebraic                     TEXT,
  math_data_analysis                              TEXT,
  math_geometry_measurement                       TEXT,
  math_numerical_representations                  TEXT,
  ela_authors_purpose                             TEXT,
  ela_vocabulary                                  TEXT,
  ela_multiple_genres                             TEXT,
  science_earth_space                             TEXT,
  science_matter_force_motion                     TEXT,
  science_organisms_environments                  TEXT,
  math_linear_functions                           TEXT,
  math_number_algebraic_methods                   TEXT,
  math_quadratic_exponential                      TEXT,
  math_write_solve_linear                         TEXT,
  source_file                                     TEXT,
  uploaded_at                                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nwea_map_student ON nwea_map(student_id);
CREATE INDEX IF NOT EXISTS idx_nwea_map_subject ON nwea_map(subject);
CREATE INDEX IF NOT EXISTS idx_nwea_map_term ON nwea_map(term_tested);


-- ============================================================
-- lively_accommodations
-- Source: input/_CANONICAL/All_Lively_MS_Students_Accomodations_State_Testing.csv
-- 421 rows, complex multi-row header — flattened here
-- ============================================================
CREATE TABLE IF NOT EXISTS lively_accommodations (
  id                              BIGSERIAL   PRIMARY KEY,
  student_id                      TEXT,
  first_name                      TEXT,
  mi                              TEXT,
  last_name                       TEXT,
  grade_level                     TEXT,
  sped                            TEXT,
  plan_504                        TEXT,
  lep                             TEXT,
  subject                         TEXT,
  -- Online / Version
  staar_alt2                      TEXT,
  asl_videos                      TEXT,
  auto_text_to_speech             TEXT,
  basic_calculator_online         TEXT,
  content_language_supports       TEXT,
  permissive_mode                 TEXT,
  proctored_administration        TEXT,
  refreshable_braille_contracted  TEXT,
  refreshable_braille_uncontracted TEXT,
  spanish_online                  TEXT,
  speech_to_text                  TEXT,
  spell_check                     TEXT,
  text_to_speech                  TEXT,
  word_prediction                 TEXT,
  -- Presentation
  braille_contracted              TEXT,
  braille_uncontracted            TEXT,
  large_print                     TEXT,
  spanish                         TEXT,
  -- DS
  basic_transcribing              TEXT,
  calculation_aids                TEXT,
  extra_time                      TEXT,
  individualized_structured_reminders TEXT,
  manipulating_test_materials     TEXT,
  mathematics_manipulatives       TEXT,
  oral_admin_student_request_paper TEXT,
  oral_admin_change_support_paper TEXT,
  oral_admin_qa_paper             TEXT,
  signed_administration           TEXT,
  spelling_assistance             TEXT,
  supplemental_aids               TEXT,
  -- DS* TEA
  complex_transcribing            TEXT,
  extra_day                       TEXT,
  math_scribe                     TEXT,
  other_ds_tea                    TEXT,
  -- AF
  amplification_devices           TEXT,
  bilingual_dictionary            TEXT,
  blank_place_markers             TEXT,
  color_overlays                  TEXT,
  highlighters                    TEXT,
  individual_administration       TEXT,
  magnifying_devices              TEXT,
  photocopy_nonsecure             TEXT,
  projection_devices              TEXT,
  read_test_aloud_to_self         TEXT,
  reading_aloud_signing_prompt    TEXT,
  reading_assistance_grade3_math  TEXT,
  reminders_stay_on_task          TEXT,
  scratch_paper                   TEXT,
  signing_test_admin_directions   TEXT,
  small_group_administration      TEXT,
  tools_minimize_distractions     TEXT,
  translating_test_admin_directions TEXT,
  source_file                     TEXT,
  uploaded_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lively_accom_student ON lively_accommodations(student_id);
CREATE INDEX IF NOT EXISTS idx_lively_accom_grade ON lively_accommodations(grade_level);
