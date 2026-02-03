export type FrameworkFieldRequirement = {
  key: string;
  label: string;
  required: boolean;
  evidenceSuggestions?: string[];
  sectionKey?: string;
  tabKey?: string;
};

export type FrameworkSection = {
  key: string;
  label: string;
  tabKey?: string;
  fields: FrameworkFieldRequirement[];
};

export type FrameworkTab = {
  key: string;
  label: string;
  sections: FrameworkSection[];
};

export type FrameworkMap = {
  tabs: FrameworkTab[];
  sections: FrameworkSection[];
  fields: FrameworkFieldRequirement[];
};

export type FrameworkRow = {
  tab?: string;
  section?: string;
  field?: string;
  required?: string | boolean;
  evidence?: string;
};

export type FrameworkLoadResult = {
  map: FrameworkMap;
  warnings: string[];
};
