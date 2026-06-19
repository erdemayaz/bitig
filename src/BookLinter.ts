import * as fs from 'fs';
import * as path from 'path';
import { BookCompiler } from './BookCompiler';
import { Chapter } from './Chapter';

export interface LintMessage {
  type: 'error' | 'warning';
  file: string;
  line?: number;
  message: string;
}

export class BookLinter {
  public compiler: BookCompiler;

  constructor(compiler: BookCompiler) {
    this.compiler = compiler;
  }

  /**
   * Runs all linting checks and returns the diagnostic reports.
   * @returns LintMessage[]
   */
  public runAllChecks(): LintMessage[] {
    const messages: LintMessage[] = [];

    // Ensure files are scanned and loaded
    this.compiler.scanAndLoad();

    const sections = this.compiler.sections;
    const allChapters: Chapter[] = [];
    sections.forEach((s) => allChapters.push(...s.chapters));

    // 1. Check for empty chapters and unclosed code blocks
    allChapters.forEach((chapter) => {
      this._checkChapterSyntax(chapter, messages);
      this._checkChapterLinks(chapter, messages);
    });

    // 2. Check citation rules matches
    this._checkCitationsUsage(allChapters, messages);

    return messages;
  }

  /**
   * Check syntax: empty chapters or unclosed code blocks.
   * @param chapter
   * @param messages
   */
  private _checkChapterSyntax(chapter: Chapter, messages: LintMessage[]): void {
    const lines = chapter.rawContent.split('\n');
    let codeBlockCount = 0;

    if (chapter.rawContent.trim() === '' || chapter.rawContent.trim() === `# ${chapter.title}`) {
      messages.push({
        type: 'warning',
        file: chapter.relativePath,
        message: 'Chapter is empty or only contains a title.'
      });
    }

    lines.forEach((line) => {
      if (line.trim().startsWith('```')) {
        codeBlockCount++;
      }
    });

    if (codeBlockCount % 2 !== 0) {
      messages.push({
        type: 'error',
        file: chapter.relativePath,
        message: 'Contains an unclosed markdown code block (odd number of triple backticks).'
      });
    }
  }

  /**
   * Check for broken internal Markdown links.
   * @param chapter
   * @param messages
   */
  private _checkChapterLinks(chapter: Chapter, messages: LintMessage[]): void {
    const linkRegex = /\[.*?\]\((.*?\.md)(#.*?)?\)/g;
    const lines = chapter.rawContent.split('\n');

    lines.forEach((line, idx) => {
      let match;
      // Reset regex index for safety in loop
      linkRegex.lastIndex = 0;

      while ((match = linkRegex.exec(line)) !== null) {
        const linkTarget = match[1];
        if (linkTarget.startsWith('http://') || linkTarget.startsWith('https://')) {
          continue;
        }

        const dirOfChapter = path.dirname(chapter.filePath);
        const resolvedPath1 = path.resolve(dirOfChapter, linkTarget);
        const resolvedPath2 = path.resolve(chapter.assetsDir, linkTarget);

        if (!fs.existsSync(resolvedPath1) && !fs.existsSync(resolvedPath2)) {
          messages.push({
            type: 'error',
            file: chapter.relativePath,
            line: idx + 1,
            message: `Broken internal markdown link: "${linkTarget}" does not exist.`
          });
        }
      }
    });
  }

  /**
   * Check if configured citations are actually used.
   * @param chapters
   * @param messages
   */
  private _checkCitationsUsage(chapters: Chapter[], messages: LintMessage[]): void {
    const rules = this.compiler.config.getCitationRules();
    if (rules.length === 0) return;

    const citationUsageMap = new Map<string, number>();
    rules.forEach((rule) => citationUsageMap.set(rule.term.source, 0));

    chapters.forEach((chapter) => {
      const isBibliography = chapter.sectionNum === 999;
      if (isBibliography) return;

      rules.forEach((rule) => {
        const matches = chapter.rawContent.match(rule.term);
        if (matches) {
          const currentCount = citationUsageMap.get(rule.term.source) || 0;
          citationUsageMap.set(rule.term.source, currentCount + matches.length);
        }
      });
    });

    // Find unused rules
    this.compiler.config.citations.forEach((rule) => {
      const compiled = this.compiler.config.getCitationRules().find((r) => {
        // Simple comparison of search terms
        return r.replacement === rule.replacement;
      });

      if (compiled) {
        const count = citationUsageMap.get(compiled.term.source) || 0;
        if (count === 0) {
          messages.push({
            type: 'warning',
            file: 'book.json',
            message: `Citation term "${rule.term}" is defined in config but never matched in the book content.`
          });
        }
      }
    });
  }
}
export default BookLinter;
