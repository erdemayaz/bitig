import * as path from 'path';
import JSZip from 'jszip';
import * as fs from 'fs';
import { marked } from 'marked';

import { BookConfig } from './BookConfig';
import { Section } from './Section';
import { Chapter } from './Chapter';
import { StyleManager } from './StyleManager';
import { TextProcessor } from './TextProcessor';
import { Locale } from './Locale';

/**
 * Compiles a bitig book project into a standard EPUB 3 archive.
 * Reuses the same BookConfig, Section[], and StyleManager as BookCompiler
 * to guarantee full feature parity with the HTML/PDF pipeline.
 */
export class EpubCompiler {
  private config: BookConfig;
  private sections: Section[];
  private styleManager: StyleManager;

  constructor(config: BookConfig, sections: Section[], styleManager: StyleManager) {
    this.config = config;
    this.sections = sections;
    this.styleManager = styleManager;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Assembles and writes a complete EPUB 3 file to the given output path.
   * @param outputPath  Absolute path for the resulting .epub file.
   */
  public async compileToEpub(outputPath: string): Promise<void> {
    const zip = new JSZip();

    // ── 1. mimetype (MUST be first, MUST be uncompressed / STORE) ──────────
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    // ── 2. META-INF/container.xml ──────────────────────────────────────────
    zip.folder('META-INF')!.file('container.xml', this._generateContainerXml());

    // ── 3. OEBPS assets ───────────────────────────────────────────────────
    const oebps = zip.folder('OEBPS')!;
    oebps.folder('styles')!.file('book.css', this.styleManager.getEpubCSS());

    // ── 4. Build spine items (reading order) ──────────────────────────────
    const spineItems: Array<{ id: string; href: string; chapter?: Chapter; section?: Section }> =
      [];

    // Cover
    spineItems.push({ id: 'cover', href: 'chapters/cover.xhtml' });
    oebps.folder('chapters')!.file('cover.xhtml', this._generateCoverXhtml());

    // Copyright page (only when metadata is provided)
    const hasCopyrightInfo =
      this.config.isbn || this.config.publisher || this.config.publishDate || this.config.copyright;
    if (hasCopyrightInfo) {
      spineItems.push({ id: 'copyright', href: 'chapters/copyright.xhtml' });
      oebps.folder('chapters')!.file('copyright.xhtml', this._generateCopyrightXhtml());
    }

    // Chapters
    const sortedSections = [...this.sections].sort((a, b) => a.sectionNum - b.sectionNum);
    sortedSections.forEach((section) => {
      section.sortChapters();
      section.chapters.forEach((chapter) => {
        const itemId = `chapter-${chapter.sectionNum}-${chapter.chapterNum}`;
        const href = `chapters/${itemId}.xhtml`;
        spineItems.push({ id: itemId, href, chapter, section });
        oebps
          .folder('chapters')!
          .file(`${itemId}.xhtml`, this._generateChapterXhtml(section, chapter));
      });
    });

    // ── 5. Navigation documents ───────────────────────────────────────────
    oebps.file('nav.xhtml', this._generateNavXhtml(sortedSections));
    oebps.file('toc.ncx', this._generateTocNcx(sortedSections));

    // ── 6. content.opf ────────────────────────────────────────────────────
    oebps.file('content.opf', this._generateContentOpf(spineItems));

    // ── 7. Write ZIP to disk ──────────────────────────────────────────────
    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      mimeType: 'application/epub+zip'
    });
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, buffer);
  }

  /**
   * Renders a single chapter as a standalone XHTML string.
   * Used by CaptureManager for --epub-chapter screenshots.
   * @param sectionNum
   * @param chapterNum
   */
  public renderChapterXhtml(sectionNum: number, chapterNum: number): string {
    const section = this.sections.find((s) => s.sectionNum === sectionNum);
    if (!section) {
      throw new Error(`EpubCompiler: section ${sectionNum} not found.`);
    }
    const chapter = section.chapters.find((c) => c.chapterNum === chapterNum);
    if (!chapter) {
      throw new Error(`EpubCompiler: chapter ${sectionNum}.${chapterNum} not found.`);
    }
    return this._generateChapterXhtml(section, chapter);
  }

  // ---------------------------------------------------------------------------
  // Private Generators
  // ---------------------------------------------------------------------------

  /**
   * Generates META-INF/container.xml — the EPUB entry point.
   */
  public _generateContainerXml(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  }

  /**
   * Generates OEBPS/content.opf — the OPF package document with Dublin Core metadata,
   * manifest of all resources, and the reading-order spine.
   */
  public _generateContentOpf(spineItems: Array<{ id: string; href: string }>): string {
    const uid = this.config.isbn ? `urn:isbn:${this.config.isbn}` : `urn:uuid:bitig-${Date.now()}`;

    const modifiedDate = new Date().toISOString().split('.')[0] + 'Z';

    // Dublin Core metadata
    let metadata = `  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"
             xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${this._escapeXml(this.config.title)}</dc:title>
    <dc:language>${this.config.language}</dc:language>
    <dc:identifier id="uid">${this._escapeXml(uid)}</dc:identifier>
    <meta property="dcterms:modified">${modifiedDate}</meta>`;

    if (this.config.author) {
      metadata += `\n    <dc:creator>${this._escapeXml(this.config.author)}</dc:creator>`;
    }
    if (this.config.description) {
      metadata += `\n    <dc:description>${this._escapeXml(this.config.description)}</dc:description>`;
    }
    if (this.config.publisher) {
      metadata += `\n    <dc:publisher>${this._escapeXml(this.config.publisher)}</dc:publisher>`;
    }
    if (this.config.publishDate) {
      metadata += `\n    <dc:date>${this._escapeXml(this.config.publishDate)}</dc:date>`;
    }
    if (this.config.copyright) {
      metadata += `\n    <dc:rights>${this._escapeXml(this.config.copyright)}</dc:rights>`;
    }
    if (this.config.isbn) {
      metadata += `\n    <dc:identifier>urn:isbn:${this._escapeXml(this.config.isbn)}</dc:identifier>`;
    }

    metadata += `\n  </metadata>`;

    // Manifest: all content documents + nav + stylesheet
    let manifest = `  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="stylesheet" href="styles/book.css" media-type="text/css"/>`;

    spineItems.forEach((item) => {
      manifest += `\n    <item id="${item.id}" href="${item.href}" media-type="application/xhtml+xml"/>`;
    });

    manifest += `\n  </manifest>`;

    // Spine: reading order
    let spine = `  <spine toc="ncx">`;
    spineItems.forEach((item) => {
      spine += `\n    <itemref idref="${item.id}"/>`;
    });
    spine += `\n  </spine>`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0"
         xmlns="http://www.idpf.org/2007/opf"
         unique-identifier="uid">
${metadata}
${manifest}
${spine}
</package>`;
  }

  /**
   * Generates OEBPS/nav.xhtml — the EPUB 3 navigation document.
   * Replaces the legacy NCX as the primary table of contents.
   */
  public _generateNavXhtml(sections: Section[]): string {
    const lang = this.config.language;
    const tocHeading = Locale.get('tocHtmlHeading', lang);

    let navItems = '';
    sections.forEach((section) => {
      const isSpecial = section.sectionNum >= 998;
      section.sortChapters();
      section.chapters.forEach((chapter) => {
        const itemId = `chapter-${chapter.sectionNum}-${chapter.chapterNum}`;
        let label = this._escapeXml(chapter.title);
        if (section.sectionNum > 0 && !isSpecial) {
          label = `${section.sectionNum}.${chapter.chapterNum} ${label}`;
        }
        navItems += `      <li><a href="chapters/${itemId}.xhtml">${label}</a></li>\n`;
      });
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops"
      xml:lang="${this.config.language}">
<head>
  <meta charset="UTF-8"/>
  <title>${this._escapeXml(this.config.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles/book.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>${this._escapeXml(tocHeading)}</h1>
    <ol>
${navItems}    </ol>
  </nav>
</body>
</html>`;
  }

  /**
   * Generates OEBPS/toc.ncx — legacy EPUB 2 navigation for backward compatibility
   * with older e-readers (e.g., older Kindle devices).
   */
  public _generateTocNcx(sections: Section[]): string {
    const uid = this.config.isbn ? `urn:isbn:${this.config.isbn}` : `urn:uuid:bitig-${Date.now()}`;

    let navPoints = '';
    let playOrder = 1;

    sections.forEach((section) => {
      const isSpecial = section.sectionNum >= 998;
      section.sortChapters();
      section.chapters.forEach((chapter) => {
        const itemId = `chapter-${chapter.sectionNum}-${chapter.chapterNum}`;
        let label = this._escapeXml(chapter.title);
        if (section.sectionNum > 0 && !isSpecial) {
          label = `${section.sectionNum}.${chapter.chapterNum} ${label}`;
        }
        navPoints += `  <navPoint id="${itemId}" playOrder="${playOrder++}">
    <navLabel><text>${label}</text></navLabel>
    <content src="chapters/${itemId}.xhtml"/>
  </navPoint>\n`;
      });
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head>
  <meta name="dtb:uid" content="${this._escapeXml(uid)}"/>
  <meta name="dtb:depth" content="1"/>
  <meta name="dtb:totalPageCount" content="0"/>
  <meta name="dtb:maxPageNumber" content="0"/>
</head>
<docTitle><text>${this._escapeXml(this.config.title)}</text></docTitle>
<navMap>
${navPoints}</navMap>
</ncx>`;
  }

  /**
   * Generates the XHTML content page for a single chapter.
   * Applies citation replacements, header shifting, and KaTeX math rendering
   * — identical to the HTML/PDF pipeline.
   */
  public _generateChapterXhtml(section: Section, chapter: Chapter): string {
    const citationRules = this.config.getCitationRules();
    const isBibliography = chapter.sectionNum === 999;

    // Apply the same transformations as BookCompiler
    let content = TextProcessor.shiftHeaders(chapter.rawContent);
    if (!isBibliography) {
      content = TextProcessor.applyCitations(content, citationRules);
    }

    // Convert Markdown → HTML
    const bodyHtml = marked.parse(content) as string;

    const escapedTitle = this._escapeXml(chapter.title);

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops"
      xml:lang="${this.config.language}">
<head>
  <meta charset="UTF-8"/>
  <title>${escapedTitle}</title>
  <link rel="stylesheet" type="text/css" href="../styles/book.css"/>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css"/>
  <script defer="defer" src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <script defer="defer" src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
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
</head>
<body>
  <section epub:type="chapter" id="chapter-${chapter.sectionNum}-${chapter.chapterNum}">
    ${bodyHtml}
  </section>
</body>
</html>`;
  }

  /**
   * Generates the XHTML cover page, mirroring the HTML cover design.
   */
  public _generateCoverXhtml(): string {
    const title = this._escapeXml(this.config.title);
    const subtitle = this._escapeXml(this.config.subtitle);
    const author = this._escapeXml(this.config.author);
    const description = this._escapeXml(this.config.description);

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops"
      xml:lang="${this.config.language}">
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <link rel="stylesheet" type="text/css" href="../styles/book.css"/>
</head>
<body>
  <section epub:type="cover" class="cover-page">
    <h1 class="cover-title">${title}</h1>
    ${subtitle ? `<p class="cover-subtitle">${subtitle}</p>` : ''}
    ${author ? `<p class="cover-author">${author}</p>` : ''}
    ${description ? `<p class="cover-description">${description}</p>` : ''}
  </section>
</body>
</html>`;
  }

  /**
   * Generates the XHTML copyright page with publishing metadata.
   * Only called when at least one publishing metadata field is set.
   */
  public _generateCopyrightXhtml(): string {
    const lang = this.config.language;
    const title = this._escapeXml(this.config.title);

    let lines: string[] = [];

    if (this.config.copyright) {
      lines.push(`<p class="copyright-statement">${this._escapeXml(this.config.copyright)}</p>`);
    }
    if (this.config.publisher) {
      const label = Locale.get('copyrightPublisherLabel', lang);
      lines.push(`<p><strong>${label}:</strong> ${this._escapeXml(this.config.publisher)}</p>`);
    }
    if (this.config.publishDate) {
      const label = Locale.get('copyrightPublishedLabel', lang);
      lines.push(`<p><strong>${label}:</strong> ${this._escapeXml(this.config.publishDate)}</p>`);
    }
    if (this.config.isbn) {
      lines.push(`<p><strong>ISBN:</strong> ${this._escapeXml(this.config.isbn)}</p>`);
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops"
      xml:lang="${this.config.language}">
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <link rel="stylesheet" type="text/css" href="../styles/book.css"/>
</head>
<body>
  <section epub:type="copyright-page" class="copyright-page">
    ${lines.join('\n    ')}
  </section>
</body>
</html>`;
  }

  /**
   * XML-safe string escaping for use inside XHTML and XML attributes/content.
   * @param str Input string
   */
  public _escapeXml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export default EpubCompiler;
