import * as fs from 'fs';
import * as path from 'path';
import { BookConfig } from './BookConfig';
import { BookConfigData } from './types';
import { Locale } from './Locale';

export class BookManager {
  public config: BookConfig;
  public configPath: string;

  constructor(config: BookConfig, configPath: string) {
    this.config = config;
    this.configPath = path.resolve(configPath);
  }

  /**
   * Adds a new section to the book config and directory structure.
   * @param sectionNum
   * @param title
   */
  public addSection(sectionNum: number, title: string): void {
    const sectionDir = path.join(this.config.assetsDir, `section-${sectionNum}`);
    if (!fs.existsSync(sectionDir)) {
      fs.mkdirSync(sectionDir, { recursive: true });
    }

    // Update book.json
    const rawData = this._readRawConfig();
    if (!rawData.sectionTitles) {
      rawData.sectionTitles = {};
    }
    rawData.sectionTitles[String(sectionNum)] = title;
    this._writeRawConfig(rawData);

    console.log(Locale.get('managerSectionCreated', this.config.language, { sectionNum, title }));
  }

  /**
   * Adds a new chapter markdown file.
   * @param sectionNum
   * @param chapterNum
   * @param title
   */
  public addChapter(sectionNum: number, chapterNum: number, title: string): void {
    const isSpecial = sectionNum >= 998;
    let targetDir = this.config.assetsDir;
    let filename = '';

    if (isSpecial) {
      filename =
        sectionNum === 998
          ? this.config.rawConfig.epilogueFile || 'epilogue.md'
          : this.config.rawConfig.bibliographyFile || 'bibliography.md';
    } else {
      targetDir = path.join(this.config.assetsDir, `section-${sectionNum}`);
      filename = `${sectionNum}.${chapterNum}.md`;
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, filename);
    if (fs.existsSync(filePath)) {
      throw new Error(`Chapter file already exists at: ${filePath}`);
    }

    const templateContent = Locale.get('managerChapterTemplate', this.config.language, {
      title,
      sectionNum,
      chapterNum
    });
    fs.writeFileSync(filePath, templateContent, 'utf8');

    console.log(Locale.get('managerChapterCreated', this.config.language, { filePath }));
  }

  /**
   * Moves a chapter from one section/number to another.
   * @param fromSec
   * @param fromChap
   * @param toSec
   * @param toChap
   */
  public moveChapter(fromSec: number, fromChap: number, toSec: number, toChap: number): void {
    const fromFilename = `${fromSec}.${fromChap}.md`;
    const fromPath = path.join(this.config.assetsDir, `section-${fromSec}`, fromFilename);

    if (!fs.existsSync(fromPath)) {
      throw new Error(`Source chapter not found at: ${fromPath}`);
    }

    const toDir = path.join(this.config.assetsDir, `section-${toSec}`);
    const toFilename = `${toSec}.${toChap}.md`;
    const toPath = path.join(toDir, toFilename);

    if (!fs.existsSync(toDir)) {
      fs.mkdirSync(toDir, { recursive: true });
    }

    if (fs.existsSync(toPath)) {
      throw new Error(`Target chapter path already exists: ${toPath}`);
    }

    fs.renameSync(fromPath, toPath);
    console.log(Locale.get('managerChapterMoved', this.config.language, { fromPath, toPath }));
  }

  /**
   * Deletes a chapter markdown file.
   * @param sectionNum
   * @param chapterNum
   */
  public deleteChapter(sectionNum: number, chapterNum: number): void {
    const filename = `${sectionNum}.${chapterNum}.md`;
    const filePath = path.join(this.config.assetsDir, `section-${sectionNum}`, filename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Chapter file not found: ${filePath}`);
    }

    fs.unlinkSync(filePath);
    console.log(Locale.get('managerChapterDeleted', this.config.language, { filePath }));
  }

  /**
   * Updates chapter metadata such as synopsis and title programmatically.
   * @param sectionNum
   * @param chapterNum
   * @param options
   */
  public updateChapterMetadata(
    sectionNum: number,
    chapterNum: number,
    options: { title?: string; synopsis?: string }
  ): void {
    if (options.synopsis !== undefined) {
      const rawData = this._readRawConfig();
      if (!rawData.synopses) {
        rawData.synopses = {};
      }
      rawData.synopses[`${sectionNum}.${chapterNum}`] = options.synopsis;
      this._writeRawConfig(rawData);
      console.log(
        Locale.get('managerSynopsisUpdated', this.config.language, {
          coords: `${sectionNum}.${chapterNum}`
        })
      );
    }

    if (options.title !== undefined) {
      const isSpecial = sectionNum >= 998;
      let filename = '';
      let targetDir = this.config.assetsDir;

      if (isSpecial) {
        filename =
          sectionNum === 998
            ? this.config.rawConfig.epilogueFile || 'epilogue.md'
            : this.config.rawConfig.bibliographyFile || 'bibliography.md';
      } else {
        targetDir = path.join(this.config.assetsDir, `section-${sectionNum}`);
        filename = `${sectionNum}.${chapterNum}.md`;
      }

      const filePath = path.join(targetDir, filename);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Chapter file not found: ${filePath}`);
      }

      let content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      if (lines.length > 0 && lines[0].startsWith('# ')) {
        lines[0] = `# ${options.title}`;
        content = lines.join('\n');
      } else {
        content = `# ${options.title}\n\n` + content;
      }

      fs.writeFileSync(filePath, content, 'utf8');
      console.log(
        Locale.get('managerTitleUpdated', this.config.language, {
          filePath,
          title: options.title
        })
      );
    }
  }

  /**
   * Helper to load JSON config data.
   */
  private _readRawConfig(): BookConfigData {
    const content = fs.readFileSync(this.configPath, 'utf8');
    return JSON.parse(content) as BookConfigData;
  }

  /**
   * Helper to save JSON config data.
   */
  private _writeRawConfig(data: BookConfigData): void {
    fs.writeFileSync(this.configPath, JSON.stringify(data, null, 2), 'utf8');
  }
}

export default BookManager;
