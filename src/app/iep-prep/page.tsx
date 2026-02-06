"use client";

import React, { useState, useMemo, useCallback } from "react";
import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import { FileText, Upload, Copy, Check, AlertTriangle, ChevronDown, ChevronRight, Sparkles } from "lucide-react";

// IEP Section structure matching Frontline order
type IEPSection = {
  id: string;
  number: string;
  name: string;
  fields: IEPField[];
  conditional?: boolean;
  conditionField?: string;
};

type IEPField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "yesno" | "select" | "list" | "date";
  options?: string[];
  required?: boolean;
  source?: string;
  value?: string | string[];
};

type DeepDiveData = {
  student_info?: {
    name?: string;
    dob?: string;
    grade?: string;
    school?: string;
    disability?: string;
  };
  evaluation_status?: {
    last_full_eval_date?: string;
    initial_fie_date?: string;
    eval_overdue?: boolean;
    alert?: string;
  };
  deliberations?: {
    meeting_info?: {
      ard_date?: string;
      purpose?: string;
    };
    committee_members?: Array<{ name: string; role: string; present: string }>;
    parent_concerns?: string[];
    plaafp_sections?: Array<{
      subject: string;
      grades?: string;
      teacher_comment?: string;
      goal_progress?: string;
      concerns?: string;
    }>;
    evaluation_review?: {
      fie_date?: string;
      eligibility?: string;
      reed_due_date?: string;
    };
  };
  goal_analysis?: {
    current_goals?: Array<{
      text_preview: string;
      has_timeframe: boolean;
      has_condition: boolean;
      has_behavior: boolean;
      has_criterion: boolean;
      complete: boolean;
      baseline?: string;
    }>;
  };
  fie_data?: {
    available?: boolean;
    fie_date?: string;
    cognitive_scores?: {
      instrument?: string;
      scores?: Array<{ area: string; standard_score: number; result?: string }>;
    };
    achievement_scores?: {
      instrument?: string;
      scores?: Array<{ area: string; standard_score: number; result?: string }>;
    };
    sld_eligibility?: {
      areas_identified?: string[];
    };
  };
  map_assessment?: {
    reading?: { rit?: number; percentile?: number; staar_projection?: string };
    math?: { rit?: number; percentile?: number; staar_projection?: string };
  };
};

