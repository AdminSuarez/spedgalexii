-- ============================================================
-- Galexii Canonical Input Tables
-- Migration: 001_canonical_tables.sql
--
-- Tables:
--   roster                       ← roster.csv
--   accommodations               ← accommodations.csv
--   state_testing_accommodations ← All_Lively_MS_Students_Accomodations_State_Testing.csv
--   nwea_scores                  ← NWEA_180303524.csv
--   grades_template              ← jacob_spreadsht_ForTemplate.csv
--
-- All tables include:
--   uploaded_at  TIMESTAMPTZ  — when the row was seeded/upserted
--   source_file  TEXT         — which file it came from
-- ============================================================

-- ── roster ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roster (
  id                  BIGSERIAL PRIMARY KEY,
  student_id          TEXT        NOT NULL,
  district_student_id TEXT,
  last_name           TEXT,
  first_name          TEXT,
  student_name        TEXT,
  grade               TEXT,
  case_manager        TEXT,
  school              TEXT,
  campus              TEXT,
  source_file         TEXT,
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS roster_student_id_uidx ON roster (student_id);

-- ── accommodations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accommodations (
  id                  BIGSERIAL PRIMARY KEY,
  student_id          TEXT        NOT NULL,
  last_name           TEXT,
  first_name          TEXT,
  case_manager        TEXT,
  campus              TEXT,
  grade               TEXT,
  status              TEXT,
  program_type        TEXT,
  disabilities        TEXT,
  event_name          TEXT,
  lle_meeting_date    TEXT,
  accommodation_type  TEXT,
  accommodation_name  TEXT,
  subjects            TEXT,
  description         TEXT,
  start_date          TEXT,
  end_date            TEXT,
  source_file         TEXT,
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS accommodations_student_id_idx ON accommodations (student_id);
CREATE INDEX IF NOT EXISTS accommodations_case_manager_idx ON accommodations (case_manager);

-- ── state_testing_accommodations ──────────────────────────────────────────────
-- Each row = one student × one subject, with boolean flags for each accommodation.
CREATE TABLE IF NOT EXISTS state_testing_accommodations (
  id                              BIGSERIAL PRIMARY KEY,
  student_id                      TEXT        NOT NULL,
  first_name                      TEXT,
  middle_initial                  TEXT,
  last_name                       TEXT,
  grade_level                     TEXT,
  is_sped                         BOOLEAN,
  is_504                          BOOLEAN,
  is_lep                          BOOLEAN,
  subject                         TEXT,
  -- Online accommodations
  staar_alt2                      BOOLEAN,
  asl_videos                      BOOLEAN,
  auto_text_to_speech             BOOLEAN,
  basic_calculator_online         BOOLEAN,
  content_and_language_supports   BOOLEAN,
  permissive_mode                 BOOLEAN,
  proctored_administration        BOOLEAN,
  refreshable_braille_contracted  BOOLEAN,
  refreshable_braille_uncontracted BOOLEAN,
  spanish_online                  BOOLEAN,
  speech_to_text                  BOOLEAN,
  spell_check                     BOOLEAN,
  text_to_speech                  BOOLEAN,
  word_prediction                 BOOLEAN,
  -- Presentation accommodations
  braille_contracted              BOOLEAN,
  braille_uncontracted            BOOLEAN,
  large_print                     BOOLEAN,
  spanish                         BOOLEAN,
  -- Other accommodations
  basic_transcribing              BOOLEAN,
  calculation_aids                BOOLEAN,
  extra_time                      BOOLEAN,
  individualized_structured_reminders BOOLEAN,
  manipulating_test_materials     BOOLEAN,
  mathematics_manipulatives       BOOLEAN,
  oral_admin_student_request_paper BOOLEAN,
  oral_admin_change_support_paper BOOLEAN,
  oral_admin_qa_paper             BOOLEAN,
  signed_administration           BOOLEAN,
  spelling_assistance             BOOLEAN,
  supplemental_aids               BOOLEAN,
  complex_transcribing            BOOLEAN,
  extra_day                       BOOLEAN,
  math_scribe                     BOOLEAN,
  other_ds                        BOOLEAN,
  -- AF accommodations
  amplification_devices           BOOLEAN,
  bilingual_dictionary            BOOLEAN,
  blank_place_markers             BOOLEAN,
  color_overlays                  BOOLEAN,
  highlighters                    BOOLEAN,
  individual_administration       BOOLEAN,
  magnifying_devices              BOOLEAN,
  photocopy_nonsecure_materials   BOOLEAN,
  projection_devices              BOOLEAN,
  read_test_aloud_to_self         BOOLEAN,
  reading_aloud_signing_writing   BOOLEAN,
  reading_assistance_grade3_math  BOOLEAN,
  reminders_to_stay_on_task       BOOLEAN,
  scratch_paper                   BOOLEAN,
  signing_test_directions         BOOLEAN,
  small_group_administration      BOOLEAN,
  tools_minimize_distractions     BOOLEAN,
  translating_test_directions     BOOLEAN,
  source_file                     TEXT,
  uploaded_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sta_student_id_idx ON state_testing_accommodations (student_id);
CREATE INDEX IF NOT EXISTS sta_subject_idx    ON state_testing_accommodations (subject);

-- ── nwea_scores ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nwea_scores (
  id                        BIGSERIAL PRIMARY KEY,
  student_id                TEXT,
  last_name                 TEXT,
  first_name                TEXT,
  middle_initial            TEXT,
  term_tested               TEXT,
  term_rostered             TEXT,
  school                    TEXT,
  grade                     TEXT,
  subject                   TEXT,
  course                    TEXT,
  rit_score                 NUMERIC,
  rapid_guessing_pct        NUMERIC,
  rit_score_10pt_range      TEXT,
  lexile_score              TEXT,
  lexile_range              TEXT,
  quantile_score            TEXT,
  quantile_range            TEXT,
  test_name                 TEXT,
  -- Math strand scores (stored as text to handle nulls gracefully)
  math_computations_algebraic   TEXT,
  math_data_analysis            TEXT,
  math_geometry_measurement     TEXT,
  math_numerical_probability    TEXT,
  -- Language Arts strand scores
  la_authors_purpose_craft      TEXT,
  la_foundational_vocabulary    TEXT,
  la_multiple_genres            TEXT,
  -- Science strand scores
  sci_earth_space               TEXT,
  sci_matter_force_motion       TEXT,
  sci_organisms_environments    TEXT,
  -- Algebra strand scores
  math_linear_functions         TEXT,
  math_number_algebraic_methods TEXT,
  math_quadratic_exponential    TEXT,
  math_write_solve_linear       TEXT,
  source_file                   TEXT,
  uploaded_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nwea_student_id_idx ON nwea_scores (student_id);
CREATE INDEX IF NOT EXISTS nwea_subject_idx    ON nwea_scores (subject);
CREATE INDEX IF NOT EXISTS nwea_term_idx       ON nwea_scores (term_tested);

-- ── grades_template ───────────────────────────────────────────────────────────
-- Jacob's spreadsheet — irregular multi-header format, stored as flexible rows.
CREATE TABLE IF NOT EXISTS grades_template (
  id           BIGSERIAL PRIMARY KEY,
  student_id   TEXT,
  first_name   TEXT,
  teacher      TEXT,
  course_id    TEXT,
  course_name  TEXT,
  nine_wk_1    TEXT,
  nine_wk_2    TEXT,
  s1_exam      TEXT,
  s1_avg       TEXT,
  s1_att       TEXT,
  pr_5         TEXT,
  pr_6         TEXT,
  nine_wk_3    TEXT,
  nine_wk_4    TEXT,
  s2_exam      TEXT,
  s2_avg       TEXT,
  s2_att       TEXT,
  year_avg     TEXT,
  yr_avg       TEXT,
  yr_att       TEXT,
  raw_row      JSONB,   -- full row as JSON for any extra columns
  source_file  TEXT,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS grades_student_id_idx ON grades_template (student_id);

-- ── Row-level security (off by default — server routes use service role) ──────
ALTER TABLE roster                       DISABLE ROW LEVEL SECURITY;
ALTER TABLE accommodations               DISABLE ROW LEVEL SECURITY;
ALTER TABLE state_testing_accommodations DISABLE ROW LEVEL SECURITY;
ALTER TABLE nwea_scores                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE grades_template              DISABLE ROW LEVEL SECURITY;
