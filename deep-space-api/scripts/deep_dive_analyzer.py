#!/usr/bin/env python3
"""
SpEdGalexii Deep Dive Analyzer
Automated IEP document analysis for case managers

Usage:
    python3 scripts/deep_dive_analyzer.py --student 10147287
    python3 scripts/deep_dive_analyzer.py --all  # Process all students
    python3 scripts/deep_dive_analyzer.py --student 10147287 --map-file input/_REFERENCE/MAP_StudentProfile.xlsx
"""

import os
import re
import json
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict
from difflib import SequenceMatcher
import argparse

# Configuration - supports environment variables for web app integration
IEP_FOLDER = Path(os.environ.get("GALEXII_IEP_FOLDER", "ieps"))
OUTPUT_FOLDER = Path(os.environ.get("GALEXII_OUTPUT_FOLDER", "audit"))
REFERENCE_FOLDER = Path(os.environ.get("GALEXII_REFERENCE_FOLDER", "input/_REFERENCE"))
STUDENT_PROFILE_FOLDER = Path(os.environ.get("GALEXII_STUDENT_PROFILE_FOLDER", "output/student_profiles"))
OUTPUT_FOLDER.mkdir(exist_ok=True)

# Import MAP parser if available
try:
    from map_parser import load_map_excel, MAPDataParser
    MAP_PARSER_AVAILABLE = True
except ImportError:
    MAP_PARSER_AVAILABLE = False

# Import pandas for assessment profile (optional)
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

# Assessment profile path
ASSESSMENT_PROFILE_PATH = Path(os.environ.get("GALEXII_ASSESSMENT_PROFILE", "output/ASSESSMENT_PROFILE__ALL_CASE_MANAGERS.xlsx"))

# Lively-wide Frontline/FERPA CSVs used for richer Deep Dive context
GOALS_CSV_PATH = REFERENCE_FOLDER / "Goals_By_Student-4.csv"
ACCOMMODATIONS_CSV_PATH = REFERENCE_FOLDER / "Student_Accommodations-9.csv"
TELPAS_CSV_PATH = REFERENCE_FOLDER / "Telpas_By_Student-2.csv"
BIP_CSV_PATH = REFERENCE_FOLDER / "IEP_Students_With_A_BIP-2.csv"
TRANSPORT_CSV_PATH = REFERENCE_FOLDER / "Transportation_By_Student.csv"

