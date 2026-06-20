export interface CitationRule {
  term: string;
  replacement: string;
}

export interface CitationCompiledRule {
  term: RegExp;
  replacement: string;
}

export interface SectionTitles {
  [sectionNum: string]: string;
}

export interface BookConfigData {
  title: string;
  subtitle?: string;
  author?: string;
  description?: string;
  assetsDir: string;
  distDir: string;
  outputFilename: string;
  sectionTitles?: SectionTitles;
  theme?: string;
  customThemePath?: string;
  epilogueFile?: string;
  bibliographyFile?: string;
  pdf?: boolean;
  language?: string;
  citations?: CitationRule[];
  synopses?: Record<string, string>;
}

export interface SpecialFiles {
  epilogue?: string;
  bibliography?: string;
}
