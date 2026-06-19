import * as fs from 'fs';
import * as path from 'path';
import { SpecialFiles } from './types';

export class Chapter {
  public filePath: string;
  public assetsDir: string;
  public relativePath: string;
  public sectionNum: number = 0;
  public chapterNum: number = 0;
  public title: string = '';
  public rawContent: string = '';
  public processedContent: string = '';

  constructor(filePath: string, assetsDir: string, specialFiles: SpecialFiles = {}) {
    this.filePath = path.resolve(filePath);
    this.assetsDir = path.resolve(assetsDir);
    this.relativePath = path.relative(this.assetsDir, this.filePath);
    this._parseNumbers(specialFiles);
  }

  /**
   * Parses section and chapter numbers from file paths and names.
   * @param specialFiles
   */
  private _parseNumbers(specialFiles: SpecialFiles): void {
    const filename = path.basename(this.filePath);

    // Check if it matches epilogue or bibliography
    if (specialFiles.epilogue && filename === path.basename(specialFiles.epilogue)) {
      this.sectionNum = 998;
      this.chapterNum = 1;
      return;
    }

    if (specialFiles.bibliography && filename === path.basename(specialFiles.bibliography)) {
      this.sectionNum = 999;
      this.chapterNum = 1;
      return;
    }

    // Try to extract section-X from path
    const sectionMatch = this.relativePath.match(/section-(\d+)/i);
    if (sectionMatch) {
      this.sectionNum = parseInt(sectionMatch[1], 10);
    } else {
      // Look for any directory name that has numbers
      const dirParts = path.dirname(this.relativePath).split(path.sep);
      for (const part of dirParts) {
        const numMatch = part.match(/\d+/);
        if (numMatch) {
          this.sectionNum = parseInt(numMatch[0], 10);
          break;
        }
      }
    }

    // Extract chapter number from filename
    const doubleNumMatch = filename.match(/^(\d+)[\.\-_](\d+)\.md$/);
    if (doubleNumMatch) {
      if (this.sectionNum === 0) {
        this.sectionNum = parseInt(doubleNumMatch[1], 10);
      }
      this.chapterNum = parseInt(doubleNumMatch[2], 10);
    } else {
      const singleNumMatch = filename.match(/(\d+)/);
      if (singleNumMatch) {
        this.chapterNum = parseInt(singleNumMatch[1], 10);
      }
    }
  }

  /**
   * Reads raw file contents and extracts the title.
   */
  public load(): void {
    if (!fs.existsSync(this.filePath)) {
      throw new Error(`Chapter file not found: ${this.filePath}`);
    }

    this.rawContent = fs.readFileSync(this.filePath, 'utf8').trim();
    this.processedContent = this.rawContent;

    const firstLine = this.rawContent.split('\n')[0];
    if (firstLine && firstLine.startsWith('# ')) {
      this.title = firstLine.slice(2).trim();
    } else {
      this.title = path.basename(this.filePath, path.extname(this.filePath));
    }
  }

  /**
   * Generates a sort key for sorting chapters.
   * @returns string
   */
  public getSortKey(): string {
    const paddedSection = String(this.sectionNum).padStart(8, '0');
    const paddedChapter = String(this.chapterNum).padStart(8, '0');
    return `${paddedSection}-${paddedChapter}`;
  }
}