// Define all IEP sections in Frontline order
const IEP_SECTIONS: IEPSection[] = [
  {
    id: "event_info",
    number: "I",
    name: "Event Info",
    fields: [
      { key: "schedule_date", label: "Schedule Date", type: "date" },
      { key: "due_date", label: "Due Date", type: "date" },
      { key: "meeting_purpose", label: "Meeting Purpose", type: "text" },
    ],
  },
  {
    id: "eligibilities",
    number: "II",
    name: "Eligibilities/Impairments",
    fields: [
      { key: "primary_disability", label: "Primary Disability", type: "text", required: true },
      { key: "evaluation_date", label: "Evaluation Date", type: "date", required: true },
      { key: "eligibility_date", label: "Eligibility Date", type: "date" },
      { key: "sld_areas", label: "SLD Areas (if applicable)", type: "list" },
    ],
  },
  {
    id: "present_levels_data",
    number: "III",
    name: "Present Levels - Data Sources",
    fields: [
      { key: "data_sources", label: "Data Sources Checked", type: "list" },
      { key: "last_full_eval", label: "Last Full Evaluation Date", type: "date" },
      { key: "reeval_status", label: "Reevaluation Status", type: "text" },
    ],
  },
  {
    id: "plaafp_curriculum",
    number: "IV",
    name: "PLAAFP - Curriculum & Learning",
    fields: [
      { key: "disability_impacts_curriculum", label: "Disability impacts curriculum?", type: "yesno", required: true },
      { key: "strengths_curriculum", label: "Student Strengths", type: "textarea", required: true },
      { key: "needs_curriculum", label: "Student Needs", type: "textarea", required: true },
      { key: "pen_curriculum", label: "Priority Education Needs", type: "list" },
    ],
  },
  {
    id: "plaafp_social",
    number: "V",
    name: "PLAAFP - Social/Emotional",
    fields: [
      { key: "disability_impacts_social", label: "Disability impacts social/emotional?", type: "yesno" },
      { key: "strengths_social", label: "Student Strengths", type: "textarea" },
      { key: "needs_social", label: "Student Needs", type: "textarea" },
      { key: "bip_required", label: "BIP Required?", type: "yesno" },
    ],
  },
  {
    id: "plaafp_independent",
    number: "VI",
    name: "PLAAFP - Independent Functioning",
    fields: [
      { key: "disability_impacts_independent", label: "Disability impacts independent functioning?", type: "yesno" },
      { key: "strengths_independent", label: "Student Strengths", type: "textarea" },
      { key: "needs_independent", label: "Student Needs", type: "textarea" },
    ],
  },
  {
    id: "plaafp_communication",
    number: "VII",
    name: "PLAAFP - Communication",
    fields: [
      { key: "disability_impacts_communication", label: "Disability impacts communication?", type: "yesno" },
      { key: "strengths_communication", label: "Student Strengths", type: "textarea" },
      { key: "needs_communication", label: "Student Needs", type: "textarea" },
    ],
  },
  {
    id: "plaafp_health",
    number: "VIII",
    name: "PLAAFP - Health Care",
    fields: [
      { key: "has_health_conditions", label: "Has health conditions?", type: "yesno" },
      { key: "health_conditions", label: "Health Conditions", type: "list" },
      { key: "nurse_required", label: "Nurse Required?", type: "yesno" },
    ],
  },
  {
    id: "student_parent_input",
    number: "IX",
    name: "Student & Parent Input",
    fields: [
      { key: "student_input", label: "Student Input", type: "textarea" },
      { key: "parent_input", label: "Parent Input", type: "textarea" },
      { key: "parent_concerns", label: "Parent Concerns", type: "textarea", required: true },
    ],
  },
  {
    id: "disability_impact",
    number: "X",
    name: "Disability Impact Statement",
    fields: [
      { key: "disability_impact", label: "Disability Impact Statement", type: "textarea", required: true },
    ],
  },
  {
    id: "assistive_tech",
    number: "XI",
    name: "Assistive Technology",
    fields: [
      { key: "at_needed", label: "AT Needed?", type: "yesno" },
      { key: "at_statement", label: "AT Statement", type: "textarea" },
      { key: "at_devices", label: "AT Devices", type: "list" },
    ],
  },
  {
    id: "goals",
    number: "XII",
    name: "Annual Goals",
    fields: [
      { key: "goals", label: "Goals", type: "list" },
    ],
  },
  {
    id: "accommodations",
    number: "XIII",
    name: "Accommodations",
    fields: [
      { key: "classroom_accommodations", label: "Classroom Accommodations", type: "list" },
      { key: "testing_accommodations", label: "Testing Accommodations", type: "list" },
    ],
  },
  {
    id: "state_assessment",
    number: "XIV",
    name: "State Assessment (STAAR)",
    fields: [
      { key: "staar_participation", label: "STAAR Participation", type: "yesno" },
      { key: "staar_alt2", label: "STAAR Alt 2 Considered?", type: "yesno" },
      { key: "staar_accommodations", label: "STAAR Accommodations", type: "list" },
    ],
  },
  {
    id: "district_assessment",
    number: "XV",
    name: "District Assessment",
    fields: [
      { key: "district_available", label: "District Assessments Available?", type: "yesno" },
      { key: "can_participate", label: "Can Participate?", type: "yesno" },
      { key: "map_results", label: "MAP Results", type: "textarea" },
    ],
  },
  {
    id: "services",
    number: "XVI",
    name: "Schedule of Services",
    fields: [
      { key: "services", label: "Services", type: "list" },
    ],
  },
  {
    id: "transportation",
    number: "XVII",
    name: "Transportation",
    fields: [
      { key: "transportation_related", label: "Transportation as Related Service?", type: "yesno" },
      { key: "adapted_vehicle", label: "Adapted Vehicle Needed?", type: "yesno" },
    ],
  },
  {
    id: "transition",
    number: "XVIII",
    name: "Transition Services",
    conditional: true,
    fields: [
      { key: "transition_addressed", label: "Transition Addressed?", type: "yesno" },
      { key: "student_invited", label: "Student Invited?", type: "yesno" },
      { key: "post_secondary_education", label: "Post-Secondary Education Goal", type: "textarea" },
      { key: "post_secondary_employment", label: "Post-Secondary Employment Goal", type: "textarea" },
      { key: "graduation_plan", label: "Graduation Plan", type: "text" },
    ],
  },
  {
    id: "lre",
    number: "XIX",
    name: "LRE & Educational Placement",
    fields: [
      { key: "commensurate_day", label: "Commensurate Day?", type: "yesno" },
      { key: "instructional_setting", label: "Instructional Setting Code", type: "text" },
      { key: "lre_justification", label: "LRE Justification", type: "textarea" },
    ],
  },
  {
    id: "esy",
    number: "XX",
    name: "Extended School Year (ESY)",
    fields: [
      { key: "esy_discussed", label: "ESY Discussed?", type: "yesno" },
      { key: "esy_eligible", label: "ESY Eligible?", type: "yesno" },
      { key: "esy_justification", label: "ESY Justification", type: "textarea" },
    ],
  },
  {
    id: "deliberations",
    number: "XXI",
    name: "Deliberations",
    fields: [
      { key: "meeting_date", label: "Meeting Date", type: "date" },
      { key: "meeting_type", label: "Meeting Type", type: "text" },
      { key: "committee_members", label: "Committee Members", type: "list" },
      { key: "parent_concerns_discussed", label: "Parent Concerns Discussed", type: "textarea" },
      { key: "evaluation_review", label: "Evaluation Review", type: "textarea" },
      { key: "plaafp_discussion", label: "PLAAFP Discussion", type: "textarea" },
    ],
  },
  {
    id: "agreement",
    number: "XXII",
    name: "Agreement",
    fields: [
      { key: "mutual_agreement", label: "Mutual Agreement Reached?", type: "yesno" },
      { key: "disagreement_areas", label: "Areas of Disagreement", type: "textarea" },
      { key: "reconvene_date", label: "Reconvene Date", type: "date" },
    ],
  },
  {
    id: "pwn",
    number: "XXIII",
    name: "Prior Written Notice (PWN)",
    fields: [
      { key: "pwn_date", label: "PWN Date", type: "date" },
      { key: "action_proposed", label: "Action Proposed/Refused", type: "textarea" },
      { key: "explanation", label: "Explanation", type: "textarea" },
      { key: "other_options", label: "Other Options Considered", type: "textarea" },
    ],
  },
  {
    id: "committee",
    number: "XXIV",
    name: "Committee Membership",
    fields: [
      { key: "parent_attended", label: "Parent Attended", type: "yesno" },
      { key: "parent_agreement", label: "Parent Agreement", type: "select", options: ["Agree", "Disagree"] },
      { key: "student_attended", label: "Student Attended", type: "yesno" },
      { key: "lea_rep", label: "LEA Representative", type: "text" },
      { key: "sped_teacher", label: "SpEd Teacher", type: "text" },
      { key: "gen_ed_teacher", label: "Gen Ed Teacher", type: "text" },
    ],
  },
  {
    id: "safeguards",
    number: "XXV",
    name: "Receipt of Procedural Safeguards",
    fields: [
      { key: "safeguards_date", label: "Date Provided", type: "date" },
      { key: "safeguards_acknowledged", label: "Acknowledged?", type: "yesno" },
    ],
  },
];

