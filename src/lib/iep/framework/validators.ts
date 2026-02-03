import type {
  FrameworkFieldRequirement,
  FrameworkLoadResult,
  FrameworkMap,
} from "./types";

export type RequiredCheck = {
  fieldKey: string;
  label: string;
  tabKey?: string;
  sectionKey?: string;
};

export function listRequiredFields(map: FrameworkMap): RequiredCheck[] {
  return map.fields
    .filter((field) => field.required === true)
    .map((field) => {
      const out: RequiredCheck = {
        fieldKey: field.key,
        label: field.label,
      };

      // Only assign optional keys when we actually have a value.
      if (field.tabKey) out.tabKey = field.tabKey;
      if (field.sectionKey) out.sectionKey = field.sectionKey;

      return out;
    });
}

export function validateRequired(
  map: FrameworkMap,
  answers: Record<string, string | undefined>
): { missing: RequiredCheck[]; filled: number; required: number } {
  const req = listRequiredFields(map);

  const missing = req.filter((item) => {
    const v = answers[item.fieldKey];
    return typeof v !== "string" || v.trim().length === 0;
  });

  return {
    missing,
    filled: req.length - missing.length,
    required: req.length,
  };
}

export function summarizeLoadResult(result: FrameworkLoadResult): string {
  const { tabs, sections, fields } = result.map;
  const warningsCount = (result.warnings ?? []).length;

  return `tabs: ${tabs.length}, sections: ${sections.length}, fields: ${fields.length}, warnings: ${warningsCount}`;
}

export function flattenFramework(map: FrameworkMap): FrameworkFieldRequirement[] {
  // shallow copy to prevent accidental mutation by callers
  return map.fields.slice();
}