class StudentDocumentAnalyzer:
    """Analyzes all documents for a single student."""
    
    def __init__(self, student_id: str, map_file: str = None):
        self.student_id = student_id
        self.documents = []
        self.extracted_text = {}
        self.alerts = []
        self.analysis = {}
        self.map_file = map_file
        self.map_data = None
        self.assessment_profile = None
        self.student_profile = None
        self.compliance_profile = None
        self.accommodations_profile = None
        self.goals_profile = None
        self.telpas_profile = None
        self.behavior_intervention = None
        self.transportation_profile = None
        
    def _load_assessment_profile(self) -> dict:
        """Load assessment profile from Frontline export."""
        if not PANDAS_AVAILABLE:
            return None
        
        if not ASSESSMENT_PROFILE_PATH.exists():
            return None
        
        try:
            df = pd.read_excel(ASSESSMENT_PROFILE_PATH, sheet_name='Assessment Profiles')
            match = df[df['Student ID'].astype(str) == self.student_id]
            if match.empty:
                return None
            
            row = match.iloc[0]
            self.assessment_profile = {
                'student_name': row['Student Name'] if pd.notna(row['Student Name']) else None,
                'grade': int(row['Grade']) if pd.notna(row['Grade']) else None,
                'primary_disability': row['Primary Disability'] if pd.notna(row['Primary Disability']) else None,
                'secondary_disability': row['Secondary Disability'] if pd.notna(row['Secondary Disability']) else None,
                'tertiary_disability': row['Tertiary Disability'] if pd.notna(row['Tertiary Disability']) else None,
                'lle_meeting_date': row['LLE Meeting Date'] if pd.notna(row['LLE Meeting Date']) else None,
                'assessment_pathway': row['Assessment Pathway'] if pd.notna(row['Assessment Pathway']) else None,
                'staar_alt_2': row['STAAR Alt 2'] if pd.notna(row['STAAR Alt 2']) else None,
                'staar_alt_2_summary': row['STAAR Alt 2 Summary'] if pd.notna(row['STAAR Alt 2 Summary']) else None,
                'considered_for_staar_alt_2': row['Considered for STAAR Alt 2'] if pd.notna(row['Considered for STAAR Alt 2']) else None,
                'medical_eligibility': row['Medical Eligibility'] if pd.notna(row['Medical Eligibility']) else None,
                'naar_eligibility': row['NAAR Eligibility'] if pd.notna(row['NAAR Eligibility']) else None,
                'telpas_type': row['TELPAS Type'] if pd.notna(row['TELPAS Type']) else None,
                'telpas_alt': row['TELPAS Alt'] if pd.notna(row['TELPAS Alt']) else None,
                'telpas_basic_transcribing': row['TELPAS: Basic Transcribing'] if pd.notna(row['TELPAS: Basic Transcribing']) else None,
                'telpas_structured_reminder': row['TELPAS: Structured Reminder'] if pd.notna(row['TELPAS: Structured Reminder']) else None,
                'telpas_large_print': row['TELPAS: Large Print'] if pd.notna(row['TELPAS: Large Print']) else None,
                'telpas_manipulating_materials': row['TELPAS: Manipulating Materials'] if pd.notna(row['TELPAS: Manipulating Materials']) else None,
                'testing_accommodation_count': int(row['Testing Accommodation Count']) if pd.notna(row['Testing Accommodation Count']) else 0,
                'testing_accommodations': row['Testing Accommodations'] if pd.notna(row['Testing Accommodations']) else None,
                'all_accommodation_count': int(row['All Accommodation Count']) if pd.notna(row['All Accommodation Count']) else 0,
                'all_accommodations': row['All Accommodations'] if pd.notna(row['All Accommodations']) else None,
            }
            return self.assessment_profile
        except Exception as e:
            print(f"Warning: Could not load assessment profile: {e}")
            return None

    def _load_student_profile(self) -> dict | None:
        """Load normalized student profile built from SIS/MAP/STAAR template.

        This looks for a JSON file produced by
        scripts/build_student_profile_from_template.py in the
        STUDENT_PROFILE_FOLDER, named <student_id>.json.
        """
        profile_path = STUDENT_PROFILE_FOLDER / f"{self.student_id}.json"
        if not profile_path.exists():
            return None

        try:
            with profile_path.open(encoding="utf-8") as f:
                self.student_profile = json.load(f)
            return self.student_profile
        except Exception as e:
            print(f"Warning: Could not load student profile {profile_path}: {e}")
            return None

    def _load_compliance_profile(self) -> dict | None:
        """Load compliance/transportation/alt-assessment info from combined table.

        This looks for a COMPLIANCE_TABLE__ALL_CASE_MANAGERS.xlsx file either in
        the output folder (preferred, if a combined table has been generated)
        or directly in the reference folder if present. It then filters to the
        row for this student_id and pulls out commonly used fields such as
        program name, funding, transportation, and alternate assessment flags
        using simple substring matching on column headers.
        """

        if not PANDAS_AVAILABLE:
            return None

        from pandas import DataFrame  # type: ignore

        candidates = [
            OUTPUT_FOLDER / "COMPLIANCE_TABLE__ALL_CASE_MANAGERS.xlsx",
            REFERENCE_FOLDER / "COMPLIANCE_TABLE__ALL_CASE_MANAGERS.xlsx",
        ]

        df: DataFrame | None = None
        for path in candidates:
            if not path.exists():
                continue
            try:
                import pandas as pd  # type: ignore

                df = pd.read_excel(path)
                break
            except Exception as e:  # noqa: BLE001
                print(f"Warning: Could not load compliance table {path}: {e}")
                df = None

        if df is None or df.empty:
            return None

        # Try to locate the student-id column heuristically
        id_col = None
        for col in df.columns:
            name = str(col).lower()
            if "student" in name and "id" in name:
                id_col = col
                break
        if id_col is None:
            return None

        try:
            sub = df[df[id_col].astype(str) == str(self.student_id)]
        except Exception:
            return None
        if sub.empty:
            return None

        row = sub.iloc[0]
        result: dict = {"source_file": str(path)}  # type: ignore[name-defined]

        def pick(key: str, *needles: str) -> None:
            val = None
            lower_needles = [n.lower() for n in needles]
            for col in row.index:
                name = str(col).lower()
                if all(n in name for n in lower_needles):
                    val = row[col]
                    break
            if val is not None and val != "":
                result[key] = val

        # Heuristic mappings – these will quietly skip if columns are absent.
        pick("program_name", "program")
        pick("funding_source", "funding")
        pick("transportation", "transport")
        pick("alternate_assessment", "alt", "assessment")
        pick("primary_disability_code", "primary", "disab")
        pick("secondary_disability_code", "secondary", "disab")
        pick("evaluation_due_date", "fie", "due")
        pick("reed_due_date", "reed", "due")
        pick("next_ard_date", "next", "ard")

        self.compliance_profile = result
        return self.compliance_profile
    
    def _load_accommodations_profile(self) -> dict | None:
        """Load detailed classroom and testing accommodations from Frontline export.

        Uses Student_Accommodations-9.csv (district-wide) to build a per-student
        accommodations profile, grouped into classroom vs testing supports.
        """

        if not PANDAS_AVAILABLE:
            return None

        path = ACCOMMODATIONS_CSV_PATH
        if not path.exists():
            return None

        try:
            import pandas as pd  # type: ignore

            try:
                df = pd.read_csv(path, dtype=str).fillna("")
            except UnicodeDecodeError:
                # Fallback for Windows-encoded exports
                df = pd.read_csv(path, dtype=str, encoding="latin1").fillna("")
        except Exception as e:  # noqa: BLE001
            print(f"Warning: Could not load accommodations table {path}: {e}")
            return None

        if "Student ID" not in df.columns:
            return None

        sub = df[df["Student ID"].astype(str) == str(self.student_id)]
        if sub.empty:
            return None

        classroom: list[str] = []
        testing: list[str] = []

        for _, row in sub.iterrows():
            acc_type = str(row.get("Accommodation Type", "")).strip()
            name = str(row.get("Accommodation Name", "")).strip()
            subjects = str(row.get("Subjects", "")).strip()
            if not name:
                continue
            label = name
            if subjects:
                label = f"{name} ({subjects})"

            if "testing" in acc_type.lower():
                if label not in testing:
                    testing.append(label)
            elif "classroom" in acc_type.lower():
                if label not in classroom:
                    classroom.append(label)
            else:
                # If type is missing or unexpected, include in both buckets
                if label not in classroom:
                    classroom.append(label)

        all_accom = []
        for item in classroom + testing:
            if item not in all_accom:
                all_accom.append(item)

        if not all_accom:
            return None

        profile = {
            "source_file": str(path),
            "has_accommodations": True,
            "classroom_accommodations": classroom,
            "testing_accommodations": testing,
            "all_accommodations": all_accom,
        }

        self.accommodations_profile = profile
        return self.accommodations_profile

    def _load_goals_profile(self) -> dict | None:
        """Load active IEP goals from Goals_By_Student-4.csv.

        Builds a concise summary of current goals, grouped by domain, and a
        simple behavior-goal flag the ARD deck and AI blocks can reference.
        """

        if not PANDAS_AVAILABLE:
            return None

        path = GOALS_CSV_PATH
        if not path.exists():
            return None

        try:
            import pandas as pd  # type: ignore

            try:
                df = pd.read_csv(path, dtype=str, engine="python", on_bad_lines="skip").fillna("")
            except UnicodeDecodeError:
                df = pd.read_csv(
                    path,
                    dtype=str,
                    encoding="latin1",
                    engine="python",
                    on_bad_lines="skip",
                ).fillna("")
        except Exception as e:  # noqa: BLE001
            print(f"Warning: Could not load goals table {path}: {e}")
            return None

        if "Student ID" not in df.columns:
            return None

        sub = df[df["Student ID"].astype(str) == str(self.student_id)]
        if sub.empty:
            return None

        # Prefer ACTIVE IEP plans
        active = sub[sub.get("Status", "").astype(str).str.upper() == "ACTIVE"]
        if active.empty:
            active = sub

        goals: list[dict] = []
        domain_counts: dict[str, int] = {}
        has_behavior_goal = False

        for _, row in active.iterrows():
            domain = str(row.get("Domain", "")).strip()
            name = str(row.get("Custom Goal Name", "") or row.get("Goal Description", "")).strip()
            description = str(row.get("Goal Description", "")).strip()
            is_academic = str(row.get("Is Academic Goal Type", "")).strip().lower() == "yes"
            is_functional = str(row.get("Is Functional Goal Type", "")).strip().lower() == "yes"
            is_related = str(row.get("Is Related Services Goal Type", "")).strip().lower() == "yes"
            is_transition = str(row.get("Is Transition Related", "")).strip().lower() == "yes"

            if domain:
                domain_counts[domain] = domain_counts.get(domain, 0) + 1

            if "behavior" in domain.lower() or "sel" in domain.lower():
                has_behavior_goal = True

            goals.append(
                {
                    "domain": domain,
                    "name": name,
                    "description": description,
                    "is_academic": is_academic,
                    "is_functional": is_functional,
                    "is_related_service": is_related,
                    "is_transition": is_transition,
                }
            )

        profile = {
            "source_file": str(path),
            "total_goals": len(goals),
            "domain_counts": domain_counts,
            "goals": goals,
            "has_behavior_goal": has_behavior_goal,
        }

        self.goals_profile = profile
        return self.goals_profile

    def _load_telpas_profile(self) -> dict | None:
        """Load TELPAS participation and accommodations.

        Combines information from the dedicated Telpas_By_Student CSV and the
        Assessment Profile workbook when available.
        """

        if not PANDAS_AVAILABLE:
            return None

        path = TELPAS_CSV_PATH
        telpas_row = None

        if path.exists():
            try:
                import pandas as pd  # type: ignore

                df = pd.read_csv(path, dtype=str).fillna("")
                if "Student ID" in df.columns:
                    sub = df[df["Student ID"].astype(str) == str(self.student_id)]
                    if not sub.empty:
                        # Take the most recent row by Schedule Date if available
                        if "Schedule Date" in sub.columns:
                            try:
                                sub = sub.sort_values("Schedule Date")
                            except Exception:
                                pass
                        telpas_row = sub.iloc[-1]
            except Exception as e:  # noqa: BLE001
                print(f"Warning: Could not load TELPAS table {path}: {e}")

        if not telpas_row and not (self.assessment_profile or {}).get("telpas_type"):
            return None

        # Domains from the TELPAS CSV, if present
        domains: dict[str, str | None] = {}
        if telpas_row is not None:
            for key in ["Reading", "Speaking", "Writing", "Listening"]:
                if key in telpas_row.index:
                    val = str(telpas_row.get(key, "")).strip()
                    if val:
                        domains[key.lower()] = val

        accommodations: list[str] = []

        # TELPAS accommodations from assessment profile (Frontline)
        ap = self.assessment_profile or {}
        if ap.get("telpas_basic_transcribing"):
            accommodations.append("Basic Transcribing")
        if ap.get("telpas_structured_reminder"):
            accommodations.append("Individualized Structured Reminder")
        if ap.get("telpas_large_print"):
            accommodations.append("Large Print")
        if ap.get("telpas_manipulating_materials"):
            accommodations.append("Manipulating Test Materials")

        # From the TELPAS CSV itself
        if telpas_row is not None:
            for col, label in [
                ("Basic Transcribing", "Basic Transcribing"),
                ("Individualized Structured Reminder", "Individualized Structured Reminder"),
                ("Large Print", "Large Print"),
                ("Manipulating Test Materials", "Manipulating Test Materials"),
            ]:
                if col in telpas_row.index:
                    val = str(telpas_row.get(col, "")).strip().lower()
                    if val == "yes" and label not in accommodations:
                        accommodations.append(label)

        telpas_type = ap.get("telpas_type") or (str(telpas_row.get("Reading", "")).strip() if telpas_row is not None else None)

        profile = {
            "source_files": [
                str(path) if path.exists() else None,
                str(ASSESSMENT_PROFILE_PATH) if ASSESSMENT_PROFILE_PATH.exists() else None,
            ],
            "has_telpas": bool(telpas_row is not None or telpas_type),
            "telpas_type": telpas_type,
            "domains": domains,
            "accommodations": accommodations,
        }

        if telpas_row is not None:
            profile.update(
                {
                    "event_name": str(telpas_row.get("Event Name", "")).strip() or None,
                    "schedule_date": str(telpas_row.get("Schedule Date", "")).strip() or None,
                    "plan_start_date": str(telpas_row.get("Plan Start Date", "")).strip() or None,
                    "plan_end_date": str(telpas_row.get("Plan End Date", "")).strip() or None,
                }
            )

        self.telpas_profile = profile
        return self.telpas_profile

    def _load_behavior_intervention(self) -> dict | None:
        """Load BIP/FBA status and behavior services.

        Uses IEP_Students_With_A_BIP-2.csv to determine whether a student has
        a Behavior Intervention Plan and to capture key service details that
        can be displayed as a quick-look behavior chart.
        """

        if not PANDAS_AVAILABLE:
            return None

        path = BIP_CSV_PATH
        if not path.exists():
            return None

        try:
            import pandas as pd  # type: ignore

            df = pd.read_csv(path, dtype=str).fillna("")
        except Exception as e:  # noqa: BLE001
            print(f"Warning: Could not load BIP table {path}: {e}")
            return None

        if "Student ID" not in df.columns:
            return None

        sub = df[df["Student ID"].astype(str) == str(self.student_id)]
        if sub.empty:
            return None

        # Many rows per student for different services; infer BIP/FBA from any row
        has_bip = False
        has_fba = False
        fba_date = None
        primary_disabilities = None
        program_name = None
        instructional_setting = None

        services: list[dict] = []

        for _, row in sub.iterrows():
            if str(row.get("BIP", "")).strip().lower() == "yes":
                has_bip = True
            if str(row.get("FBA indicator", "")).strip().lower() == "yes":
                has_fba = True
                if not fba_date:
                    fba_date = str(row.get("FBA Date", "")).strip() or None

            if not primary_disabilities:
                primary_disabilities = str(row.get("Disabilities", "")).strip() or None
            if not program_name:
                program_name = str(row.get("Sped Program Name", "")).strip() or None
            if not instructional_setting:
                instructional_setting = str(row.get("Instructional setting code", "")).strip() or None

            service_name = str(row.get("Service Name", "")).strip()
            if service_name:
                services.append(
                    {
                        "service": str(row.get("Service", "")).strip() or service_name,
                        "service_name": service_name,
                        "location": str(row.get("Service Location", "")).strip() or None,
                        "start_date": str(row.get("Start Date", "")).strip() or None,
                        "end_date": str(row.get("End Date", "")).strip() or None,
                        "sessions": str(row.get("# of Sessions", "")).strip() or None,
                        "minutes_per_session": str(row.get("Min/Session", "")).strip() or None,
                        "frequency": str(row.get("How Often", "")).strip() or None,
                    }
                )

        profile = {
            "source_file": str(path),
            "has_bip": has_bip,
            "has_fba": has_fba,
            "fba_date": fba_date,
            "primary_disabilities": primary_disabilities,
            "program_name": program_name,
            "instructional_setting": instructional_setting,
            "services": services,
        }

        self.behavior_intervention = profile
        return self.behavior_intervention

    def _load_transportation_profile(self) -> dict | None:
        """Load special transportation needs and reasons.

        Uses Transportation_By_Student.csv to determine whether the committee
        agreed that the student requires special transportation, plus any
        noted accommodations or special vehicle needs.
        """

        if not PANDAS_AVAILABLE:
            return None

        path = TRANSPORT_CSV_PATH
        if not path.exists():
            return None

        try:
            import pandas as pd  # type: ignore

            df = pd.read_csv(path, dtype=str).fillna("")
        except Exception as e:  # noqa: BLE001
            print(f"Warning: Could not load transportation table {path}: {e}")
            return None

        if "Student ID" not in df.columns:
            return None

        sub = df[df["Student ID"].astype(str) == str(self.student_id)]
        if sub.empty:
            return None

        # Use the first row (current-year services); future/ESY rows are kept simple
        row = sub.iloc[0]

        reason_col = "The committee agrees that the student requires special transportation for the following reasons"
        requires_transportation = False
        transportation_reasons = None
        if reason_col in row.index:
            transportation_reasons = str(row.get(reason_col, "")).strip() or None
            if transportation_reasons:
                requires_transportation = True

        requires_special_vehicle = False
        special_vehicle = None
        adapt_col = "Does the student require a specially adapted vehicle?"
        if adapt_col in row.index:
            adapt_val = str(row.get(adapt_col, "")).strip().lower()
            requires_special_vehicle = adapt_val == "yes"
            special_vehicle = adapt_val if adapt_val else None

        requires_transport_accommodations = False
        accomod_type = None
        if "Does the student require accommodations?" in row.index:
            val = str(row.get("Does the student require accommodations?", "")).strip().lower()
            requires_transport_accommodations = val == "yes"
        if "Accommodation Type" in row.index:
            accomod_type = str(row.get("Accommodation Type", "")).strip() or None

        profile = {
            "source_file": str(path),
            "requires_transportation": requires_transportation,
            "transportation_reasons": transportation_reasons,
            "requires_special_vehicle": requires_special_vehicle,
            "special_vehicle_detail": special_vehicle,
            "requires_transport_accommodations": requires_transport_accommodations,
            "transport_accommodation_type": accomod_type,
        }

        self.transportation_profile = profile
        return self.transportation_profile
        
    def find_documents(self):
        """Find all documents for this student."""
        pattern = f"{self.student_id}*.pdf*"
        # Allow IEPs to live in per-student subfolders under the main
        # IEP_FOLDER (e.g., ieps/10079994/...). Use a recursive search
        # so we don't miss valid documents that are neatly organized
        # into subdirectories by student.
        files = list(IEP_FOLDER.rglob(pattern))
        
        for f in sorted(files):
            doc_info = self._classify_document(f)
            self.documents.append(doc_info)
            
        return self.documents
    
    def _classify_document(self, filepath: Path) -> dict:
        """Classify document type based on filename and content hints."""
        name = filepath.name.lower()

        doc_type = "Unknown"
        if "iep" in name and "signed" in name:
            doc_type = "Signed IEP"
        elif "iep" in name:
            doc_type = "IEP"
        elif "reed" in name:
            doc_type = "REED"
        elif "fiie" in name:
            doc_type = "FIIE"  # Full Individual Initial Evaluation (initial)
        elif "fie" in name or "full_individual" in name or "full individual" in name:
            doc_type = "FIE"
        elif "evaluation" in name and "speech" not in name and "psych" not in name:
            doc_type = "FIE"
        elif "psych" in name or "psychological" in name:
            doc_type = "Psychological Evaluation"
        elif "observation" in name:
            doc_type = "Classroom Observation"
        elif "speech" in name or "language" in name or "slp" in name:
            doc_type = "Speech/Language Evaluation"
        elif "audiology" in name or "audiological" in name:
            doc_type = "Audiological Evaluation"
        elif "ot" in name or "occupational" in name:
            doc_type = "OT Evaluation"
        elif "pt" in name or "physical_therapy" in name or "physical therapy" in name:
            doc_type = "PT Evaluation"
        elif "orientation" in name or "mobility" in name:
            doc_type = "Orientation & Mobility"
        elif "bip" in name or "behavior_intervention" in name:
            doc_type = "BIP"
        elif "fba" in name or "functional_behavior" in name:
            doc_type = "FBA"
        elif "pwn" in name or "prior_written" in name:
            doc_type = "Prior Written Notice"
        elif "transition" in name and "iep" not in name:
            doc_type = "Transition Assessment"
        elif "staar" in name:
            doc_type = "STAAR Report"
        elif "map" in name or "nwea" in name:
            doc_type = "MAP Report"
        elif "504" in name:
            doc_type = "Section 504 Plan"
            
        # Extract date from filename (format: MMDDYYYY)
        date_match = re.search(r'-(\d{8})-', str(filepath))
        date_str = None
        if date_match:
            try:
                date_str = datetime.strptime(date_match.group(1), "%m%d%Y").strftime("%Y-%m-%d")
            except:
                pass
                
        return {
            "filename": filepath.name,
            "path": str(filepath),
            "type": doc_type,
            "date": date_str,
            "size": filepath.stat().st_size
        }
    
    def extract_text(self):
        """Extract text from all PDFs using pdftotext."""
        for doc in self.documents:
            try:
                result = subprocess.run(
                    ["pdftotext", "-layout", doc["path"], "-"],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                self.extracted_text[doc["filename"]] = result.stdout
            except Exception as e:
                self.extracted_text[doc["filename"]] = f"ERROR: {e}"
                
    def _load_map_data(self):
        """Load and parse MAP assessment data if available."""
        if not MAP_PARSER_AVAILABLE:
            return None
            
        # Check for specified MAP file or auto-detect
        map_file = self.map_file
        
        if not map_file:
            # Look for MAP files in _REFERENCE folder
            for pattern in [f"*{self.student_id}*StudentProfile*.xlsx", "*StudentProfile*.xlsx"]:
                matches = list(REFERENCE_FOLDER.glob(pattern))
                if matches:
                    map_file = str(matches[0])
                    break
                    
        if map_file and Path(map_file).exists():
            try:
                self.map_data = load_map_excel(map_file)
                return self.map_data
            except Exception as e:
                print(f"Warning: Could not load MAP data: {e}")
                return None
                
        return None
    
    def _analyze_map_assessment(self) -> dict:
        """Analyze MAP assessment data for IEP integration."""
        if not self.map_data:
            self._load_map_data()
            
        if not self.map_data:
            return {"available": False, "message": "No MAP data found"}
        
        # Map data is already parsed by load_map_excel()
        data = self.map_data
        subjects = data.get("subjects", {})
        
        # Build summary from parsed data
        summary = {}
        for subject_key in ["mathematics", "reading", "language"]:
            subject_data = subjects.get(subject_key, {})
            if subject_data.get("rit_score"):
                percentile = subject_data.get("percentile", 50)
                summary[subject_key] = {
                    "rit_score": subject_data.get("rit_score"),
                    "rit_range": subject_data.get("rit_range"),
                    "percentile": percentile,
                    "lexile": subject_data.get("quantile_lexile"),
                    "quantile": subject_data.get("quantile_lexile") if subject_key == "mathematics" else None,
                    "growth_percentile": subject_data.get("growth_percentile"),
                    "quadrant": subject_data.get("quadrant"),
                    "projected_staar": subject_data.get("projected_staar"),
                    "achievement_level": "Below Mean" if percentile < 40 else "At Mean" if percentile < 60 else "Above Mean"
                }
        
        # Extract PLAAFP statements from recommendations
        recommendations = data.get("iep_recommendations", {})
        plaafp_statements = []
        for rec in recommendations.get("plaafp_statements", []):
            plaafp_statements.append(rec.get("statement", ""))
            
        # Extract goal recommendations
        goal_recommendations = []
        for goal in recommendations.get("goal_areas", []):
            goal_recommendations.append({
                "subject": goal.get("subject"),
                "area": goal.get("focus_area"),
                "current_level": f"RIT {goal.get('current_rit', 'N/A')}",
                "goal_template": goal.get("suggested_goal", "")
            })
            
        # Build growth status
        growth_status = {}
        for subject_key in ["mathematics", "reading"]:
            subject_data = subjects.get(subject_key, {})
            if subject_data.get("growth_percentile"):
                growth_status[subject_key] = {
                    "growth_percentile": subject_data.get("growth_percentile"),
                    "status": subject_data.get("quadrant", "Unknown")
                }
        
        # Get STAAR projection
        staar_projection = {}
        for subject_key in ["mathematics", "reading"]:
            subject_data = subjects.get(subject_key, {})
            if subject_data.get("projected_staar"):
                staar_projection = {
                    "projection": subject_data.get("projected_staar"),
                    "subject": subject_key,
                    "probability": "N/A"
                }
                break
        
        result = {
            "available": True,
            "student_id": data.get("student_id"),
            "grade": data.get("grade"),
            "summary": summary,
            "plaafp_statements": plaafp_statements,
            "goal_recommendations": goal_recommendations,
            "staar_projection": staar_projection,
            "growth_status": growth_status,
            "analysis": data.get("analysis", {}),
            "alerts": []
        }
        
        # Generate alerts based on MAP data
        for subject_key, subject_data in summary.items():
            percentile = subject_data.get("percentile")
            if percentile is not None:
                if percentile < 25:
                    result["alerts"].append({
                        "type": "HIGH",
                        "source": "MAP Assessment",
                        "message": f"{subject_key.title()} at {percentile}th percentile - significantly below grade level",
                        "recommendation": f"Review {subject_key} goals and accommodations"
                    })
                elif percentile < 40:
                    result["alerts"].append({
                        "type": "MEDIUM",
                        "source": "MAP Assessment",
                        "message": f"{subject_key.title()} at {percentile}th percentile - below average",
                        "recommendation": f"Monitor {subject_key} progress closely"
                    })
                
        # Check STAAR projection
        if staar_projection.get("projection") == "Did Not Meet":
            result["alerts"].append({
                "type": "CRITICAL",
                "source": "MAP Assessment",
                "message": f"STAAR projection: DID NOT MEET ({staar_projection.get('subject', '').title()})",
                "recommendation": "Immediate intervention needed; review testing accommodations"
            })
        elif staar_projection.get("projection") == "Approaches":
            result["alerts"].append({
                "type": "HIGH",
                "source": "MAP Assessment",
                "message": f"STAAR projection: APPROACHES",
                "recommendation": "Additional support needed to reach Meets level"
            })
            
        return result
    
    def _extract_deliberations(self) -> dict:
        """Extract ARD Deliberations from IEP documents."""
        result = {
            "available": False,
            "meeting_info": {},
            "committee_members": [],
            "parent_concerns": [],
            "evaluation_review": {},
            "plaafp_sections": [],
            "educational_placement": {},
            "transition": {},
            "decisions": []
        }
        
        # Find the most recent IEP
        ieps = [d for d in self.documents if "IEP" in d["type"]]
        if not ieps:
            return result
            
        latest_iep = sorted(ieps, key=lambda x: x["date"] or "", reverse=True)[0]
        text = self.extracted_text.get(latest_iep["filename"], "")
        
        # Find the DELIBERATIONS section
        delib_start = text.find("XXI. DELIBERATIONS")
        if delib_start == -1:
            delib_start = text.find("DELIBERATIONS")
        
        if delib_start == -1:
            return result
        
        # Find end of deliberations section
        end_markers = ["XXII.", "XXIII.", "ASSURANCES", "Report Generated"]
        delib_end = len(text)
        for marker in end_markers:
            idx = text.find(marker, delib_start + 100)
            if idx != -1 and idx < delib_end:
                delib_end = idx
        
        delib_text = text[delib_start:delib_end]
        result["available"] = True
        
        # Extract meeting info
        ard_date_match = re.search(r'ARD Meeting Date:\s*(\d{2}/\d{2}/\d{4})', delib_text)
        if ard_date_match:
            result["meeting_info"]["ard_date"] = ard_date_match.group(1)
        
        purpose_match = re.search(r'The ARD/IEP Committee agreed to review the following:\s*([^\n]+)', delib_text)
        if purpose_match:
            result["meeting_info"]["purpose"] = purpose_match.group(1).strip()
        
        # Check if student led
        if "Student led a portion" in delib_text:
            if "Yes" in delib_text[delib_text.find("Student led"):delib_text.find("Student led")+100]:
                result["meeting_info"]["student_led"] = "Yes"
            else:
                result["meeting_info"]["student_led"] = "No"
        
        # Parent attendance
        if "Parent is in attendance" in delib_text:
            result["meeting_info"]["parent_attendance"] = "Present"
        elif "Parent was unable to attend" in delib_text:
            result["meeting_info"]["parent_attendance"] = "Unable to attend"
        
        # Extract committee members
        members_section = re.search(r'Committee Members[:\s]*(.*?)(?:Statement of Confidentiality|Any Parent concerns)', 
                                    delib_text, re.DOTALL)
        if members_section:
            members_text = members_section.group(1)
            # Common roles to look for
            roles = ["Special Education Teacher", "Case Manager", "Administrator", "Parent", 
                    "English", "Math", "Counselor", "Diagnostician", "Speech", "OT", "PT"]
            lines = members_text.split('\n')
            for i, line in enumerate(lines):
                line = line.strip()
                if not line or len(line) < 3:
                    continue
                # Check if this line contains a role
                found_role = None
                for role in roles:
                    if role.lower() in line.lower():
                        found_role = role
                        name = line.replace(role, "").strip().strip('/')
                        break
                if found_role and name:
                    result["committee_members"].append({
                        "name": name,
                        "role": found_role,
                        "present": "Yes"
                    })
        
        # Extract parent concerns
        concerns_match = re.search(r'Any Parent concerns\?\s*\n?([^\n]+)', delib_text)
        if concerns_match:
            concern_text = concerns_match.group(1).strip()
            if concern_text and concern_text.lower() != "none" and concern_text.lower() != "no" and len(concern_text) > 5:
                # Clean and add
                result["parent_concerns"] = [concern_text]
        
        # Extract evaluation review
        fie_date_match = re.search(r'Date of Full Individual Initial Evaluation\s*(\d{1,2}/\d{1,2}/\d{4})', delib_text)
        if fie_date_match:
            result["evaluation_review"]["fie_date"] = fie_date_match.group(1)
        
        eligibility_match = re.search(r'Specific Learning Disability in the areas of\s*([^\n]+)', delib_text)
        if eligibility_match:
            result["evaluation_review"]["eligibility"] = "SLD: " + eligibility_match.group(1).strip()
        
        reed_due_match = re.search(r'Due Date of Review of Existing Evaluation Data \(REED\)\s*(\d{1,2}/\d{1,2}/\d{4})', delib_text)
        if reed_due_match:
            result["evaluation_review"]["reed_due_date"] = reed_due_match.group(1)
        
        new_testing_match = re.search(r'Are there any requests for new testing\?\s*(\w+)', delib_text)
        if new_testing_match:
            result["evaluation_review"]["new_testing"] = new_testing_match.group(1)
        
        # Extract PLAAFP sections (English and Math)
        # Find the first English section through to Math section to get all content
        english_start = delib_text.find("Present Levels of Academic Achievement and Functional Performance(English)")
        math_start = delib_text.find("Present Levels of Academic Achievement and Functional Performance(Math)")
        
        if english_start != -1 and math_start != -1 and math_start > english_start:
            english_section = delib_text[english_start:math_start]
            
            plaafp_entry = {"subject": "English"}
            
            # Grades
            grades_match = re.search(r"This year's English.*?Grade[s]?:\s*([^\n]+)", english_section, re.IGNORECASE)
            if grades_match:
                plaafp_entry["grades"] = grades_match.group(1).strip()
            
            # Teacher comment
            teacher_match = re.search(r'Teacher Comment\s*"([^"]+)"', english_section)
            if teacher_match:
                plaafp_entry["teacher_comment"] = teacher_match.group(1).strip()[:300]
            
            # Progress - look for "has not met" or "has met"
            if "has not met" in english_section.lower():
                plaafp_entry["goal_progress"] = "Goal NOT MET"
            elif "did not meet" in english_section.lower():
                plaafp_entry["goal_progress"] = "Goal NOT MET"
            elif "has met" in english_section.lower() or "met his goal" in english_section.lower():
                plaafp_entry["goal_progress"] = "Goal MET"
            elif "making progress" in english_section.lower():
                plaafp_entry["goal_progress"] = "Making progress"
            
            # Concerns
            concerns_match = re.search(r'Concerns and Needs\s*(.*?)(?:Goal|Impact of|$)', english_section, re.DOTALL)
            if concerns_match:
                plaafp_entry["concerns"] = concerns_match.group(1).strip()[:300]
            
            result["plaafp_sections"].append(plaafp_entry)
        
        # Now extract Math section - from Math to Educational Placement
        if math_start != -1:
            math_end = delib_text.find("EDUCATIONAL ALTERNATIVES", math_start)
            if math_end == -1:
                math_end = len(delib_text)
            math_section = delib_text[math_start:math_end]
            
            plaafp_entry = {"subject": "Math"}
            
            # Grades
            grades_match = re.search(r"This year's Math.*?Grade[s]?:\s*([^\n]+)", math_section, re.IGNORECASE)
            if grades_match:
                plaafp_entry["grades"] = grades_match.group(1).strip()
            
            # Teacher comment
            teacher_match = re.search(r'Teacher Comment\s*"([^"]+)"', math_section)
            if teacher_match:
                plaafp_entry["teacher_comment"] = teacher_match.group(1).strip()[:300]
            
            # Progress
            if "has not met" in math_section.lower() or "did not meet" in math_section.lower():
                plaafp_entry["goal_progress"] = "Goal NOT MET"
            elif "has met" in math_section.lower() or "met his goal" in math_section.lower():
                plaafp_entry["goal_progress"] = "Goal MET"
            elif "making progress" in math_section.lower():
                plaafp_entry["goal_progress"] = "Making progress"
            
            # Concerns
            concerns_match = re.search(r'Concerns and Needs\s*(.*?)(?:Goal|Impact of|$)', math_section, re.DOTALL)
            if concerns_match:
                plaafp_entry["concerns"] = concerns_match.group(1).strip()[:300]
            
            result["plaafp_sections"].append(plaafp_entry)
        
        # Extract educational placement
        placement_match = re.search(r'EDUCATIONAL ALTERNATIVES.*?instructional setting codes[.\s]*(.*?)(?:Deliberations:|Page \d+|$)', 
                                   delib_text, re.DOTALL)
        if placement_match:
            placement_text = placement_match.group(1)
            result["educational_placement"]["semesters"] = []
            
            # Parse semester/code pairs
            semester_pattern = r'(Spring|Fall)\s+(\d{4}-\d{4})\s+(\d+)'
            for match in re.finditer(semester_pattern, placement_text):
                code = match.group(3)
                # Decode instructional setting code
                code_descriptions = {
                    "40": "Resource Room < 21%",
                    "41": "Resource Room 21-60%",
                    "42": "Self-Contained 61%+",
                    "44": "Mainstream 0-20%",
                    "45": "Homebound"
                }
                result["educational_placement"]["semesters"].append({
                    "semester": f"{match.group(1)} {match.group(2)}",
                    "code": code,
                    "description": code_descriptions.get(code, f"Code {code}")
                })
        
        # Extract transition/graduation info
        diploma_match = re.search(r'will graduate with the following diploma type:\s*([^\n]+)', delib_text)
        if diploma_match:
            result["transition"]["diploma_type"] = diploma_match.group(1).strip()
        
        # Extract key decisions
        decisions = []
        decision_keywords = [
            "agreed to review",
            "determined the appropriate",
            "Committee decided",
            "will continue",
            "will receive",
            "recommends",
            "will participate"
        ]
        for keyword in decision_keywords:
            matches = re.findall(rf'(?:The )?(?:ARD/IEP )?Committee.*?{keyword}[^.]+\.', delib_text, re.IGNORECASE)
            for match in matches[:2]:  # Limit per keyword
                if match not in decisions:
                    decisions.append(match.strip())
        result["decisions"] = decisions[:10]  # Limit total decisions
        
        return result
                

    # ─────────────────────────────────────────────────────────────────────────
    # FIE / FIIE EXTRACTION
    # ─────────────────────────────────────────────────────────────────────────
    def _extract_fie_data(self) -> dict:
        """Extract comprehensive data from FIE/FIIE documents."""
        result = {
            "available": False,
            "document": None,
            "doc_type": None,
            "evaluation_date": None,
            "consent_date": None,
            "evaluator": None,
            "eligibility_determined": None,
            "disability_categories_considered": [],
            "eligible_disability": None,
            "sld_areas": [],
            "strengths": [],
            "areas_of_need": [],
            "tests_administered": [],
            "scores": {},
            "parent_interview": False,
            "teacher_interview": False,
            "classroom_observation": False,
            "vision_hearing_screening": None,
            "language_dominance": None,
            "ell_evaluation": False,
            "medical_health_notes": [],
            "emotional_disturbance_indicators": False,
            "intellectual_disability_eval": False,
            "autism_indicators": False,
            "adaptive_behavior_assessed": False,
            "speech_language_findings": {},
            "visual_motor_findings": {},
            "reevaluation_due_date": None,
            "alerts": [],
        }

        fie_docs = [d for d in self.documents if d["type"] in ("FIE", "FIIE")]
        if not fie_docs:
            return result

        # Use most recent FIE
        doc = sorted(fie_docs, key=lambda x: x["date"] or "", reverse=True)[0]
        result["available"] = True
        result["document"] = doc["filename"]
        result["doc_type"] = doc["type"]
        result["evaluation_date"] = doc["date"]
        text = self.extracted_text.get(doc["filename"], "")
        tl = text.lower()

        # ── Consent date ──────────────────────────────────────────────────────
        consent_match = re.search(
            r'(?:consent|agreement).*?(?:date|signed)[:\s]*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})',
            tl, re.I
        )
        if consent_match:
            result["consent_date"] = consent_match.group(1)

        # ── Evaluator ─────────────────────────────────────────────────────────
        eval_match = re.search(
            r'(?:diagnostician|evaluator|examiner|psychologist)[:\s]+([A-Z][a-z]+(?: [A-Z][a-z]+)+)',
            text
        )
        if eval_match:
            result["evaluator"] = eval_match.group(1)

        # ── Eligibility determination ─────────────────────────────────────────
        if re.search(r'is\s+eligible|eligible\s+for\s+special\s+education', tl):
            result["eligibility_determined"] = "Eligible"
        elif re.search(r'is\s+not\s+eligible|does\s+not\s+(?:meet|qualify)', tl):
            result["eligibility_determined"] = "Not Eligible"

        # ── Disability categories considered ──────────────────────────────────
        idea_categories = [
            "specific learning disability", "speech or language impairment",
            "intellectual disability", "emotional disturbance",
            "autism", "other health impairment", "traumatic brain injury",
            "visual impairment", "hearing impairment", "deaf-blindness",
            "orthopedic impairment", "multiple disabilities",
            "developmental delay"
        ]
        for cat in idea_categories:
            if cat in tl:
                result["disability_categories_considered"].append(cat.title())

        # ── Eligible disability (primary) ─────────────────────────────────────
        elig_match = re.search(
            r'(?:primary\s+)?(?:eligibility|disability)[:\s]+([A-Z][A-Za-z ]+?)(?:\n|,|\.|Secondary)',
            text
        )
        if elig_match:
            result["eligible_disability"] = elig_match.group(1).strip()

        # ── SLD areas identified ───────────────────────────────────────────────
        sld_area_patterns = [
            ("basic reading", "Basic Reading"),
            ("reading comprehension", "Reading Comprehension"),
            ("reading fluency", "Reading Fluency"),
            (r"math(?:ematics)? calculation", "Math Calculation"),
            (r"math(?:ematics)? problem.?solving", "Math Problem Solving"),
            ("written expression", "Written Expression"),
            ("oral expression", "Oral Expression"),
            ("listening comprehension", "Listening Comprehension"),
        ]
        for pattern, label in sld_area_patterns:
            if re.search(pattern, tl):
                result["sld_areas"].append(label)

        # ── Tests administered ────────────────────────────────────────────────
        test_patterns = [
            (r'wisc[\s\-]?v|wisc[\s\-]?iv', "WISC-V (Cognitive)"),
            (r'wj[\s\-]?iv|woodcock.johnson', "WJ-IV (Academic Achievement)"),
            (r'wj[\s\-]?iii', "WJ-III (Academic Achievement)"),
            (r'ktea[\s\-]?3|kaufman.*achievement', "KTEA-3 (Academic Achievement)"),
            (r'wiat[\s\-]?(?:ii|iii|4)', "WIAT (Academic Achievement)"),
            (r'gort[\s\-]?\d', "GORT (Reading)"),
            (r'ctopp[\s\-]?\d?', "CTOPP (Phonological Processing)"),
            (r'celf[\s\-]?\d', "CELF (Language)"),
            (r'basc[\s\-]?\d', "BASC (Behavior/Social-Emotional)"),
            (r'conners[\s\-]?\d?', "Conners (ADHD)"),
            (r'vmi|beery', "Beery VMI (Visual-Motor)"),
            (r'tvps[\s\-]?\d?', "TVPS (Visual Processing)"),
            (r'dtvp[\s\-]?\d?', "DTVP (Visual Processing)"),
            (r'vineland[\s\-]?\d?', "Vineland (Adaptive Behavior)"),
            (r'abas[\s\-]?\d?', "ABAS (Adaptive Behavior)"),
            (r'besa|bilingual.*evaluation', "BESA (Bilingual Language)"),
            (r'bvat', "BVAT (Bilingual Verbal Ability)"),
            (r'ppvt[\s\-]?\d?', "PPVT (Receptive Vocabulary)"),
            (r'eva|expressive.*vocabulary', "EVT (Expressive Vocabulary)"),
            (r'cpt[\s\-]?\d?|continuous.performance', "CPT (Attention)"),
            (r'cas[\s\-]?\d?', "CAS (Cognitive Assessment)"),
            (r'kbit[\s\-]?\d?', "KBIT (Brief Cognitive)"),
            (r'wasi[\s\-]?\d?', "WASI (Brief Cognitive)"),
            (r'towl[\s\-]?\d?', "TOWL (Written Language)"),
            (r'told[\s\-]?\d?', "TOLD (Language)"),
        ]
        for pattern, label in test_patterns:
            if re.search(pattern, tl):
                result["tests_administered"].append(label)

        # ── Score extraction (standard scores + percentiles) ──────────────────
        score_pattern = re.finditer(
            r'([A-Z][A-Za-z ]{2,30})[:\s]+(?:standard score[:\s]+)?(\d{2,3})[,\s]+(?:percentile[:\s]+)?(\d{1,3})(?:th|st|nd|rd)?',
            text
        )
        for m in score_pattern:
            label = m.group(1).strip()
            ss = int(m.group(2))
            pct = int(m.group(3))
            if 40 <= ss <= 160 and 1 <= pct <= 99:  # sanity check
                result["scores"][label] = {"standard_score": ss, "percentile": pct}

        # ── Required components ───────────────────────────────────────────────
        result["parent_interview"] = bool(re.search(r'parent\s+interview|interview.*parent', tl))
        result["teacher_interview"] = bool(re.search(r'teacher\s+interview|interview.*teacher', tl))
        result["classroom_observation"] = bool(re.search(r'classroom\s+observation|observed.*in\s+class', tl))

        # ── Vision / hearing ──────────────────────────────────────────────────
        if re.search(r'vision.*pass|hearing.*pass|passed.*vision|passed.*hearing', tl):
            result["vision_hearing_screening"] = "Passed"
        elif re.search(r'vision.*fail|hearing.*fail|failed.*vision|failed.*hearing|referred.*audiolog', tl):
            result["vision_hearing_screening"] = "Failed/Referred"

        # ── Language dominance / ELL ──────────────────────────────────────────
        lang_match = re.search(r'language\s+dominance[:\s]+(\w+)', tl)
        if lang_match:
            result["language_dominance"] = lang_match.group(1).title()
        result["ell_evaluation"] = bool(re.search(r'besa|bvat|bilingual.*eval|language\s+proficiency', tl))

        # ── Emotional disturbance ─────────────────────────────────────────────
        result["emotional_disturbance_indicators"] = bool(
            re.search(r'emotional\s+disturbance|internalizing|externalizing|depression|anxiety.*significant|mood\s+disorder', tl)
        )

        # ── Autism ────────────────────────────────────────────────────────────
        result["autism_indicators"] = bool(
            re.search(r'autism|asd|ados|adi-r|social\s+communication\s+disorder', tl)
        )

        # ── Intellectual disability / adaptive behavior ───────────────────────
        result["intellectual_disability_eval"] = bool(
            re.search(r'intellectual\s+disab|adaptive\s+behav|vineland|abas|daily\s+living\s+skills', tl)
        )
        result["adaptive_behavior_assessed"] = result["intellectual_disability_eval"]

        # ── Strengths ─────────────────────────────────────────────────────────
        strength_section = re.search(
            r'(?:strength|asset|positive)[s:\s]+(.*?)(?:area[s]?\s+of\s+need|weakness|concern|recommend)',
            tl, re.DOTALL
        )
        if strength_section:
            raw = strength_section.group(1)
            for line in raw.split('\n')[:6]:
                line = line.strip(' -•*	')
                if len(line) > 10:
                    result["strengths"].append(line[:200])

        # ── Areas of need ─────────────────────────────────────────────────────
        need_section = re.search(
            r'area[s]?\s+of\s+need[:\s]+(.*?)(?:recommendation|eligib|service|conclusion)',
            tl, re.DOTALL
        )
        if need_section:
            raw = need_section.group(1)
            for line in raw.split('\n')[:8]:
                line = line.strip(' -•*	')
                if len(line) > 10:
                    result["areas_of_need"].append(line[:200])

        # ── Speech/language findings ──────────────────────────────────────────
        if re.search(r'celf|speech.*language|articulation|pragmatic|phonolog', tl):
            result["speech_language_findings"]["evaluated"] = True
            celf_match = re.search(r'celf.*?(?:core|composite)[:\s]+(\d{2,3})', tl)
            if celf_match:
                result["speech_language_findings"]["celf_composite"] = int(celf_match.group(1))

        # ── Visual-motor findings ─────────────────────────────────────────────
        if re.search(r'vmi|beery|tvps|dtvp|visual.motor|visual.perceptual', tl):
            result["visual_motor_findings"]["evaluated"] = True
            vmi_match = re.search(r'(?:vmi|beery).*?(?:standard\s+score|ss)[:\s]+(\d{2,3})', tl)
            if vmi_match:
                result["visual_motor_findings"]["vmi_score"] = int(vmi_match.group(1))

        # ── Re-evaluation due date ────────────────────────────────────────────
        if doc["date"]:
            try:
                eval_dt = datetime.strptime(doc["date"], "%Y-%m-%d")
                reeval_dt = eval_dt.replace(year=eval_dt.year + 3)
                result["reevaluation_due_date"] = reeval_dt.strftime("%Y-%m-%d")
            except Exception:
                pass

        # ── Alerts ────────────────────────────────────────────────────────────
        if not result["parent_interview"]:
            result["alerts"].append("No parent interview documented in FIE")
        if not result["teacher_interview"]:
            result["alerts"].append("No teacher interview documented in FIE")
        if not result["classroom_observation"]:
            result["alerts"].append("No classroom observation documented in FIE")
        if not result["tests_administered"]:
            result["alerts"].append("No standardized tests identified in FIE — verify document completeness")
        if result["vision_hearing_screening"] is None:
            result["alerts"].append("Vision/hearing screening results not found in FIE")
        if result["reevaluation_due_date"]:
            try:
                reeval_dt = datetime.strptime(result["reevaluation_due_date"], "%Y-%m-%d")
                if reeval_dt < datetime.now():
                    result["alerts"].append(
                        f"RE-EVALUATION OVERDUE — FIE dated {doc['date']}, re-eval was due {result['reevaluation_due_date']}"
                    )
                elif (reeval_dt - datetime.now()).days < 180:
                    result["alerts"].append(
                        f"Re-evaluation due within 6 months: {result['reevaluation_due_date']}"
                    )
            except Exception:
                pass

        return result

    # ─────────────────────────────────────────────────────────────────────────
    # REED EXTRACTION
    # ─────────────────────────────────────────────────────────────────────────
    def _extract_reed_data(self) -> dict:
        """Extract comprehensive data from REED documents."""
        result = {
            "available": False,
            "document": None,
            "reed_date": None,
            "reed_due_date": None,
            "additional_data_needed": None,
            "data_types_needed": [],
            "existing_data_reviewed": [],
            "parent_notified": False,
            "parent_response": None,
            "reevaluation_waived": False,
            "eligibility_continues": None,
            "current_performance_summary": None,
            "committee_signatures": False,
            "decision": None,
            "alerts": [],
        }

        reed_docs = [d for d in self.documents if d["type"] == "REED"]
        if not reed_docs:
            return result

        doc = sorted(reed_docs, key=lambda x: x["date"] or "", reverse=True)[0]
        result["available"] = True
        result["document"] = doc["filename"]
        result["reed_date"] = doc["date"]
        text = self.extracted_text.get(doc["filename"], "")
        tl = text.lower()

        # ── Additional data needed ─────────────────────────────────────────────
        if re.search(r'no additional.*data.*needed|data.*not.*needed|waive.*eval', tl):
            result["additional_data_needed"] = False
            result["reevaluation_waived"] = True
            result["decision"] = "No additional data needed — reevaluation waived"
        elif re.search(r'additional.*data.*(?:is|are)\s+needed|need.*additional.*data|require.*new.*test', tl):
            result["additional_data_needed"] = True
            result["decision"] = "Additional data needed — full FIE required"

        # ── What data types needed ────────────────────────────────────────────
        data_type_patterns = [
            ("cognitive", "Cognitive Assessment"),
            ("academic achievement", "Academic Achievement"),
            ("behavior", "Behavioral Assessment"),
            ("adaptive", "Adaptive Behavior"),
            ("speech.*language", "Speech/Language Evaluation"),
            ("occupational therapy", "Occupational Therapy Evaluation"),
            ("physical therapy", "Physical Therapy Evaluation"),
            ("audiol", "Audiological Evaluation"),
            ("vision", "Vision Evaluation"),
            ("transition", "Transition Assessment"),
            ("classroom observation", "Classroom Observation"),
        ]
        if result["additional_data_needed"]:
            for pattern, label in data_type_patterns:
                if re.search(pattern, tl):
                    result["data_types_needed"].append(label)

        # ── Existing data sources reviewed ───────────────────────────────────
        source_patterns = [
            (r'previous\s+(?:fie|evaluation|testing)', "Previous FIE/Evaluation"),
            (r'staar', "STAAR Results"),
            (r'report\s+card|grades', "Grades/Report Cards"),
            (r'teacher\s+(?:input|report|observation)', "Teacher Input/Reports"),
            (r'parent\s+(?:input|concern|interview)', "Parent Input"),
            (r'progress\s+(?:monitor|data)', "Progress Monitoring Data"),
            (r'curriculum.based', "Curriculum-Based Assessment"),
            (r'attendance', "Attendance Records"),
            (r'discipline', "Discipline Records"),
            (r'map|nwea', "MAP Assessment"),
            (r'health\s+(?:record|history)', "Health Records"),
        ]
        for pattern, label in source_patterns:
            if re.search(pattern, tl):
                result["existing_data_reviewed"].append(label)

        # ── Parent notification ────────────────────────────────────────────────
        result["parent_notified"] = bool(
            re.search(r'parent.*(?:notif|informed|sent|mailed|emailed)', tl)
        )

        # ── Parent response ────────────────────────────────────────────────────
        if re.search(r'parent.*agree|agreed.*no.*additional|waive.*right.*eval', tl):
            result["parent_response"] = "Agreed — no additional evaluation"
        elif re.search(r'parent.*request.*eval|requested.*full.*eval', tl):
            result["parent_response"] = "Requested full evaluation"
        elif re.search(r'no.*response|did not respond|unable.*to.*reach', tl):
            result["parent_response"] = "No response"

        # ── Eligibility continues ──────────────────────────────────────────────
        if re.search(r'continues\s+to\s+be\s+eligible|eligibility\s+continues|remain\s+eligible', tl):
            result["eligibility_continues"] = True
        elif re.search(r'no\s+longer\s+eligible|eligibility\s+discontinued|does\s+not\s+continue', tl):
            result["eligibility_continues"] = False

        # ── Committee signatures ───────────────────────────────────────────────
        result["committee_signatures"] = bool(
            re.search(r'signature|signed|committee\s+member', tl)
        )

        # ── Current performance summary ────────────────────────────────────────
        perf_match = re.search(
            r'(?:current\s+performance|present\s+level|summary\s+of\s+performance)[:\s]+(.*?)(?:\n\n|evaluation\s+decision|additional\s+data)',
            text, re.DOTALL | re.I
        )
        if perf_match:
            result["current_performance_summary"] = perf_match.group(1).strip()[:500]

        # ── REED due date (next one) ────────────────────────────────────────────
        reed_due_match = re.search(r'reed\s+due[:\s]+(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})', tl)
        if reed_due_match:
            result["reed_due_date"] = reed_due_match.group(1)

        # ── Alerts ────────────────────────────────────────────────────────────
        if not result["parent_notified"]:
            result["alerts"].append("No documentation of parent notification for REED")
        if result["additional_data_needed"] is None:
            result["alerts"].append("REED decision unclear — additional data needed not specified")
        if result["additional_data_needed"] and not result["data_types_needed"]:
            result["alerts"].append("REED says additional data needed but specific areas not identified")
        if not result["committee_signatures"]:
            result["alerts"].append("Committee signatures not found in REED")

        return result

    # ─────────────────────────────────────────────────────────────────────────
    # IEP SERVICES & PLAAFP EXTRACTION (all domains)
    # ─────────────────────────────────────────────────────────────────────────
    def _extract_iep_services(self) -> dict:
        """Extract services, accommodations, ESY, AT, and full PLAAFP from IEP."""
        result = {
            "available": False,
            "iep_start_date": None,
            "iep_end_date": None,
            "special_education_services": [],
            "related_services": [],
            "supplementary_aids": [],
            "classroom_accommodations": [],
            "testing_accommodations": [],
            "esy_considered": None,
            "esy_services": [],
            "at_considered": None,
            "at_provided": [],
            "medicaid_consent": None,
            "parent_rights_provided": None,
            "bip_present": False,
            "manifestation_determination": False,
            "nonparticipation_justification": None,
            "testing_designation": None,
            "section_504_relationship": None,
            "plaafp_all_domains": {},
            "goals_detail": [],
            "services_total_minutes_per_week": 0,
            "alerts": [],
        }

        ieps = [d for d in self.documents if "IEP" in d["type"]]
        if not ieps:
            return result

        doc = sorted(ieps, key=lambda x: x["date"] or "", reverse=True)[0]
        result["available"] = True
        text = self.extracted_text.get(doc["filename"], "")
        tl = text.lower()

        # ── IEP dates ─────────────────────────────────────────────────────────
        start_match = re.search(r'(?:iep|plan)\s+(?:start|begin)[:\s]+(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})', tl)
        end_match = re.search(r'(?:iep|plan)\s+end[:\s]+(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})', tl)
        if start_match:
            result["iep_start_date"] = start_match.group(1)
        if end_match:
            result["iep_end_date"] = end_match.group(1)

        # ── Special education services (SDI) ──────────────────────────────────
        # Pattern: service name + minutes + frequency + location
        sdi_patterns = [
            r'(?:special\s+education|sdi|specially\s+designed\s+instruction)[:\s]+(.*?)(?:|minutes)',
            r'(\d+)\s+minutes?\s+(?:per|a)\s+(?:week|day)[,\s]+(\d+)\s+(?:times|sessions)',
        ]
        # Grab service blocks via "Service:" pattern
        service_blocks = re.finditer(
            r'(?:Service|SDI|Specially Designed Instruction)[:\s]+([^\n]{5,80})\s*\n'
            r'(?:.*?Minutes?[:\s]+(\d+).*?\n)?'
            r'(?:.*?(?:per week|per day|frequency)[:\s]+([^\n]{1,40})\n)?'
            r'(?:.*?(?:location|setting)[:\s]+([^\n]{1,60})\n)?',
            text, re.I | re.DOTALL
        )
        total_minutes = 0
        for m in service_blocks:
            service_name = m.group(1).strip()
            minutes = int(m.group(2)) if m.group(2) else None
            frequency = m.group(3).strip() if m.group(3) else None
            location = m.group(4).strip() if m.group(4) else None
            if service_name and len(service_name) > 3:
                result["special_education_services"].append({
                    "service": service_name,
                    "minutes": minutes,
                    "frequency": frequency,
                    "location": location,
                })
                if minutes:
                    total_minutes += minutes
        result["services_total_minutes_per_week"] = total_minutes

        # ── Related services ───────────────────────────────────────────────────
        related_keywords = [
            "speech-language", "speech language", "occupational therapy",
            "physical therapy", "counseling", "orientation and mobility",
            "audiology", "school health", "transportation", "interpreter"
        ]
        for kw in related_keywords:
            if kw in tl:
                # Try to grab minutes near keyword
                min_match = re.search(
                    rf'{re.escape(kw)}.*?(\d+)\s*minutes',
                    tl, re.I
                )
                result["related_services"].append({
                    "service": kw.title(),
                    "minutes": int(min_match.group(1)) if min_match else None,
                })

        # ── Supplementary aids ────────────────────────────────────────────────
        supp_section = re.search(
            r'supplementary\s+aids?\s+(?:and\s+)?(?:support|service)[s:\s]+(.*?)(?:\n\n|testing|accommodat)',
            tl, re.DOTALL
        )
        if supp_section:
            for line in supp_section.group(1).split('\n')[:8]:
                line = line.strip(' -•*	')
                if len(line) > 5:
                    result["supplementary_aids"].append(line[:200])

        # ── Classroom & testing accommodations (from IEP PDF directly) ────────
        acc_section = re.search(
            r'(?:classroom\s+accommodat|instructional\s+accommodat)[s:\s]+(.*?)(?:testing\s+accommodat|state\s+assess|goal|$)',
            tl, re.DOTALL
        )
        if acc_section:
            for line in acc_section.group(1).split('\n')[:15]:
                line = line.strip(' -•*	✓□')
                if len(line) > 5:
                    result["classroom_accommodations"].append(line[:200])

        test_acc_section = re.search(
            r'(?:testing\s+accommodat|state\s+assess.*accommodat)[s:\s]+(.*?)(?:goal|esy|extended\s+school|assistive\s+tech|$)',
            tl, re.DOTALL
        )
        if test_acc_section:
            for line in test_acc_section.group(1).split('\n')[:15]:
                line = line.strip(' -•*	✓□')
                if len(line) > 5:
                    result["testing_accommodations"].append(line[:200])

        # ── ESY ────────────────────────────────────────────────────────────────
        if re.search(r'extended\s+school\s+year', tl):
            result["esy_considered"] = True
            if re.search(r'esy.*(?:yes|will\s+receive|qualif)', tl):
                result["esy_services"].append("ESY services approved")
            elif re.search(r'esy.*(?:no|does\s+not\s+qualif|not\s+eligible)', tl):
                result["esy_services"] = []
                result["esy_considered"] = "Considered — not needed"
        else:
            result["esy_considered"] = False
            result["alerts"].append("ESY not mentioned in IEP — must be considered annually")

        # ── Assistive Technology ───────────────────────────────────────────────
        if re.search(r'assistive\s+tech', tl):
            result["at_considered"] = True
            at_section = re.search(
                r'assistive\s+tech.*?\n(.*?)(?:\n\n|esy|service|goal)',
                tl, re.DOTALL
            )
            if at_section:
                for line in at_section.group(1).split('\n')[:6]:
                    line = line.strip(' -•*	')
                    if len(line) > 3:
                        result["at_provided"].append(line[:150])
        else:
            result["at_considered"] = False
            result["alerts"].append("Assistive technology consideration not documented in IEP")

        # ── Medicaid consent ───────────────────────────────────────────────────
        if re.search(r'medicaid.*(?:yes|consent\s+given|signed)', tl):
            result["medicaid_consent"] = True
        elif re.search(r'medicaid.*(?:no|declined|refused|not\s+sign)', tl):
            result["medicaid_consent"] = False

        # ── Parent rights provided ─────────────────────────────────────────────
        result["parent_rights_provided"] = bool(
            re.search(r'parent.*rights.*(?:provided|given|received|copy)', tl)
        )

        # ── BIP ────────────────────────────────────────────────────────────────
        result["bip_present"] = bool(re.search(r'bip|behavior\s+intervention\s+plan', tl))

        # ── Manifestation Determination ────────────────────────────────────────
        result["manifestation_determination"] = bool(
            re.search(r'manifestation\s+determination|manifestation\s+review', tl)
        )

        # ── Nonparticipation justification ────────────────────────────────────
        nonpart = re.search(
            r'(?:non.?participation|removal.*from\s+general)\s*[:.\s]+(.*?)(?:\n\n|placement|setting)',
            tl, re.DOTALL
        )
        if nonpart:
            result["nonparticipation_justification"] = nonpart.group(1).strip()[:300]

        # ── Testing designation ────────────────────────────────────────────────
        if re.search(r'staar\s+alt\s*2|alternate\s+assessment', tl):
            result["testing_designation"] = "STAAR Alt 2"
        elif re.search(r'staar\s+(?!alt)', tl):
            result["testing_designation"] = "STAAR"

        # ── Section 504 relationship ───────────────────────────────────────────
        if re.search(r'section\s+504|504\s+plan', tl):
            result["section_504_relationship"] = "Referenced in IEP"

        # ── PLAAFP all domains ─────────────────────────────────────────────────
        domains = [
            "English/Reading", "Mathematics", "Written Language", "Science",
            "Social Studies", "Speech/Language", "Communication",
            "Adaptive Behavior", "Social-Emotional/Behavioral",
            "Motor/Physical", "Transition", "Vocational",
        ]
        for domain in domains:
            # Build a flexible search pattern for each domain
            pattern_key = domain.lower().replace("/", r"[/\s]").replace("-", r"[\-\s]")
            section_match = re.search(
                rf'present\s+levels.*?{pattern_key}.*?\n(.*?)(?:goal|present\s+level|service|$)',
                tl, re.DOTALL
            )
            if section_match:
                content_raw = section_match.group(1).strip()[:600]
                if len(content_raw) > 30:
                    result["plaafp_all_domains"][domain] = content_raw

        # ── Goals with full detail ─────────────────────────────────────────────
        goal_blocks = re.finditer(
            r'Measurable Annual Goal[:\s]+(.*?)(?=Measurable Annual Goal|Progress will be|Implementer|$)',
            text, re.DOTALL
        )
        for m in list(goal_blocks)[:15]:
            goal_text = m.group(1).strip()
            if len(goal_text) < 20:
                continue

            has_timeframe = bool(re.search(r'by.*?(?:end|date|iep)', goal_text, re.I))
            has_condition = bool(re.search(r'given|when|after|during', goal_text, re.I))
            has_behavior = bool(re.search(r'will\s+\w+', goal_text, re.I))
            has_criterion = bool(re.search(r'\d+\s*(?:out of|%|percent|times)', goal_text, re.I))

            progress_method = None
            prog_match = re.search(r'progress.*?(?:monitor|measure)[:\s]+([^]{5,80})', goal_text, re.I)
            if prog_match:
                progress_method = prog_match.group(1).strip()

            implementer_match = re.search(r'implementer[:\s]+([^]{3,60})', goal_text, re.I)
            implementer = implementer_match.group(1).strip() if implementer_match else None

            result["goals_detail"].append({
                "preview": goal_text[:250],
                "has_timeframe": has_timeframe,
                "has_condition": has_condition,
                "has_behavior": has_behavior,
                "has_criterion": has_criterion,
                "all_four_components": all([has_timeframe, has_condition, has_behavior, has_criterion]),
                "progress_monitoring_method": progress_method,
                "implementer": implementer,
            })

        # ── Alerts ────────────────────────────────────────────────────────────
        if not result["special_education_services"] and not result["related_services"]:
            result["alerts"].append("No services extracted from IEP — document may need manual review")
        if not result["classroom_accommodations"] and not result["testing_accommodations"]:
            result["alerts"].append("No accommodations extracted from IEP PDF — verify against Frontline")
        if not result["parent_rights_provided"]:
            result["alerts"].append("No documentation that parent rights were provided at ARD")
        for i, goal in enumerate(result["goals_detail"]):
            if not goal["all_four_components"]:
                missing = [k for k in ["has_timeframe", "has_condition", "has_behavior", "has_criterion"] if not goal[k]]
                result["alerts"].append(f"Goal {i+1} missing TEA components: {', '.join(missing)}")
            if not goal["progress_monitoring_method"]:
                result["alerts"].append(f"Goal {i+1} has no progress monitoring method documented")

        return result

    def analyze_all(self):
        """Run all analysis modules."""
        # Load assessment profile from Frontline
        self._load_assessment_profile()
        # Load normalized SIS/MAP/STAAR profile if available
        self._load_student_profile()
        # Load compliance / transportation / alternate assessment profile if available
        self._load_compliance_profile()
        # Load additional Lively-wide Frontline profiles
        self._load_accommodations_profile()
        self._load_goals_profile()
        self._load_telpas_profile()
        self._load_behavior_intervention()
        self._load_transportation_profile()
        
        self.analysis = {
            "student_id": self.student_id,
            "document_count": len(self.documents),
            "documents": self.documents,
            "alerts": [],
            "evaluation_status": self._analyze_evaluation_timeline(),
            "copy_paste_issues": self._detect_copy_paste(),
            "sld_consistency": self._analyze_sld_consistency(),
            "attention_red_flags": self._detect_adhd_indicators(),
            "dyslexia_status": self._analyze_dyslexia_status(),
            "attendance_analysis": self._analyze_attendance(),
            "goal_analysis": self._analyze_goals(),
            "student_info": self._extract_student_info(),
            "map_assessment": self._analyze_map_assessment(),
            "deliberations": self._extract_deliberations(),  # ARD Deliberations
            "assessment_profile": self.assessment_profile,  # Frontline Assessment Profile
            "student_profile": self.student_profile,  # SIS/MAP/STAAR template profile
            "compliance_profile": self.compliance_profile,  # Funding/transport/alt-assessment
            "accommodations_profile": self.accommodations_profile,
            "goals_profile": self.goals_profile,
            "telpas_profile": self.telpas_profile,
            "behavior_intervention": self.behavior_intervention,
            "transportation_profile": self.transportation_profile,
            "fie_data": self._extract_fie_data(),
            "reed_data": self._extract_reed_data(),
            "iep_services": self._extract_iep_services(),
        }
        
        # Compile all alerts
        self._compile_alerts()
        
        return self.analysis
    
    def _extract_student_info(self) -> dict:
        """Extract basic student information."""
        info = {
            "name": None,
            "dob": None,
            "grade": None,
            "school": None,
            "parent": None,
            "disability": None
        }
        
        # PRIORITY 1: Use assessment profile name (most reliable source - from Frontline)
        if self.assessment_profile and self.assessment_profile.get('student_name'):
            profile_name = self.assessment_profile['student_name']
            # Convert "LastName, FirstName" to "FirstName LastName" 
            if ',' in profile_name:
                parts = profile_name.split(',', 1)
                info["name"] = f"{parts[1].strip()} {parts[0].strip()}"
            else:
                info["name"] = profile_name
        
        # Find the most recent IEP
        ieps = [d for d in self.documents if "IEP" in d["type"]]
        if not ieps:
            return info
            
        latest_iep = sorted(ieps, key=lambda x: x["date"] or "", reverse=True)[0]
        text = self.extracted_text.get(latest_iep["filename"], "")
        
        # PRIORITY 2: Extract name from IEP only if not found in profile
        if not info["name"]:
            # Pattern 1: "Student Name:" field (most reliable IEP field)
            name_match = re.search(r'Student\s+Name:\s*([A-Z][a-z]+(?:\s+[A-Za-z\-\']+)+)', text)
            if name_match:
                # Ensure we don't accidentally capture parent labels
                candidate = name_match.group(1).strip()
                # Stop at common following fields
                candidate = re.split(r'\s+(?:DOB|Grade|Parent|Date|Birth|School|Campus|Student\s+ID)', candidate)[0].strip()
                if candidate and len(candidate.split()) >= 2:
                    info["name"] = candidate

            # Pattern 2: "Student:" label followed by name
            if not info["name"]:
                name_match = re.search(r'(?:^|\n)\s*Student:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', text)
                if name_match:
                    info["name"] = name_match.group(1).strip()

            # Pattern 3: Student ID followed by name (2+ words)
            if not info["name"]:
                name_match = re.search(rf'{self.student_id}\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', text)
                if name_match:
                    candidate = name_match.group(1).strip()
                    # Take only first 2-3 words (first middle last) to avoid grabbing extra text
                    parts = candidate.split()[:3]
                    info["name"] = " ".join(parts)
            
        # Extract DOB
        dob_match = re.search(r'DOB:\s*(\d{2}/\d{2}/\d{4})', text)
        if dob_match:
            info["dob"] = dob_match.group(1)
            
        # Extract grade
        grade_match = re.search(r'Grade:\s*(\d{2})', text)
        if grade_match:
            info["grade"] = grade_match.group(1)
            
        # Extract school
        school_match = re.search(r'Attending School:\s*([A-Za-z\s]+?)(?:\s{2,}|Parent)', text)
        if school_match:
            info["school"] = school_match.group(1).strip()
        
        # Extract parent name (to ensure we don't confuse it with student name)
        parent_match = re.search(r'Parent(?:/Guardian)?\s*(?:Name)?:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', text)
        if parent_match:
            info["parent"] = parent_match.group(1).strip()
        
        # Validate: if extracted name matches parent name, clear it
        if info["name"] and info["parent"]:
            student_lower = info["name"].lower().strip()
            parent_lower = info["parent"].lower().strip()
            if student_lower == parent_lower:
                info["name"] = None  # Reset — we got the parent name by mistake
            
        # Extract disability
        disability_match = re.search(r'Primary:\s*(\d{2}\s+[A-Za-z\s]+?)(?:\n|Based)', text)
        if disability_match:
            info["disability"] = disability_match.group(1).strip()
            
        return info
    
    def _analyze_evaluation_timeline(self) -> dict:
        """Analyze evaluation timeline and check for overdue re-eval."""
        result = {
            "initial_fie_date": None,
            "last_full_eval_date": None,
            "last_reed_date": None,
            "reed_had_testing": None,
            "days_since_full_eval": None,
            "eval_overdue": False,
            "alert": None
        }
        
        # Find FIE and REED documents
        for doc in self.documents:
            text = self.extracted_text.get(doc["filename"], "")
            
            if doc["type"] == "REED":
                result["last_reed_date"] = doc["date"]
                # Check if REED had actual testing
                if "no additional data is needed" in text.lower():
                    result["reed_had_testing"] = False
                    
            # Look for FIE date references in any document
            fie_match = re.search(r'evaluation.*?report.*?dated?\s*(\d{1,2}[./]\d{1,2}[./]\d{2,4})', text, re.I)
            if fie_match:
                try:
                    date_str = fie_match.group(1)
                    # Handle various date formats
                    for fmt in ["%m/%d/%Y", "%m.%d.%Y", "%m/%d/%y", "%m.%d.%y"]:
                        try:
                            result["initial_fie_date"] = datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
                            break
                        except:
                            continue
                except:
                    pass
                    
        # Calculate days since evaluation
        if result["initial_fie_date"]:
            eval_date = datetime.strptime(result["initial_fie_date"], "%Y-%m-%d")
            days_since = (datetime.now() - eval_date).days
            result["days_since_full_eval"] = days_since
            result["last_full_eval_date"] = result["initial_fie_date"]
            
            # Check if overdue (3 years = 1095 days)
            if days_since > 1095:
                result["eval_overdue"] = True
                years = days_since / 365
                result["alert"] = f"FIE is {years:.1f} years old - RE-EVALUATION OVERDUE"
                
        return result
    
    def _detect_copy_paste(self) -> list:
        """Detect copy/paste issues between IEPs."""
        issues = []
        
        # Get IEPs sorted by date
        ieps = [d for d in self.documents if "IEP" in d["type"] and d["date"]]
        ieps = sorted(ieps, key=lambda x: x["date"])
        
        if len(ieps) < 2:
            return issues
            
        # Check for wrong student names
        student_info = self._extract_student_info()
        expected_first_name = None
        if student_info.get("name"):
            name_parts = student_info.get("name", "").split()
            # First name could be first or second part depending on format
            expected_first_name = name_parts[0] if name_parts else None
        
        # Get all first names mentioned in the documents to find anomalies
        all_first_names = set()
        for doc in self.documents:
            text = self.extracted_text.get(doc["filename"], "")
            
            # Look for patterns like "Name will" or "Name has" which typically have student first names
            name_will_matches = re.findall(r'\b([A-Z][a-z]{2,10})\s+(?:will\s+be|will\s+receive|has\s+been|is\s+expected|needs?\s+to)', text)
            all_first_names.update(name_will_matches)
        
        # Now check for wrong names in documents
        for doc in self.documents:
            text = self.extracted_text.get(doc["filename"], "")
            
            # Look for any first name that appears in "will be provided" type sentences
            # that doesn't match the expected student name
            name_in_service_pattern = re.findall(r'([A-Z][a-z]{2,10})\s+(?:will\s+be\s+provided|will\s+receive|will\s+participate)', text)
            
            for found_name in name_in_service_pattern:
                # Skip common words that might match
                skip_words = {'Student', 'Parent', 'Teacher', 'Staff', 'When', 'This', 'Each', 'Progress', 
                              'Instruction', 'Content', 'Services', 'Support', 'Special', 'General'}
                if found_name in skip_words:
                    continue
                    
                # If we have an expected name and this doesn't match
                if expected_first_name and found_name.lower() != expected_first_name.lower():
                    # Find the context
                    match = re.search(rf'{found_name}\s+will\s+(?:be\s+)?(?:provided|receive|participate)', text)
                    if match:
                        context = text[max(0, match.start()-30):match.end()+50]
                        issues.append({
                            "severity": "CRITICAL",
                            "type": "WRONG_NAME",
                            "section": "Services/Transition",
                            "found_name": found_name,
                            "expected_name": expected_first_name,
                            "document": doc["filename"],
                            "context": context.replace('\n', ' ').strip()
                        })
        
        # Check for stale attendance data
        for i, iep in enumerate(ieps):
            text = self.extracted_text.get(iep["filename"], "")
            
            # Find attendance "as of" date
            attendance_match = re.search(r'days\s+absent\s+as\s+of\s+(\d{2}/\d{2}/\d{4})', text, re.I)
            if attendance_match and iep["date"]:
                try:
                    data_date = datetime.strptime(attendance_match.group(1), "%m/%d/%Y")
                    iep_date = datetime.strptime(iep["date"], "%Y-%m-%d")
                    days_stale = (iep_date - data_date).days
                    
                    if days_stale > 60:  # More than 2 months stale
                        issues.append({
                            "severity": "HIGH",
                            "type": "STALE_ATTENDANCE",
                            "iep_date": iep["date"],
                            "data_as_of": attendance_match.group(1),
                            "days_stale": days_stale,
                            "document": iep["filename"]
                        })
                except:
                    pass
        
        # Check for identical parent concerns
        parent_concerns = {}
        for iep in ieps:
            text = self.extracted_text.get(iep["filename"], "")
            concern_match = re.search(r'Parent.*?input.*?concerns?:?\s*(.{50,200})', text, re.I | re.DOTALL)
            if concern_match:
                concern_text = concern_match.group(1).strip()[:200]
                
                # Check if this exact text appeared before
                for prev_date, prev_text in parent_concerns.items():
                    similarity = SequenceMatcher(None, concern_text, prev_text).ratio()
                    if similarity > 0.9 and iep["date"] != prev_date:
                        issues.append({
                            "severity": "HIGH",
                            "type": "STALE_PARENT_CONCERNS",
                            "current_iep": iep["date"],
                            "original_iep": prev_date,
                            "similarity": f"{similarity*100:.0f}%",
                            "text_preview": concern_text[:100] + "...",
                            "document": iep["filename"]
                        })
                        
                parent_concerns[iep["date"]] = concern_text
                
        return issues
    
    def _analyze_sld_consistency(self) -> dict:
        """Analyze SLD area consistency across documents."""
        result = {
            "fie_areas": [],
            "current_iep_areas": [],
            "missing_from_iep": [],
            "dismissed_areas": [],  # Areas formally dismissed/exited
            "added_to_iep": [],
            "consistent": True
        }
        
        # Common SLD area patterns
        sld_patterns = [
            r'basic\s*reading',
            r'reading\s*comprehension',
            r'reading\s*fluency',
            r'math(?:ematics)?\s*calculation',
            r'math(?:ematics)?\s*problem\s*solving',
            r'written\s*expression',
            r'oral\s*expression',
            r'listening\s*comprehension'
        ]
        
        # Patterns indicating dismissal/exit from an area
        dismissal_patterns = [
            r'(?:dismissed|exited|discontinued|removed)\s+(?:from\s+)?(?:services?\s+)?(?:in\s+)?(?:the\s+area\s+of\s+)?',
            r'no\s+longer\s+(?:requires?|needs?|qualifies?)',
            r'(?:met|achieved)\s+(?:goal|criteria|benchmark).*?(?:dismiss|exit|discontinue)',
            r'(?:services?|instruction)\s+(?:in|for).*?(?:will\s+be\s+)?(?:dismissed|discontinued|exited)',
            r'ard\s+committee.*?(?:determined|decided).*?(?:dismiss|exit|discontinue)',
            r'progress\s+(?:sufficient|adequate).*?(?:dismiss|exit)',
            r'(?:has|have)\s+(?:been\s+)?(?:dismissed|exited)\s+from',
            r'(?:recommend|recommends|recommended)\s+(?:dismissal|exit)',
            r'goal\s+(?:mastered|met).*?(?:dismiss|exit|discontinue)',
            r'(?:closing|closure)\s+(?:of\s+)?(?:services?|goal)',
        ]
        
        # Find areas in FIE/REED
        for doc in self.documents:
            if doc["type"] in ["FIE", "REED"]:
                text = self.extracted_text.get(doc["filename"], "").lower()
                for pattern in sld_patterns:
                    if re.search(pattern, text) and pattern not in [p.lower() for p in result["fie_areas"]]:
                        # Convert pattern to readable name
                        area_name = pattern.replace(r'\s*', ' ').replace(r'(?:ematics)?', '').title()
                        result["fie_areas"].append(area_name)
        
        # Find areas in current IEP (eligibility section)
        ieps = [d for d in self.documents if "IEP" in d["type"]]
        if ieps:
            latest_iep = sorted(ieps, key=lambda x: x["date"] or "", reverse=True)[0]
            text = self.extracted_text.get(latest_iep["filename"], "").lower()
            
            # Look specifically in eligibility section
            eligibility_section = re.search(r'determination\s*of\s*eligibility.*?(?:present\s*levels|plaafp)', text, re.DOTALL)
            if eligibility_section:
                elig_text = eligibility_section.group(0)
                for pattern in sld_patterns:
                    if re.search(pattern, elig_text):
                        area_name = pattern.replace(r'\s*', ' ').replace(r'(?:ematics)?', '').title()
                        result["current_iep_areas"].append(area_name)
        
        # Compare
        fie_set = set(result["fie_areas"])
        iep_set = set(result["current_iep_areas"])
        
        missing = list(fie_set - iep_set)
        
        # Check if missing areas were formally dismissed/exited OR had goals mastered
        dismissed = []
        potentially_mastered = []  # Areas where goals may have been met
        still_missing = []
        
        # Patterns indicating goal mastery
        mastery_patterns = [
            r'(?:goal|objective).*?(?:met|mastered|achieved|accomplished)',
            r'(?:met|mastered|achieved).*?(?:goal|objective|benchmark|criteria)',
            r'progress.*?(?:sufficient|adequate|satisfactory)',
            r'(?:demonstrate[ds]?|show[ns]?).*?(?:mastery|proficiency)',
            r'(?:no\s+longer\s+)?(?:requires?|needs?).*?(?:specially\s+designed\s+instruction|sdi)',
            r'performing.*?(?:at|above).*?(?:grade|level|standard)',
        ]
        
        for area in missing:
            area_dismissed = False
            area_mastered = False
            area_lower = area.lower()
            
            # Check all documents for dismissal language related to this area
            for doc in self.documents:
                doc_text = self.extracted_text.get(doc["filename"], "").lower()
                
                # Look for dismissal patterns near the area name
                for dismiss_pattern in dismissal_patterns:
                    # Check if dismissal language appears near the SLD area (within ~200 chars)
                    # Pattern: dismissal language + area OR area + dismissal language
                    combined_pattern1 = dismiss_pattern + r'.{0,100}' + area_lower.replace(' ', r'\s*')
                    combined_pattern2 = area_lower.replace(' ', r'\s*') + r'.{0,100}' + dismiss_pattern
                    
                    if re.search(combined_pattern1, doc_text) or re.search(combined_pattern2, doc_text):
                        area_dismissed = True
                        dismissed.append({
                            "area": area,
                            "document": doc["filename"],
                            "date": doc["date"]
                        })
                        break
                
                if area_dismissed:
                    break
                    
                # If not explicitly dismissed, check for goal mastery language in this area
                if not area_dismissed:
                    for mastery_pattern in mastery_patterns:
                        combined_pattern1 = area_lower.replace(' ', r'\s*') + r'.{0,200}' + mastery_pattern
                        combined_pattern2 = mastery_pattern + r'.{0,200}' + area_lower.replace(' ', r'\s*')
                        
                        if re.search(combined_pattern1, doc_text) or re.search(combined_pattern2, doc_text):
                            area_mastered = True
                            potentially_mastered.append({
                                "area": area,
                                "document": doc["filename"],
                                "date": doc["date"],
                                "note": "Goal mastery language found - verify if SDI still needed"
                            })
                            break
                    
                    if area_mastered:
                        break
            
            if not area_dismissed and not area_mastered:
                still_missing.append(area)
        
        result["dismissed_areas"] = dismissed
        result["potentially_mastered_areas"] = potentially_mastered
        result["missing_from_iep"] = still_missing
        result["added_to_iep"] = list(iep_set - fie_set)
        result["consistent"] = len(still_missing) == 0 and len(potentially_mastered) == 0
        
        return result
    
    def _detect_adhd_indicators(self) -> dict:
        """Detect ADHD/attention indicators across documents."""
        result = {
            "indicators_found": [],
            "evaluation_exists": False,
            "recommendation": None
        }
        
        attention_patterns = [
            (r'attention.*?(?:below|poor|weak|deficit|difficulty)', "Attention rated below average"),
            (r'easily\s+distracted', "Easily distracted"),
            (r'processing\s+speed.*?(?:weakness|deficit|significant)', "Processing speed deficit"),
            (r'frequent\s+breaks', "Needs frequent breaks"),
            (r'cool\s*down\s*(?:period|time|opportunity)', "Needs cool-down periods"),
            (r'attention\s+processing', "Attention processing issues"),
            (r'difficulty\s+(?:completing|finishing)\s+tasks', "Difficulty completing tasks"),
            (r'organizational\s+skills.*?below', "Organizational skills below average"),
            (r'redirect(?:ion|ed)', "Needs redirection"),
            (r'(?:sleeping|drowsy)\s+in\s+class', "Sleeping in class")
        ]
        
        adhd_eval_patterns = [
            r'conners',
            r'basc',
            r'adhd.*?evaluation',
            r'attention.*?deficit.*?evaluation',
            r'cpt|continuous\s+performance',
            r'other\s+health\s+impairment.*?attention'
        ]
        
        for doc in self.documents:
            text = self.extracted_text.get(doc["filename"], "").lower()
            
            # Check for ADHD indicators
            for pattern, description in attention_patterns:
                matches = re.findall(pattern, text, re.I)
                if matches:
                    result["indicators_found"].append({
                        "indicator": description,
                        "document": doc["filename"],
                        "date": doc["date"],
                        "count": len(matches)
                    })
            
            # Check if ADHD evaluation exists
            for pattern in adhd_eval_patterns:
                if re.search(pattern, text, re.I):
                    result["evaluation_exists"] = True
                    break
        
        # Generate recommendation: keep this as a gentle advocacy nudge, not a
        # compliance error. We avoid framing parent choice as "wrong" and do
        # not escalate this to a CRITICAL evaluation issue.
        if len(result["indicators_found"]) >= 3 and not result["evaluation_exists"]:
            result["recommendation"] = (
                "Multiple attention/Executive Function indicators appear across records. "
                "If the family and campus team have ongoing concerns about attention, "
                "they may consider discussing a possible ADHD/OHI evaluation or other supports."
            )
            
        return result
    
    def _analyze_dyslexia_status(self) -> dict:
        """Analyze dyslexia identification status."""
        result = {
            "receives_services": False,
            "formally_identified": None,  # Unknown until we can parse the checkbox
            "in_dyslexia_class": False,
            "phonological_eval_exists": False,
            "recommendation": None
        }
        
        for doc in self.documents:
            text = self.extracted_text.get(doc["filename"], "").lower()
            
            if "dyslexia class" in text or "dyslexia services" in text:
                result["receives_services"] = True
                
            if "100" in text and "dyslexia" in text:
                result["in_dyslexia_class"] = True
                
            if "ctopp" in text or "phonological processing" in text:
                result["phonological_eval_exists"] = True
                
            # Check for E1520 code
            if "e1520" in text:
                result["formally_identified"] = True
                
        if result["receives_services"] and not result["phonological_eval_exists"]:
            result["recommendation"] = "Student receives dyslexia services but no formal phonological processing evaluation documented"
            
        return result
    
    def _analyze_attendance(self) -> dict:
        """Analyze attendance patterns across IEPs."""
        result = {
            "history": [],
            "chronic_pattern": False,
            "improving": False,
            "housing_barriers": False,
            "transportation_barriers": False
        }
        
        for doc in self.documents:
            if "IEP" not in doc["type"]:
                continue
                
            text = self.extracted_text.get(doc["filename"], "")
            
            # Extract attendance data
            absent_match = re.search(r'days\s+absent.*?:\s*(\d+)', text, re.I)
            if absent_match and doc["date"]:
                result["history"].append({
                    "date": doc["date"],
                    "days_absent": int(absent_match.group(1))
                })
            
            # Check for barriers
            if "shelter" in text.lower():
                result["housing_barriers"] = True
            if "transport" in text.lower() or "buss" in text.lower():
                result["transportation_barriers"] = True
                
        # Analyze pattern
        if result["history"]:
            result["history"] = sorted(result["history"], key=lambda x: x["date"])
            
            # Check if chronic (>18 days in any year is ~10%)
            for entry in result["history"]:
                if entry["days_absent"] > 18:
                    result["chronic_pattern"] = True
                    break
                    
            # Check if improving
            if len(result["history"]) >= 2:
                recent = result["history"][-1]["days_absent"]
                previous = result["history"][-2]["days_absent"]
                # If attendance was already solid and stays solid, do not
                # label it as "not improving" in a negative way — we only
                # flag an "improving" trend when it is climbing out of a
                # higher-absence pattern.
                if previous > 18 and recent < previous:
                    result["improving"] = True
                else:
                    result["improving"] = False
                
        return result
    
    def _analyze_goals(self) -> dict:
        """Analyze goal quality and progress."""
        result = {
            "current_goals": [],
            "previous_goals_met": 0,
            "previous_goals_not_met": 0,
            "goal_quality_issues": []
        }
        
        # Find most recent IEP
        ieps = [d for d in self.documents if "IEP" in d["type"]]
        if not ieps:
            return result
            
        latest_iep = sorted(ieps, key=lambda x: x["date"] or "", reverse=True)[0]
        text = self.extracted_text.get(latest_iep["filename"], "")
        
        # Extract goals
        goal_matches = re.findall(r'Measurable Annual Goal:\s*(.+?)(?:Progress will be|Implementer|$)', text, re.DOTALL)
        
        for goal_text in goal_matches[:10]:  # Limit to 10 goals
            goal_text = goal_text.strip()[:500]
            
            # Check TEA 4 components
            has_timeframe = bool(re.search(r'by.*?(?:end|date|IEP)', goal_text, re.I))
            has_condition = bool(re.search(r'given|when|after|during', goal_text, re.I))
            has_behavior = bool(re.search(r'will\s+\w+', goal_text, re.I))
            has_criterion = bool(re.search(r'\d+\s*(?:out of|%|percent|times)', goal_text, re.I))
            
            # Extract baseline
            baseline_match = re.search(r'beginning point.*?was\s+(\d+)', text, re.I)
            baseline = baseline_match.group(1) if baseline_match else None
            
            result["current_goals"].append({
                "text_preview": goal_text[:200] + "...",
                "has_timeframe": has_timeframe,
                "has_condition": has_condition,
                "has_behavior": has_behavior,
                "has_criterion": has_criterion,
                "complete": all([has_timeframe, has_condition, has_behavior, has_criterion]),
                "baseline": baseline
            })
            
            # Check for quality issues
            # A baseline of 0 is often appropriate for a truly emerging skill
            # (it can mean "not yet started" rather than an error), so we no
            # longer flag this as a blanket quality issue.
                
        # Check previous goal progress
        if "not met" in text.lower() or "did not meet" in text.lower():
            result["previous_goals_not_met"] += text.lower().count("not met")
            result["previous_goals_not_met"] += text.lower().count("did not meet")
            
        if "goal met" in text.lower() or "mastered" in text.lower():
            result["previous_goals_met"] += text.lower().count("met")
            
        return result
    
    def _compile_alerts(self):
        """Compile all alerts from analysis."""
        alerts = []
        
        # Evaluation alerts
        if self.analysis["evaluation_status"]["eval_overdue"]:
            alerts.append({
                "severity": "CRITICAL",
                "category": "Evaluation",
                "message": self.analysis["evaluation_status"]["alert"]
            })
            
        # Copy/paste alerts
        for issue in self.analysis["copy_paste_issues"]:
            alerts.append({
                "severity": issue["severity"],
                "category": "Copy/Paste",
                "message": f"{issue['type']}: {issue.get('found_name', '')} {issue.get('text_preview', '')[:50]}"
            })
            
        # SLD consistency alerts - missing areas 
        # Changed from HIGH to INQUIRY: Areas may be appropriately dismissed due to goal mastery
        goals_met = self.analysis.get("goal_analysis", {}).get("previous_goals_met", 0)
        
        if not self.analysis["sld_consistency"]["consistent"]:
            for missing in self.analysis["sld_consistency"]["missing_from_iep"]:
                # If student has met goals before, this becomes an inquiry not an alarm
                if goals_met > 0:
                    alerts.append({
                        "severity": "INQUIRY",
                        "category": "SLD Verification Needed",
                        "message": f"{missing} in FIE but not current IEP - verify: was goal mastered and SDI appropriately discontinued? ({goals_met} previous goals met)"
                    })
                else:
                    alerts.append({
                        "severity": "HIGH",
                        "category": "SLD Consistency",
                        "message": f"{missing} identified in FIE but missing from current IEP eligibility"
                    })
        
        # SLD areas with potential goal mastery (INQUIRY - need verification)
        for mastered in self.analysis["sld_consistency"].get("potentially_mastered_areas", []):
            alerts.append({
                "severity": "INQUIRY",
                "category": "SLD Verification Needed",
                "message": f"{mastered['area']}: Goal mastery language found - verify if SDI is still required or if area was appropriately dismissed"
            })
        
        # SLD areas formally dismissed (INFO - good documentation)
        for dismissed in self.analysis["sld_consistency"].get("dismissed_areas", []):
            alerts.append({
                "severity": "INFO",
                "category": "SLD Dismissed",
                "message": f"{dismissed['area']} formally dismissed/exited (documented {dismissed['date']})"
            })
                
        # ADHD alerts – treat as inquiry/advocacy, not a hard compliance error.
        if self.analysis["attention_red_flags"]["recommendation"]:
            alerts.append({
                "severity": "INQUIRY",
                "category": "Attention / Possible ADHD",
                "message": self.analysis["attention_red_flags"]["recommendation"]
            })
            
        # Dyslexia alerts
        if self.analysis["dyslexia_status"]["recommendation"]:
            alerts.append({
                "severity": "MEDIUM",
                "category": "Dyslexia",
                "message": self.analysis["dyslexia_status"]["recommendation"]
            })
        
        # MAP Assessment alerts
        map_analysis = self.analysis.get("map_assessment", {})
        if map_analysis.get("available") and map_analysis.get("alerts"):
            for map_alert in map_analysis["alerts"]:
                alerts.append({
                    "severity": map_alert["type"],
                    "category": map_alert["source"],
                    "message": map_alert["message"],
                    "recommendation": map_alert.get("recommendation")
                })
            
        self.analysis["alerts"] = alerts
        self.analysis["critical_count"] = len([a for a in alerts if a["severity"] == "CRITICAL"])
        self.analysis["high_count"] = len([a for a in alerts if a["severity"] == "HIGH"])
        self.analysis["medium_count"] = len([a for a in alerts if a["severity"] == "MEDIUM"])
        self.analysis["inquiry_count"] = len([a for a in alerts if a["severity"] == "INQUIRY"])
        self.analysis["info_count"] = len([a for a in alerts if a["severity"] == "INFO"])
        
    def generate_report(self) -> str:
        """Generate markdown report."""
        a = self.analysis
        info = a["student_info"]
        
        report = f"""# 🔍 SpEdGalexii Deep Dive Analysis
## Student: {info.get('name', 'Unknown')} | ID: {self.student_id}

**Generated:** {datetime.now().strftime("%Y-%m-%d %H:%M")}  
**Documents Analyzed:** {a['document_count']}

---

## 🚨 ALERT SUMMARY

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | {a['critical_count']} |
| 🟠 HIGH | {a['high_count']} |
| ❓ INQUIRY | {a.get('inquiry_count', 0)} |
| 🟡 MEDIUM | {a['medium_count']} |
| ℹ️ INFO | {a.get('info_count', 0)} |

"""
        
        for alert in a["alerts"]:
            if alert["severity"] == "CRITICAL":
                icon = "🔴"
            elif alert["severity"] == "HIGH":
                icon = "🟠"
            elif alert["severity"] == "INQUIRY":
                icon = "❓"
            elif alert["severity"] == "MEDIUM":
                icon = "🟡"
            else:
                icon = "ℹ️"
            report += f"- {icon} **{alert['category']}:** {alert['message']}\n"
            
        report += f"""
---

## 📋 Evaluation Status

- **Initial FIE:** {a['evaluation_status']['initial_fie_date'] or 'Unknown'}
- **Days Since Full Evaluation:** {a['evaluation_status']['days_since_full_eval'] or 'Unknown'}
- **Evaluation Overdue:** {'🚨 YES' if a['evaluation_status']['eval_overdue'] else '✅ No'}
- **Last REED:** {a['evaluation_status']['last_reed_date'] or 'None'}
- **REED Had New Testing:** {a['evaluation_status']['reed_had_testing']}

---

## 📊 SLD Consistency

**FIE Areas:** {', '.join(a['sld_consistency']['fie_areas']) or 'Not found'}  
**Current IEP Areas:** {', '.join(a['sld_consistency']['current_iep_areas']) or 'Not found'}  
**Missing from IEP:** {', '.join(a['sld_consistency']['missing_from_iep']) or 'None ✅'}
"""
        
        # Add potentially mastered areas section - INQUIRY items
        if a['sld_consistency'].get('potentially_mastered_areas'):
            report += "\n**❓ Verification Needed (Goals May Have Been Mastered):**\n"
            for mastered in a['sld_consistency']['potentially_mastered_areas']:
                report += f"- {mastered['area']}: {mastered['note']} (see {mastered['document'][:35]}...)\n"
            report += "\n*⚠️ Before adding goals in these areas, verify with case manager if SDI was appropriately discontinued due to goal mastery.*\n"
        
        # Add dismissed areas section if any exist
        if a['sld_consistency'].get('dismissed_areas'):
            report += "\n**✅ Formally Dismissed/Exited Areas:**\n"
            for dismissed in a['sld_consistency']['dismissed_areas']:
                report += f"- {dismissed['area']} (documented in {dismissed['document'][:40]}..., {dismissed['date']})\n"
        
        report += f"""
---

## 🧠 Attention/ADHD Analysis

**Indicators Found:** {len(a['attention_red_flags']['indicators_found'])}  
**Formal Evaluation Exists:** {'Yes' if a['attention_red_flags']['evaluation_exists'] else '❌ No'}

"""
        if a['attention_red_flags']['indicators_found']:
            report += "| Indicator | Document | Date |\n|-----------|----------|------|\n"
            for ind in a['attention_red_flags']['indicators_found'][:10]:
                report += f"| {ind['indicator']} | {ind['document'][:30]}... | {ind['date']} |\n"
                
        report += f"""
---

## 📖 Dyslexia Status

- **Receives Dyslexia Services:** {'Yes' if a['dyslexia_status']['receives_services'] else 'No'}
- **In Dyslexia Class:** {'Yes' if a['dyslexia_status']['in_dyslexia_class'] else 'No'}
- **Phonological Evaluation:** {'Yes' if a['dyslexia_status']['phonological_eval_exists'] else '❌ No'}

---

## 📅 Attendance History

"""
        if a['attendance_analysis']['history']:
            report += "| Date | Days Absent |\n|------|-------------|\n"
            for entry in a['attendance_analysis']['history']:
                report += f"| {entry['date']} | {entry['days_absent']} |\n"
                
        report += f"""
- **Chronic Pattern:** {'Yes' if a['attendance_analysis']['chronic_pattern'] else 'No'}
- **Trend:** {'📈 Improving' if a['attendance_analysis']['improving'] else '📉 Not improving'}
- **Housing Barriers:** {'Yes' if a['attendance_analysis']['housing_barriers'] else 'No'}
- **Transportation Barriers:** {'Yes' if a['attendance_analysis']['transportation_barriers'] else 'No'}

---

## 🎯 Goal Analysis

**Current Goals:** {len(a['goal_analysis']['current_goals'])}  
**Previous Goals Not Met:** {a['goal_analysis']['previous_goals_not_met']}

"""
        if a['goal_analysis']['goal_quality_issues']:
            report += "**Quality Issues:**\n"
            for issue in a['goal_analysis']['goal_quality_issues']:
                report += f"- ⚠️ {issue}\n"
        
        # MAP Assessment Section (NEW)
        map_data = a.get('map_assessment', {})
        if map_data.get('available'):
            report += """
---

## 📊 MAP Assessment Data

"""
            summary = map_data.get('summary', {})
            for subject, data in summary.items():
                if isinstance(data, dict) and 'rit_score' in data:
                    report += f"### {subject.title()}\n"
                    report += f"- **RIT Score:** {data.get('rit_score', 'N/A')}\n"
                    report += f"- **Percentile:** {data.get('percentile', 'N/A')}th\n"
                    report += f"- **Achievement Level:** {data.get('achievement_level', 'N/A')}\n"
                    if data.get('lexile'):
                        report += f"- **Lexile:** {data.get('lexile')}\n"
                    if data.get('quantile'):
                        report += f"- **Quantile:** {data.get('quantile')}\n"
                    report += "\n"
                    
            # Growth status
            growth_status = map_data.get('growth_status', {})
            if growth_status:
                report += "### Growth Analysis\n"
                report += "| Subject | Growth Percentile | Status |\n|---------|------------------|--------|\n"
                for subject, growth in growth_status.items():
                    gp = growth.get('growth_percentile', 'N/A')
                    status = growth.get('status', 'N/A')
                    report += f"| {subject.title()} | {gp} | {status} |\n"
                report += "\n"
                    
            # STAAR projection
            staar = map_data.get('staar_projection', {})
            if staar.get('projection'):
                proj = staar.get('projection', 'N/A')
                prob = staar.get('probability', 'N/A')
                icon = "🟢" if proj == "Meets" else "🟡" if proj == "Approaches" else "🔴"
                report += f"### STAAR Projection\n"
                report += f"{icon} **Projected Level:** {proj} (Probability: {prob}%)\n\n"
                
            # PLAAFP recommendations
            plaafp_stmts = map_data.get('plaafp_statements', [])
            if plaafp_stmts:
                report += "### 📝 Recommended PLAAFP Statements (from MAP)\n"
                for stmt in plaafp_stmts[:5]:  # Show top 5
                    report += f"- {stmt}\n"
                report += "\n"
                
            # Goal recommendations
            goal_recs = map_data.get('goal_recommendations', [])
            if goal_recs:
                report += "### 🎯 Goal Recommendations (from MAP)\n"
                for rec in goal_recs[:5]:  # Show top 5
                    report += f"**{rec.get('subject', '')} - {rec.get('area', '')}**\n"
                    report += f"- Current Level: {rec.get('current_level', 'N/A')}\n"
                    report += f"- Suggested Goal: {rec.get('goal_template', 'N/A')}\n\n"
                
        report += """
---

*Generated by SpEdGalexii Deep Dive Analyzer*
"""
        return report
    
    def save_results(self):
        """Save analysis results."""
        # Save JSON
        json_path = OUTPUT_FOLDER / f"DEEP_DIVE_{self.student_id}.json"
        with open(json_path, 'w') as f:
            json.dump(self.analysis, f, indent=2, default=str)
            
        # Save Markdown report
        md_path = OUTPUT_FOLDER / f"DEEP_DIVE_{self.student_id}_REPORT.md"
        with open(md_path, 'w') as f:
            f.write(self.generate_report())
            
        return json_path, md_path


def find_all_students() -> list:
    """Find all unique student IDs in the ieps folder."""
    student_ids = set()
    # Support PDFs organized either directly under IEP_FOLDER or inside
    # per-student subfolders (ieps/<id>/...).
    for f in IEP_FOLDER.rglob("*.pdf*"):
        # Extract student ID (first numeric sequence)
        match = re.match(r'(\d+)', f.name)
        if match:
            student_ids.add(match.group(1))
    return sorted(student_ids)


def main():
    parser = argparse.ArgumentParser(description="SpEdGalexii Deep Dive Analyzer")
    parser.add_argument("--student", type=str, help="Student ID to analyze")
    parser.add_argument("--all", action="store_true", help="Analyze all students")
    parser.add_argument("--map-file", type=str, help="Path to MAP StudentProfile Excel file")
    args = parser.parse_args()
    
    if args.all:
        students = find_all_students()
        print(f"Found {len(students)} students to analyze")
        
        for student_id in students:
            print(f"\n{'='*60}")
            print(f"Analyzing student: {student_id}")
            print('='*60)
            
            analyzer = StudentDocumentAnalyzer(student_id, map_file=args.map_file)
            analyzer.find_documents()
            analyzer.extract_text()
            analyzer.analyze_all()
            json_path, md_path = analyzer.save_results()
            
            print(f"  Documents: {analyzer.analysis['document_count']}")
            print(f"  Alerts: {analyzer.analysis['critical_count']} critical, {analyzer.analysis['high_count']} high")
            print(f"  Report: {md_path}")
            
    elif args.student:
        analyzer = StudentDocumentAnalyzer(args.student, map_file=args.map_file)
        docs = analyzer.find_documents()
        
        if not docs:
            print(f"No documents found for student {args.student}")
            return
            
        print(f"Found {len(docs)} documents for student {args.student}")
        
        print("Extracting text...")
        analyzer.extract_text()
        
        print("Running analysis...")
        analysis = analyzer.analyze_all()
        
        print("\n" + "="*60)
        print("ALERT SUMMARY")
        print("="*60)
        for alert in analysis["alerts"]:
            print(f"[{alert['severity']}] {alert['category']}: {alert['message']}")
            
        json_path, md_path = analyzer.save_results()
        print(f"\nResults saved:")
        print(f"  JSON: {json_path}")
        print(f"  Report: {md_path}")
        
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