// Conditional sections
const CONDITIONAL_SECTIONS: IEPSection[] = [
  {
    id: "dyslexia",
    number: "C1",
    name: "Dyslexia/Related Disorders",
    conditional: true,
    fields: [
      { key: "dyslexia_identified", label: "Dyslexia Identified?", type: "yesno" },
      { key: "dyslexia_date", label: "Identification Date", type: "date" },
      { key: "dyslexia_services_code", label: "Services Code", type: "text" },
    ],
  },
  {
    id: "lpac",
    number: "C2",
    name: "LPAC (if EL)",
    conditional: true,
    fields: [
      { key: "is_el", label: "Is EL Student?", type: "yesno" },
      { key: "instruction_english", label: "Instruction in English?", type: "yesno" },
      { key: "lpac_accepted", label: "LPAC Recommendations Accepted?", type: "yesno" },
    ],
  },
  {
    id: "bip",
    number: "C3",
    name: "BIP (if behavior)",
    conditional: true,
    fields: [
      { key: "bip_required", label: "BIP Required?", type: "yesno" },
      { key: "fba_date", label: "FBA Date", type: "date" },
      { key: "bip_date", label: "BIP Date", type: "date" },
      { key: "target_behaviors", label: "Target Behaviors", type: "textarea" },
    ],
  },
];

