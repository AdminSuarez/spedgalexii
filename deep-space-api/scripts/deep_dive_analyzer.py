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
                'telpas_manipulating_materials': row['TELPAS: Manipulating Test Materials'] if pd.notna(row['TELPAS: Manipulating Test Materials']) else None,
                'testing_accommodation_count': int(row['Testing Accommodation Count']) if pd.notna(row['Testing Accommodation Count']) else 0,
                'testing_accommodations': row['Testing Accommodations'] if pd.notna(row['Testing Accommodations']) else None,
                'all_accommodation_count': int(row['All Accommodation Count']) if pd.notna(row['All Accommodation Count']) else 0,
                'all_accommodations': row['All Accommodations'] if pd.notna(row['All Accommodations']) else None,
            }
            return self.assessment_profile
        except Exception as e:
            print(f"Warning: Could not load assessment profile: {e}")
            return None

    # ... (rest of deep_dive_analyzer.py omitted for brevity; identical to source) ...

if __name__ == "__main__":
    main()
