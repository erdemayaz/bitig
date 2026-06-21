import * as fs from 'fs';
import * as path from 'path';
import { marked } from 'marked';

import { BookConfig } from './BookConfig';
import { Chapter } from './Chapter';
import { Section } from './Section';
import { TextProcessor } from './TextProcessor';
import { TOCGenerator } from './TOCGenerator';
import { StyleManager } from './StyleManager';
import { AgentMetadataGenerator } from './AgentMetadataGenerator';
import { PdfCompiler } from './PdfCompiler';
import { SpecialFiles } from './types';
import { Locale } from './Locale';

export class BookCompiler {
  public config: BookConfig;
  public sections: Section[];
  public styleManager: StyleManager;
  public metadataGenerator: AgentMetadataGenerator | null;

  constructor(config: BookConfig) {
    if (!(config instanceof BookConfig)) {
      throw new Error('BookCompiler: "config" must be an instance of BookConfig.');
    }
    this.config = config;
    this.sections = [];

    this.styleManager = new StyleManager();
    if (this.config.customThemePath) {
      this.styleManager.useCustomTheme(this.config.customThemePath);
    } else {
      this.styleManager.usePredefinedTheme(this.config.theme);
    }

    this.metadataGenerator = null;
  }

  /**
   * Recursively scans assetsDir for markdown files, loads and groups them.
   */
  public scanAndLoad(): void {
    if (!fs.existsSync(this.config.assetsDir)) {
      throw new Error(`Assets directory not found: ${this.config.assetsDir}`);
    }

    this.sections = [];
    const mdFiles = this._getMarkdownFiles(this.config.assetsDir);

    const specialFiles: SpecialFiles = {
      epilogue: this.config.rawConfig.epilogueFile || 'epilogue.md',
      bibliography: this.config.rawConfig.bibliographyFile || 'bibliography.md'
    };

    // Calculate maximum regular section number from directories on disk
    let maxFolderSection = 0;
    try {
      const filesInAssets = fs.readdirSync(this.config.assetsDir);
      const folderNums = filesInAssets
        .filter(
          (f) =>
            fs.statSync(path.join(this.config.assetsDir, f)).isDirectory() &&
            /^section-\d+$/i.test(f)
        )
        .map((f) => {
          const match = f.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        });
      if (folderNums.length > 0) {
        maxFolderSection = Math.max(...folderNums);
      }
    } catch (e) {
      // Ignore reading directory errors
    }

    mdFiles.forEach((filePath) => {
      const filename = path.basename(filePath);

      // Ignore SUMMARY.md and any configuration files
      if (filename.toLowerCase().includes('summary') || filename.toLowerCase() === 'book.json') {
        return;
      }

      const chapter = new Chapter(filePath, this.config.assetsDir, specialFiles);
      chapter.load();

      let section = this.sections.find((s) => s.sectionNum === chapter.sectionNum);
      if (!section) {
        let sectionTitle = this.config.sectionTitles[String(chapter.sectionNum)];
        if (!sectionTitle) {
          if (chapter.sectionNum === 998) {
            sectionTitle = this.config.sectionTitles[String(maxFolderSection + 1)] || 'Epilogue';
          } else if (chapter.sectionNum === 999) {
            sectionTitle =
              this.config.sectionTitles[String(maxFolderSection + 2)] || 'Bibliography';
          } else {
            sectionTitle = `Section ${chapter.sectionNum}`;
          }
        }
        section = new Section(chapter.sectionNum, sectionTitle);
        this.sections.push(section);
      }
      section.addChapter(chapter);
    });

    // Initialize metadata generator
    this.metadataGenerator = new AgentMetadataGenerator(this.config, this.sections);
  }