export default function IEPPrepPage() {
  const [deepDiveData, setDeepDiveData] = useState<DeepDiveData | null>(null);
  const [formData, setFormData] = useState<Record<string, string | string[]>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["event_info", "eligibilities"]));
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handle file upload
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as DeepDiveData;
      setDeepDiveData(data);
      
      // Auto-populate form fields from deep dive data
      const newFormData: Record<string, string | string[]> = {};
      
      // Student info
      if (data.student_info) {
        newFormData.primary_disability = data.student_info.disability || "";
      }
      
      // Evaluation
      if (data.evaluation_status) {
        newFormData.evaluation_date = data.evaluation_status.last_full_eval_date || "";
        newFormData.eligibility_date = data.evaluation_status.initial_fie_date || "";
        newFormData.last_full_eval = data.evaluation_status.last_full_eval_date || "";
        newFormData.reeval_status = data.evaluation_status.eval_overdue ? "OVERDUE" : "Current";
      }
      
      // Deliberations
      if (data.deliberations) {
        const delibs = data.deliberations;
        newFormData.schedule_date = delibs.meeting_info?.ard_date || "";
        newFormData.meeting_purpose = delibs.meeting_info?.purpose || "";
        newFormData.meeting_date = delibs.meeting_info?.ard_date || "";
        newFormData.meeting_type = delibs.meeting_info?.purpose || "";
        
        if (delibs.parent_concerns) {
          newFormData.parent_concerns = delibs.parent_concerns.join("\n");
          newFormData.parent_concerns_discussed = delibs.parent_concerns.join("\n");
        }
        
        if (delibs.committee_members) {
          newFormData.committee_members = delibs.committee_members.map(m => 
            `${m.name} (${m.role}) - ${m.present}`
          );
        }
        
        // PLAAFP from deliberations
        if (delibs.plaafp_sections) {
          const strengths: string[] = [];
          const needs: string[] = [];
          
          for (const section of delibs.plaafp_sections) {
            if (section.teacher_comment) {
              strengths.push(`${section.subject}: ${section.teacher_comment}`);
            }
            if (section.concerns) {
              needs.push(`${section.subject}: ${section.concerns}`);
            }
            if (section.goal_progress) {
              needs.push(`${section.subject} Progress: ${section.goal_progress}`);
            }
          }
          
          newFormData.strengths_curriculum = strengths.join("\n\n");
          newFormData.needs_curriculum = needs.join("\n\n");
        }
        
        // Evaluation review
        if (delibs.evaluation_review) {
          newFormData.evaluation_review = JSON.stringify(delibs.evaluation_review, null, 2);
        }
      }
      
      // Goals
      if (data.goal_analysis?.current_goals) {
        newFormData.goals = data.goal_analysis.current_goals.map((g, i) => 
          `Goal ${i + 1}: ${g.text_preview} [${g.complete ? '✓ Complete' : '✗ Incomplete'}]`
        );
      }
      
      // FIE data
      if (data.fie_data?.available) {
        const fie = data.fie_data;
        if (fie.sld_eligibility?.areas_identified) {
          newFormData.sld_areas = fie.sld_eligibility.areas_identified;
        }
      }
      
      // MAP data
      if (data.map_assessment) {
        const mapResults: string[] = [];
        if (data.map_assessment.reading) {
          const r = data.map_assessment.reading;
          mapResults.push(`Reading: RIT ${r.rit}, ${r.percentile}%ile, STAAR: ${r.staar_projection}`);
        }
        if (data.map_assessment.math) {
          const m = data.map_assessment.math;
          mapResults.push(`Math: RIT ${m.rit}, ${m.percentile}%ile, STAAR: ${m.staar_projection}`);
        }
        newFormData.map_results = mapResults.join("\n");
      }
      
      // Default yes/no values
      newFormData.disability_impacts_curriculum = "Yes";
      newFormData.staar_participation = "Yes";
      newFormData.staar_alt2 = "No";
      newFormData.commensurate_day = "Yes";
      newFormData.district_available = "Yes";
      newFormData.can_participate = "Yes";
      
      setFormData(newFormData);
      
      // Expand sections with data
      const sectionsWithData = new Set<string>();
      for (const section of IEP_SECTIONS) {
        for (const field of section.fields) {
          if (newFormData[field.key]) {
            sectionsWithData.add(section.id);
            break;
          }
        }
      }
      setExpandedSections(sectionsWithData);
      
    } catch (err) {
      console.error("Error parsing file:", err);
      alert("Error parsing file. Please upload a valid Deep Dive JSON.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  // Update field value
  const updateField = useCallback((key: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  // Copy section content
  const copySection = useCallback((section: IEPSection) => {
    const lines: string[] = [`=== ${section.number}. ${section.name} ===`];
    
    for (const field of section.fields) {
      const value = formData[field.key];
      if (value) {
        const displayValue = Array.isArray(value) ? value.join(", ") : value;
        lines.push(`${field.label}: ${displayValue}`);
      }
    }
    
    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedSection(section.id);
    setTimeout(() => setCopiedSection(null), 2000);
  }, [formData]);

  // Copy all sections
  const copyAll = useCallback(() => {
    const lines: string[] = [];
    
    for (const section of IEP_SECTIONS) {
      lines.push(`\n=== ${section.number}. ${section.name} ===\n`);
      
      for (const field of section.fields) {
        const value = formData[field.key];
        if (value) {
          const displayValue = Array.isArray(value) ? value.join("\n  - ") : value;
          lines.push(`${field.label}:\n  ${displayValue}`);
        }
      }
    }
    
    navigator.clipboard.writeText(lines.join("\n"));
    alert("All sections copied to clipboard!");
  }, [formData]);

  // Count filled fields
  const filledCount = useMemo(() => {
    return Object.values(formData).filter(v => 
      v && (Array.isArray(v) ? v.length > 0 : v.toString().trim().length > 0)
    ).length;
  }, [formData]);

  const totalFields = useMemo(() => {
    return IEP_SECTIONS.reduce((sum, s) => sum + s.fields.length, 0);
  }, []);

  return (
    <GalaxyShell>
      <div className="page w-full px-2 pt-8 pb-4 md:px-4 md:pt-12 md:pb-6">
        {/* Hero Header */}
        <div className="mb-10">
          <div className="heroBrandRow">
            <div className="heroIconWrap">
              <img 
                src="/brand/galexii-logo-round.png" 
                alt="SpEdGalexii" 
                width={140}
                height={140}
                className="heroIcon rounded-full bg-black"
              />
            </div>
            <div className="min-w-0 heroAura">
              <h1 className="heroTitle wrap-break-word">IEP Prep Galexii</h1>
              <p className="text-lg text-violet-200/90 font-medium mb-3">
                From analysis to action — build IEPs in orbit
              </p>
              <p className="text-white/50 text-sm max-w-2xl">
                Upload a Deep Dive JSON and watch each IEP section auto-populate with evidence-based data. 
                Copy directly to Frontline — no retyping required.
              </p>
            </div>
          </div>
        </div>

        {/* Upload Section - Galaxy Card Style */}
        <div className="galaxy-card popCard popCard--cyan rounded-2xl p-6 mb-8">
          <h2 className="cardTitle text-cyan-200 mb-4 flex items-center gap-2">
            <Upload size={20} className="text-cyan-400" />
            Upload Deep Dive JSON
          </h2>
          
          <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-cyan-500/30 rounded-xl cursor-pointer hover:border-cyan-400/60 hover:bg-cyan-500/5 transition-all">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <div className="w-14 h-14 rounded-full bg-cyan-500/10 flex items-center justify-center mb-3">
                <FileText className="w-7 h-7 text-cyan-400" />
              </div>
              <p className="mb-2 text-sm text-white/70">
                <span className="font-semibold text-cyan-400">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-white/40">Deep Dive JSON file (DEEP_DIVE_*.json)</p>
            </div>
            <input 
              type="file" 
              className="hidden" 
              accept=".json"
              onChange={handleFileUpload}
            />
          </label>
          
          {isLoading && (
            <p className="mt-4 text-purple-400 text-center">Loading and analyzing...</p>
          )}
          
          {deepDiveData && (
            <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <p className="text-emerald-400 flex items-center gap-2">
                <span className="gx-status-done"></span>
                Loaded: {deepDiveData.student_info?.name || "Unknown Student"}
              </p>
              <p className="text-white/60 text-sm mt-1">
                {filledCount} of {totalFields} fields auto-populated • Ready for Frontline
              </p>
            </div>
          )}
        </div>

        {/* Progress Orbit */}
        <div className="galaxy-card popCard popCard--violet rounded-2xl p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-violet-400" />
              <span className="text-violet-200 font-medium">IEP Completion Orbit</span>
            </div>
            <span className="text-white/80 font-mono text-sm">{filledCount}/{totalFields}</span>
          </div>
          <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 transition-all duration-700 ease-out"
              style={{ 
                width: `${(filledCount / totalFields) * 100}%`,
                boxShadow: filledCount > 0 ? '0 0 12px rgba(168,85,247,0.5)' : 'none'
              }}
            />
          </div>
          <p className="text-white/40 text-xs mt-2">
            {filledCount === 0 
              ? "Upload a Deep Dive to begin populating sections" 
              : filledCount === totalFields 
                ? "✨ All systems go — ready for launch!" 
                : `${Math.round((filledCount / totalFields) * 100)}% of IEP sections populated`}
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="text-white/50 text-sm">
            {deepDiveData ? (
              <span className="flex items-center gap-2">
                <span className="gx-status-done"></span>
                Student: <span className="text-white/80">{deepDiveData.student_info?.name}</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="gx-status-pending"></span>
                Awaiting Deep Dive upload
              </span>
            )}
          </div>
          <button
            onClick={copyAll}
            disabled={filledCount === 0}
            className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl text-white font-medium hover:from-violet-500 hover:to-purple-500 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
          >
            <Copy size={16} />
            Copy All to Frontline
          </button>
        </div>

        {/* IEP Sections */}
        <div className="space-y-3">
          {IEP_SECTIONS.map(section => {
            const isExpanded = expandedSections.has(section.id);
            const hasData = section.fields.some(f => {
              const v = formData[f.key];
              return v && (Array.isArray(v) ? v.length > 0 : v.toString().trim().length > 0);
            });
            
            return (
              <div 
                key={section.id}
                className={`galaxy-card rounded-2xl transition-all ${
                  hasData 
                    ? "popCard popCard--emerald" 
                    : "popCard popCard--default"
                }`}
              >
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown size={20} className="text-white/60" />
                    ) : (
                      <ChevronRight size={20} className="text-white/60" />
                    )}
                    <span className="text-white/40 font-mono text-sm">{section.number}.</span>
                    <span className="text-white font-semibold">{section.name}</span>
                    {hasData && (
                      <Check size={16} className="text-green-400" />
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copySection(section);
                    }}
                    className="px-3 py-1 text-xs bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1"
                  >
                    {copiedSection === section.id ? (
                      <>
                        <Check size={12} className="text-green-400" />
                        <span className="text-green-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} className="text-white/60" />
                        <span className="text-white/60">Copy</span>
                      </>
                    )}
                  </button>
                </button>
                
                {/* Section Fields */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4">
                    {section.fields.map(field => (
                      <div key={field.key}>
                        <label className="block text-sm text-white/70 mb-1">
                          {field.label}
                          {field.required && <span className="text-red-400 ml-1">*</span>}
                          {field.source && (
                            <span className="text-purple-400 text-xs ml-2">
                              (from {field.source})
                            </span>
                          )}
                        </label>
                        
                        {field.type === "textarea" ? (
                          <textarea
                            value={formData[field.key] as string || ""}
                            onChange={e => updateField(field.key, e.target.value)}
                            className="w-full min-h-[100px] px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white/90 focus:border-purple-500/50 focus:outline-none resize-y"
                            placeholder={`Enter ${field.label.toLowerCase()}...`}
                          />
                        ) : field.type === "yesno" ? (
                          <div className="flex gap-2">
                            {["Yes", "No"].map(opt => (
                              <button
                                key={opt}
                                onClick={() => updateField(field.key, opt)}
                                className={`px-4 py-2 rounded-lg border transition-colors ${
                                  formData[field.key] === opt
                                    ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                                    : "bg-black/30 border-white/10 text-white/60 hover:border-white/30"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : field.type === "select" ? (
                          <select
                            value={formData[field.key] as string || ""}
                            onChange={e => updateField(field.key, e.target.value)}
                            className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white/90 focus:border-purple-500/50 focus:outline-none"
                          >
                            <option value="">Select...</option>
                            {field.options?.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : field.type === "list" ? (
                          <div className="space-y-2">
                            {(formData[field.key] as string[] || []).map((item, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <span className="text-white/40 mt-2">•</span>
                                <input
                                  value={item}
                                  onChange={e => {
                                    const newList = [...(formData[field.key] as string[] || [])];
                                    newList[i] = e.target.value;
                                    updateField(field.key, newList);
                                  }}
                                  className="flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white/90 focus:border-purple-500/50 focus:outline-none"
                                />
                              </div>
                            ))}
                            <button
                              onClick={() => updateField(field.key, [...(formData[field.key] as string[] || []), ""])}
                              className="text-sm text-purple-400 hover:text-purple-300"
                            >
                              + Add item
                            </button>
                          </div>
                        ) : (
                          <input
                            type={field.type === "date" ? "date" : "text"}
                            value={formData[field.key] as string || ""}
                            onChange={e => updateField(field.key, e.target.value)}
                            className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white/90 focus:border-purple-500/50 focus:outline-none"
                            placeholder={`Enter ${field.label.toLowerCase()}...`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Conditional Sections */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-white/80 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-yellow-400" />
            Conditional Sections (if applicable)
          </h3>
          
          <div className="space-y-4">
            {CONDITIONAL_SECTIONS.map(section => {
              const isExpanded = expandedSections.has(section.id);
              
              return (
                <div 
                  key={section.id}
                  className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5"
                >
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full p-4 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown size={20} className="text-white/60" />
                      ) : (
                        <ChevronRight size={20} className="text-white/60" />
                      )}
                      <span className="text-yellow-400/60 font-mono text-sm">{section.number}.</span>
                      <span className="text-white font-semibold">{section.name}</span>
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4">
                      {section.fields.map(field => (
                        <div key={field.key}>
                          <label className="block text-sm text-white/70 mb-1">
                            {field.label}
                          </label>
                          
                          {field.type === "yesno" ? (
                            <div className="flex gap-2">
                              {["Yes", "No"].map(opt => (
                                <button
                                  key={opt}
                                  onClick={() => updateField(field.key, opt)}
                                  className={`px-4 py-2 rounded-lg border transition-colors ${
                                    formData[field.key] === opt
                                      ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                                      : "bg-black/30 border-white/10 text-white/60 hover:border-white/30"
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          ) : field.type === "textarea" ? (
                            <textarea
                              value={formData[field.key] as string || ""}
                              onChange={e => updateField(field.key, e.target.value)}
                              className="w-full min-h-[80px] px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white/90 focus:border-yellow-500/50 focus:outline-none resize-y"
                            />
                          ) : (
                            <input
                              type={field.type === "date" ? "date" : "text"}
                              value={formData[field.key] as string || ""}
                              onChange={e => updateField(field.key, e.target.value)}
                              className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white/90 focus:border-yellow-500/50 focus:outline-none"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-6 rounded-2xl border border-white/10 bg-black/30">
          <h3 className="text-lg font-semibold text-white mb-4">How to Use IEP Prep Galexii</h3>
          <ol className="space-y-3 text-white/70">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm">1</span>
              <span>Run Deep Dive analysis on the student (generates DEEP_DIVE_*.json)</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm">2</span>
              <span>Upload the Deep Dive JSON file above</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm">3</span>
              <span>Review auto-populated fields and fill in any missing data</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm">4</span>
              <span>Copy sections individually or all at once → paste into Frontline/eSped</span>
            </li>
          </ol>
        </div>
      </div>
    </GalaxyShell>
  );
}
