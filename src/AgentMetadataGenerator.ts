import { BookConfig } from './BookConfig';
import { Section } from './Section';

export interface ChapterMetadata {
  chapterNum: number;
  title: string;
  wordCount: number;
  characterCount: number;
  synopsis: string;
  fileRelativePath: string;
}

export interface SectionMetadata {
  sectionNum: number;
  title: string;
  chaptersCount: number;
  chapters: ChapterMetadata[];
}

export interface BookMetadata {
  book: {
    title: string;
    subtitle: string;
    author: string;
    description: string;
    theme: string;
  };
  stats: {
    totalSections: number;
    totalChapters: number;
    totalWords: number;
    totalCharacters: number;
    estimatedReadTimeMinutes: number;
  };
  structure: SectionMetadata[];
}

export class AgentMetadataGenerator {
  public bookConfig: BookConfig;
  public sections: Section[];

  constructor(bookConfig: BookConfig, sections: Section[]) {
    this.bookConfig = bookConfig;
    this.sections = sections;
  }

  /**
   * Generates a structured JSON metadata block for AI agents to query/index.
   * @returns string
   */
  public generateJSONMetadata(): string {
    let totalWords = 0;
    let totalChars = 0;
    let totalChapters = 0;

    const sectionsData: SectionMetadata[] = this.sections.map((section): SectionMetadata => {
      const chaptersData: ChapterMetadata[] = section.chapters.map((chapter): ChapterMetadata => {
        const wordCount = this._countWords(chapter.rawContent);
        const charCount = chapter.rawContent ? chapter.rawContent.length : 0;

        totalWords += wordCount;
        totalChars += charCount;
        totalChapters += 1;

        const paragraphs = chapter.rawContent
          .split('\n')
          .map((p) => p.trim())
          .filter(
            (p) =>
              p &&
              !p.startsWith('#') &&
              !p.startsWith('```') &&
              !p.startsWith('>') &&
              !p.startsWith('-') &&
              !p.startsWith('*')
          );

        const synopsis =
          paragraphs.length > 0
            ? paragraphs[0].slice(0, 250) + (paragraphs[0].length > 250 ? '...' : '')
            : '';

        return {
          chapterNum: chapter.chapterNum,
          title: chapter.title,
          wordCount,
          characterCount: charCount,
          synopsis,
          fileRelativePath: chapter.relativePath
        };
      });

      return {
        sectionNum: section.sectionNum,
        title: section.title,
        chaptersCount: chaptersData.length,
        chapters: chaptersData
      };
    });

    const metadata: BookMetadata = {
      book: {
        title: this.bookConfig.title,
        subtitle: this.bookConfig.subtitle,
        author: this.bookConfig.author,
        description: this.bookConfig.description,
        theme: this.bookConfig.theme
      },
      stats: {
        totalSections: this.sections.length,
        totalChapters,
        totalWords,
        totalCharacters: totalChars,
        estimatedReadTimeMinutes: Math.ceil(totalWords / 200)
      },
      structure: sectionsData
    };

    return JSON.stringify(metadata, null, 2);
  }

  /**
   * Prepends a structured YAML frontmatter block to the compiled Markdown.
   * @param assembledContent
   * @returns string
   */
  public injectYAMLFrontmatter(assembledContent: string): string {
    const sectionsSummary = this.sections
      .map((section) => {
        const chapterTitles = section.chapters.map((c) => `"${c.title}"`).join(', ');
        return `    - section: ${section.sectionNum}\n      title: "${section.title}"\n      chapters: [${chapterTitles}]`;
      })
      .join('\n');

    const yaml = `---
title: "${this.bookConfig.title.replace(/"/g, '\\"')}"
subtitle: "${this.bookConfig.subtitle.replace(/"/g, '\\"')}"
author: "${this.bookConfig.author.replace(/"/g, '\\"')}"
description: "${this.bookConfig.description.replace(/"/g, '\\"')}"
compiledAt: "${new Date().toISOString()}"
aiAgentGuide: "This is a structured markdown book. Headings are shifted to nest correctly. Below is the section and chapter mapping."
sections:
${sectionsSummary}
---

`;
    return yaml + assembledContent;
  }

  /**
   * Helper to count words in a string.
   * @param text
   * @private
   */
  private _countWords(text: string): number {
    if (!text) return 0;
    const cleanText = text.replace(/[#*`_\[\]()\-]/g, ' ');
    const words = cleanText.trim().split(/\s+/);
    return words.filter((w) => w.length > 0).length;
  }
}
export default AgentMetadataGenerator;
