import * as fs from 'fs';
import * as path from 'path';
import { BookConfigData, CitationRule, CitationCompiledRule, SectionTitles } from './types';

export class BookConfig {
  public title: string;
  public subtitle: string;
  public author: string;
  public description: string;
  public assetsDir: string;
  public distDir: string;
  public outputFilename: string;
  public sectionTitles: SectionTitles;
  public theme: string;
  public customThemePath: string;
  public pdf: boolean;
  public epub: boolean;
  public language: string;
  public citations: CitationRule[];
  public isbn: string;
  public publisher: string;
  public publishDate: string;
  public copyright: string;
  public sectionHeaderStyle: 'combined' | 'split' | 'title-only' | 'hidden';
  public rawConfig: BookConfigData;

  constructor(configData: Partial<BookConfigData> = {}) {
    this.title = configData.title || 'Untitled Book';
    this.subtitle = configData.subtitle || '';
    this.author = configData.author || 'Anonymous';
    this.description = configData.description || '';
    this.assetsDir = configData.assetsDir || './assets';
    this.distDir = configData.distDir || './dist';
    this.outputFilename = configData.outputFilename || 'book.md';
    this.sectionTitles = configData.sectionTitles || {};
    this.theme = configData.theme || 'serif';
    this.customThemePath = configData.customThemePath || '';
    this.pdf = configData.pdf !== false; // defaults to true
    this.epub = configData.epub ?? false; // defaults to false (opt-in)
    this.language = configData.language || 'tr';
    this.citations = configData.citations || [];
    this.isbn = configData.isbn || '';
    this.publisher = configData.publisher || '';
    this.publishDate = configData.publishDate || '';
    this.copyright = configData.copyright || '';
    this.sectionHeaderStyle = configData.sectionHeaderStyle || 'combined';

    this.rawConfig = {
      title: this.title,
      subtitle: this.subtitle,
      author: this.author,
      description: this.description,
      assetsDir: this.assetsDir,
      distDir: this.distDir,
      outputFilename: this.outputFilename,
      sectionTitles: this.sectionTitles,
      theme: this.theme,
      customThemePath: this.customThemePath,
      pdf: this.pdf,
      epub: this.epub,
      language: this.language,
      citations: this.citations,
      isbn: this.isbn,
      publisher: this.publisher,
      publishDate: this.publishDate,
      copyright: this.copyright,
      sectionHeaderStyle: this.sectionHeaderStyle,
      ...configData
    };
  }

  /**
   * Loads a configuration from a JSON file.
   * @param configPath
   * @returns BookConfig
   */
  public static loadFromFile(configPath: string): BookConfig {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found at: ${configPath}`);
    }

    try {
      const absolutePath = path.resolve(configPath);
      const fileContent = fs.readFileSync(absolutePath, 'utf8');
      const configData = JSON.parse(fileContent) as BookConfigData;

      const configDir = path.dirname(absolutePath);
      if (configData.assetsDir) {
        configData.assetsDir = path.resolve(configDir, configData.assetsDir);
      }
      if (configData.distDir) {
        configData.distDir = path.resolve(configDir, configData.distDir);
      }
      if (configData.customThemePath) {
        configData.customThemePath = path.resolve(configDir, configData.customThemePath);
      }

      const config = new BookConfig(configData);
      config.validate();
      return config;
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to load config from ${configPath}: ${err.message}`);
    }
  }

  /**
   * Validates the configuration parameters.
   * @returns boolean
   */
  public validate(): boolean {
    if (!this.title || typeof this.title !== 'string') {
      throw new Error('Config Error: "title" is required and must be a string.');
    }
    if (!this.assetsDir || typeof this.assetsDir !== 'string') {
      throw new Error('Config Error: "assetsDir" is required.');
    }
    if (!this.distDir || typeof this.distDir !== 'string') {
      throw new Error('Config Error: "distDir" is required.');
    }
    if (!this.outputFilename || typeof this.outputFilename !== 'string') {
      throw new Error('Config Error: "outputFilename" must be a valid string.');
    }
    if (this.language && typeof this.language !== 'string') {
      throw new Error('Config Error: "language" must be a valid string.');
    }
    if (this.isbn && typeof this.isbn !== 'string') {
      throw new Error('Config Error: "isbn" must be a valid string.');
    }
    if (this.publisher && typeof this.publisher !== 'string') {
      throw new Error('Config Error: "publisher" must be a valid string.');
    }
    if (this.publishDate && typeof this.publishDate !== 'string') {
      throw new Error('Config Error: "publishDate" must be a valid string.');
    }
    if (this.copyright && typeof this.copyright !== 'string') {
      throw new Error('Config Error: "copyright" must be a valid string.');
    }
    if (
      this.sectionHeaderStyle &&
      !['combined', 'split', 'title-only', 'hidden'].includes(this.sectionHeaderStyle)
    ) {
      throw new Error(
        'Config Error: "sectionHeaderStyle" must be one of: combined, split, title-only, hidden.'
      );
    }
    return true;
  }

  /**
   * Converts citation configuration definitions to active RegExp rules.
   * @returns CitationCompiledRule[]
   */
  public getCitationRules(): CitationCompiledRule[] {
    if (!Array.isArray(this.citations)) return [];

    return this.citations
      .map((rule): CitationCompiledRule | null => {
        const termPattern = rule.term;
        if (typeof termPattern === 'string') {
          const escaped = termPattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          return {
            term: new RegExp(escaped, 'g'),
            replacement: rule.replacement
          };
        }
        return null;
      })
      .filter((rule): rule is CitationCompiledRule => rule !== null);
  }
}