  /**
   * Sorts and compiles the chapters into final document strings.
   * @returns { markdown: string, html: string }
   */
  public compile(): { markdown: string; html: string } {
    // 1. Sort sections
    this.sections.sort((a, b) => a.sectionNum - b.sectionNum);

    // 2. Sort chapters inside sections
    this.sections.forEach((section) => section.sortChapters());

    // 3. Generate Table of Contents
    const tocHtml = TOCGenerator.generateHTML(this.sections, this.config.language);

    // 4. Assemble contents
    let markdownContent = '';
    let currentSectionNum: number | null = null;

    // We'll iterate through sections and chapters to build the book
    const citationRules = this.config.getCitationRules();

    this.sections.forEach((section, sIndex) => {
      // Add section heading
      if (section.sectionNum !== currentSectionNum) {
        currentSectionNum = section.sectionNum;
        // Don't output Section H1 for section 0 (usually Preface / introduction)
        if (section.sectionNum > 0) {
          const style = this.config.sectionHeaderStyle;
          if (style === 'split') {
            const isSpecial = section.sectionNum >= 998;
            if (isSpecial) {
              markdownContent += `\n\n<div class="section-header" id="section-header-${section.sectionNum}">\n  <h1 class="section-title">${section.title}</h1>\n</div>\n\n`;
            } else {
              const sectionLabel = Locale.get('sectionLabel', this.config.language, {
                num: section.sectionNum
              });
              markdownContent += `\n\n<div class="section-header" id="section-header-${section.sectionNum}">\n  <div class="section-number">${sectionLabel}</div>\n  <h1 class="section-title">${section.title}</h1>\n</div>\n\n`;
            }
          } else if (style === 'title-only') {
            markdownContent += `\n\n# ${section.title}\n\n`;
          } else if (style === 'hidden') {
            const sectionSlug = TextProcessor.slugify(section.title);
            markdownContent += `\n\n<div id="${sectionSlug}"></div>\n\n`;
          } else {
            // 'combined' (default)
            markdownContent += `\n\n# ${section.title}\n\n`;
          }
        }
      }

      section.chapters.forEach((chapter, cIndex) => {
        // Shift headers
        let shifted = TextProcessor.shiftHeaders(chapter.rawContent);

        // Apply citations if not the bibliography file
        const isBibliography = chapter.sectionNum === 999;
        if (!isBibliography) {
          shifted = TextProcessor.applyCitations(shifted, citationRules);
        }

        markdownContent += `<div class="chapter-container" id="chapter-${chapter.sectionNum}-${chapter.chapterNum}" data-coords="${chapter.sectionNum}.${chapter.chapterNum}">\n\n${shifted}\n\n</div>\n\n`;

        // Add page break if not the last chapter in the section
        if (cIndex < section.chapters.length - 1) {
          markdownContent += `<div class="page-break"></div>\n\n`;
        }
      });

      // Add page break between sections
      if (sIndex < this.sections.length - 1) {
        markdownContent += `<div class="page-break"></div>\n\n`;
      }
    });

    // 5. Build HTML wrap for browser/PDF output
    const styleBlock = this.styleManager.getStyleBlock();
    const coverHtml = this.styleManager.generateCoverPage(this.config);

    let copyrightHtml = '';
    const hasCopyrightInfo =
      this.config.isbn || this.config.publisher || this.config.publishDate || this.config.copyright;
    if (hasCopyrightInfo) {
      copyrightHtml = this.styleManager.generateCopyrightPage(this.config);
    }

    let metaTags = '';
    if (this.config.author) {
      metaTags += `  <meta name="author" content="${this.config.author}">\n`;
    }
    if (this.config.description) {
      metaTags += `  <meta name="description" content="${this.config.description}">\n`;
    }
    if (this.config.isbn) {
      metaTags += `  <meta name="dcterms.identifier" content="urn:isbn:${this.config.isbn}">\n`;
    }
    if (this.config.publisher) {
      metaTags += `  <meta name="dcterms.publisher" content="${this.config.publisher}">\n`;
    }
    if (this.config.publishDate) {
      metaTags += `  <meta name="dcterms.date" content="${this.config.publishDate}">\n`;
    }
    if (this.config.copyright) {
      metaTags += `  <meta name="dcterms.rights" content="${this.config.copyright}">\n`;
    }

    // Parse markdown body to HTML using marked (marked.parse returns string synchronously)
    const bodyHtml = marked.parse(markdownContent) as string;

    const fullHtml = `<!DOCTYPE html>
<html lang="${this.config.language}">
<head>
  <meta charset="UTF-8">
  <title>${this.config.title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", function() {
      renderMathInElement(document.body, {
        delimiters: [
          {left: "$$", right: "$$", display: true},
          {left: "$", right: "$", display: false},
          {left: "\\\\(", right: "\\\\)", display: false},
          {left: "\\\\[", right: "\\\\]", display: true}
        ],
        throwOnError: false
      });
    });
  </script>
${metaTags}  ${styleBlock}
</head>
<body>
  ${coverHtml}
  ${copyrightHtml}
  ${tocHtml}
  <div class="book-body">
    ${bodyHtml}
  </div>
</body>
</html>
`;

    // 6. Prepend AI metadata/YAML frontmatter to compiled markdown
    if (!this.metadataGenerator) {
      throw new Error('BookCompiler: scanAndLoad must be called before compile.');
    }
    const mdWithMetadata = this.metadataGenerator.injectYAMLFrontmatter(markdownContent);

    return {
      markdown: mdWithMetadata,
      html: fullHtml
    };
  }

  /**
   * Writes compiled markdown, JSON metadata, and PDF outputs to disk.
   */
  public async writeOutputs(): Promise<void> {
    if (!fs.existsSync(this.config.distDir)) {
      fs.mkdirSync(this.config.distDir, { recursive: true });
    }

    const { markdown, html } = this.compile();

    // 1. Write compiled markdown file
    const mdOutputPath = path.join(this.config.distDir, this.config.outputFilename);
    fs.writeFileSync(mdOutputPath, markdown, 'utf8');

    // 2. Write structured JSON metadata
    if (!this.metadataGenerator) {
      throw new Error('BookCompiler: scanAndLoad must be called before writeOutputs.');
    }
    const metaOutputPath = path.join(this.config.distDir, 'book-metadata.json');
    const jsonMetadata = this.metadataGenerator.generateJSONMetadata();
    fs.writeFileSync(metaOutputPath, jsonMetadata, 'utf8');

    // 3. Write HTML file (useful for printing or debugging styles)
    const htmlOutputPath = path.join(
      this.config.distDir,
      this.config.outputFilename.replace(/\.md$/, '.html')
    );
    fs.writeFileSync(htmlOutputPath, html, 'utf8');

    // 4. If PDF output is desired, compile to PDF
    if (this.config.pdf) {
      const pdfOutputPath = path.join(
        this.config.distDir,
        this.config.outputFilename.replace(/\.md$/, '.pdf')
      );
      const pdfCompiler = new PdfCompiler();

      const msg = Locale.get('buildGeneratingPdf', this.config.language, { path: pdfOutputPath });
      console.log(msg);
      await pdfCompiler.compileToPdf(html, pdfOutputPath);
    } else {
      console.log(Locale.get('buildPdfSkip', this.config.language));
    }
  }

  /**
   * Recursive directory crawler.
   * @param dir
   * @private
   */
  private _getMarkdownFiles(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(this._getMarkdownFiles(filePath));
      } else if (filePath.endsWith('.md')) {
        results.push(filePath);
      }
    });
    return results;
  }
}
export default BookCompiler;
