import { normalizeText } from "./textClean";

function toIsoLoose(d: string | undefined) {
  if (!d) return undefined;
  const m = d.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (!m) return undefined;
  const [, mm, dd, yy] = m;
  if (!mm || !dd || !yy) return undefined;
  const year = yy.length === 2 ? `20${yy}` : yy;
  const month = mm.padStart(2, "0");
  const day = dd.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export type IepEligibilities = {
  primary?: {
    category?: string;
    evaluationDate?: string;
    eligibilityDate?: string;
    placementDate?: string;
  };
  eligible?: Array<{
    priority?: string;
    category: string;
    evaluationDate?: string;
    eligibilityDate?: string;
    placementDate?: string;
  }>;
  ineligible?: Array<{
    category: string;
    evaluationDate?: string;
    ineligibilityDate?: string;
  }>;
  dismissed?: Array<{
    category: string;
    evaluationDate?: string;
    eligibilityDate?: string;
    placementDate?: string;
    dismissalDate?: string;
  }>;
};

export function extractEligibilities(raw: string): IepEligibilities {
  const text = normalizeText(raw);

  const primaryRow =
    text.match(/\bIEP\s+Primary\s+(.+?)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\b/i) ||
    text.match(/\bIEP\s+Primary\s+(.+?)\b/i);

  const primaryCategory = primaryRow?.[1]?.trim();
  const primaryEval = toIsoLoose(primaryRow?.[2]);

  const primary =
    primaryCategory || primaryEval
      ? {
          ...(primaryCategory ? { category: primaryCategory } : {}),
          ...(primaryEval ? { evaluationDate: primaryEval } : {}),
        }
      : undefined;

  const eligible = primaryCategory
    ? [
        {
          priority: "IEP Primary",
          category: primaryCategory,
          ...(primaryEval ? { evaluationDate: primaryEval } : {}),
        },
      ]
    : undefined;

  return {
    ...(primary ? { primary } : {}),
    ...(eligible ? { eligible } : {}),
  };
}
