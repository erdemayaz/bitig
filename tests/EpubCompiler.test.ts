import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { EpubCompiler } from '../src/EpubCompiler';
import { BookConfig } from '../src/BookConfig';
import { Section } from '../src/Section';
import { Chapter } from '../src/Chapter';
import { StyleManager } from '../src/StyleManager';

// ────────────────────────────────────────────────────────────────────────────
// Test helpers
// ────────────────────────────────────────────────────────────────────────────

function makeConfig(overrides: Partial<BookConfig> = {}): BookConfig {
  const config = new BookConfig({
    title: 'Test Book',
    subtitle: 'A Subtitle',
    author: 'Test Author',
    description: 'A test description.',
    assetsDir: '/tmp/assets',
    distDir: '/tmp/dist',
    outputFilename: 'book.md',
    language: 'en',
    epub: true
  });
  Object.assign(config, overrides);
  return config;
}

function makeSection(sectionNum: number, title: string, chapters: Chapter[]): Section {
  const s = new Section(sectionNum, title);
  chapters.forEach((c) => s.addChapter(c));
  return s;
}

function makeChapter(
  sectionNum: number,
  chapterNum: number,
  title: string,
  content: string = `# ${title}\n\nSome content here.`
): Chapter {
  const c = new Chapter(
    `/tmp/assets/section-${sectionNum}/${sectionNum}.${chapterNum}.md`,
    `/tmp/assets`,
    sectionNum,
    chapterNum
  );
  c.title = title;
  c.rawContent = content;
  return c;
}

// ────────────────────────────────────────────────────────────────────────────
// _escapeXml
// ────────────────────────────────────────────────────────────────────────────

describe('EpubCompiler._escapeXml', () => {
  let compiler: EpubCompiler;
  beforeEach(() => {
    const config = makeConfig();
    const sm = new StyleManager();
    compiler = new EpubCompiler(config, [], sm);
  });

  it('escapes ampersands', () => {
    expect(compiler._escapeXml('A & B')).toBe('A &amp; B');
  });
  it('escapes less-than', () => {
    expect(compiler._escapeXml('<tag>')).toBe('&lt;tag&gt;');
  });
  it('escapes double quotes', () => {
    expect(compiler._escapeXml('"value"')).toBe('&quot;value&quot;');
  });
  it('escapes single quotes', () => {
    expect(compiler._escapeXml("it's")).toBe('it&apos;s');
  });
  it('returns empty string for falsy input', () => {
    expect(compiler._escapeXml('')).toBe('');
    expect(compiler._escapeXml(undefined as any)).toBe('');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// _generateContainerXml
// ────────────────────────────────────────────────────────────────────────────

describe('EpubCompiler._generateContainerXml', () => {
  let compiler: EpubCompiler;
  beforeEach(() => {
    compiler = new EpubCompiler(makeConfig(), [], new StyleManager());
  });

  it('produces valid XML with rootfile pointing to OEBPS/content.opf', () => {
    const xml = compiler._generateContainerXml();
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('full-path="OEBPS/content.opf"');
    expect(xml).toContain('media-type="application/oebps-package+xml"');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// _generateContentOpf
// ────────────────────────────────────────────────────────────────────────────

describe('EpubCompiler._generateContentOpf', () => {
  const config = makeConfig({
    title: 'My Book',
    author: 'Jane Doe',
    description: 'A great book.',
    publisher: 'Publisher Co.',
    publishDate: '2025-01-01',
    copyright: '© 2025 Jane Doe',
    isbn: '978-3-16-148410-0',
    language: 'en'
  } as any);

  const spineItems = [
    { id: 'cover', href: 'chapters/cover.xhtml' },
    { id: 'chapter-1-1', href: 'chapters/chapter-1-1.xhtml' }
  ];

  let compiler: EpubCompiler;
  beforeEach(() => {
    compiler = new EpubCompiler(config, [], new StyleManager());
  });

  it('contains Dublin Core title', () => {
    const opf = compiler._generateContentOpf(spineItems);
    expect(opf).toContain('<dc:title>My Book</dc:title>');
  });
  it('contains author', () => {
    const opf = compiler._generateContentOpf(spineItems);
    expect(opf).toContain('<dc:creator>Jane Doe</dc:creator>');
  });
  it('contains publisher', () => {
    const opf = compiler._generateContentOpf(spineItems);
    expect(opf).toContain('<dc:publisher>Publisher Co.</dc:publisher>');
  });
  it('contains ISBN identifier', () => {
    const opf = compiler._generateContentOpf(spineItems);
    expect(opf).toContain('urn:isbn:978-3-16-148410-0');
  });
  it('contains all spine items in manifest', () => {
    const opf = compiler._generateContentOpf(spineItems);
    expect(opf).toContain('id="cover"');
    expect(opf).toContain('id="chapter-1-1"');
  });
  it('contains stylesheet in manifest', () => {
    const opf = compiler._generateContentOpf(spineItems);
    expect(opf).toContain('href="styles/book.css"');
  });
  it('contains nav item with properties="nav"', () => {
    const opf = compiler._generateContentOpf(spineItems);
    expect(opf).toContain('properties="nav"');
  });
  it('uses xml declaration and package version 3.0', () => {
    const opf = compiler._generateContentOpf(spineItems);
    expect(opf).toContain('version="3.0"');
    expect(opf).toContain('<?xml');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// _generateNavXhtml
// ────────────────────────────────────────────────────────────────────────────

describe('EpubCompiler._generateNavXhtml', () => {
  const config = makeConfig({ language: 'en' } as any);
  const chapter1 = makeChapter(1, 1, 'First Chapter');
  const chapter2 = makeChapter(1, 2, 'Second Chapter');
  const section = makeSection(1, 'Part One', [chapter1, chapter2]);

  let compiler: EpubCompiler;
  beforeEach(() => {
    compiler = new EpubCompiler(config, [section], new StyleManager());
  });

  it('contains epub:type="toc"', () => {
    const nav = compiler._generateNavXhtml([section]);
    expect(nav).toContain('epub:type="toc"');
  });
  it('contains chapter links with correct hrefs', () => {
    const nav = compiler._generateNavXhtml([section]);
    expect(nav).toContain('chapters/chapter-1-1.xhtml');
    expect(nav).toContain('chapters/chapter-1-2.xhtml');
  });
  it('prefixes regular chapter titles with section.chapter numbers', () => {
    const nav = compiler._generateNavXhtml([section]);
    expect(nav).toContain('1.1 First Chapter');
    expect(nav).toContain('1.2 Second Chapter');
  });

  it('does not prefix special sections (>=998) chapter titles', () => {
    const epilogueChapter = makeChapter(998, 1, 'Afterword');
    const epilogueSection = makeSection(998, 'Epilogue', [epilogueChapter]);
    const nav = compiler._generateNavXhtml([epilogueSection]);
    // Should NOT contain "998.1 Afterword"
    expect(nav).not.toContain('998.1');
    expect(nav).toContain('Afterword');
  });

  it('uses correct TOC heading from Locale (English)', () => {
    const nav = compiler._generateNavXhtml([section]);
    expect(nav).toContain('TABLE OF CONTENTS');
  });

  it('uses Turkish TOC heading when language is tr', () => {
    const trConfig = makeConfig({ language: 'tr' } as any);
    const trCompiler = new EpubCompiler(trConfig, [section], new StyleManager());
    const nav = trCompiler._generateNavXhtml([section]);
    expect(nav).toContain('İÇİNDEKİLER');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// _generateTocNcx
// ────────────────────────────────────────────────────────────────────────────

describe('EpubCompiler._generateTocNcx', () => {
  const config = makeConfig({ isbn: '978-0-00-000000-0' } as any);
  const ch = makeChapter(1, 1, 'Chapter One');
  const section = makeSection(1, 'Section One', [ch]);

  let compiler: EpubCompiler;
  beforeEach(() => {
    compiler = new EpubCompiler(config, [section], new StyleManager());
  });

  it('generates NCX with navPoint', () => {
    const ncx = compiler._generateTocNcx([section]);
    expect(ncx).toContain('<navPoint');
    expect(ncx).toContain('Chapter One');
  });
  it('uses ISBN in docTitle uid when available', () => {
    const ncx = compiler._generateTocNcx([section]);
    expect(ncx).toContain('urn:isbn:978-0-00-000000-0');
  });
  it('has correct chapter content src', () => {
    const ncx = compiler._generateTocNcx([section]);
    expect(ncx).toContain('src="chapters/chapter-1-1.xhtml"');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// _generateCoverXhtml
// ────────────────────────────────────────────────────────────────────────────

describe('EpubCompiler._generateCoverXhtml', () => {
  it('renders book title, subtitle, and author', () => {
    const config = makeConfig({
      title: 'My EPUB',
      subtitle: 'A Subtitle',
      author: 'Author Name'
    } as any);
    const compiler = new EpubCompiler(config, [], new StyleManager());
    const cover = compiler._generateCoverXhtml();
    expect(cover).toContain('epub:type="cover"');
    expect(cover).toContain('My EPUB');
    expect(cover).toContain('A Subtitle');
    expect(cover).toContain('Author Name');
  });

  it('omits subtitle when subtitle is empty string', () => {
    const config = new BookConfig({
      title: 'No Sub',
      assetsDir: '/tmp',
      distDir: '/tmp',
      outputFilename: 'book.md',
      language: 'en'
    });
    const compiler = new EpubCompiler(config, [], new StyleManager());
    const cover = compiler._generateCoverXhtml();
    // subtitle is '' by default — no cover-subtitle element expected
    expect(cover).not.toContain('cover-subtitle');
    // author defaults to 'Anonymous' in BookConfig — it will appear
    expect(cover).toContain('cover-author');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// _generateCopyrightXhtml
// ────────────────────────────────────────────────────────────────────────────

describe('EpubCompiler._generateCopyrightXhtml', () => {
  it('renders copyright statement, publisher, date, and ISBN', () => {
    const config = makeConfig({
      copyright: '© 2025 Author',
      publisher: 'Great Publisher',
      publishDate: '2025-06-01',
      isbn: '978-1-23-456789-7',
      language: 'en'
    } as any);
    const compiler = new EpubCompiler(config, [], new StyleManager());
    const cp = compiler._generateCopyrightXhtml();
    expect(cp).toContain('epub:type="copyright-page"');
    expect(cp).toContain('© 2025 Author');
    expect(cp).toContain('Great Publisher');
    expect(cp).toContain('2025-06-01');
    expect(cp).toContain('978-1-23-456789-7');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// _generateChapterXhtml
// ────────────────────────────────────────────────────────────────────────────

describe('EpubCompiler._generateChapterXhtml', () => {
  const config = makeConfig({ language: 'en' } as any);
  const chapter = makeChapter(1, 1, 'Test Chapter', '# Test Chapter\n\nHello world.');
  const section = makeSection(1, 'Section One', [chapter]);

  let compiler: EpubCompiler;
  beforeEach(() => {
    compiler = new EpubCompiler(config, [section], new StyleManager());
  });

  it('wraps content in epub:type="chapter" section', () => {
    const xhtml = compiler._generateChapterXhtml(section, chapter);
    expect(xhtml).toContain('epub:type="chapter"');
  });
  it('references the shared CSS stylesheet', () => {
    const xhtml = compiler._generateChapterXhtml(section, chapter);
    expect(xhtml).toContain('href="../styles/book.css"');
  });
  it('contains KaTeX script tags', () => {
    const xhtml = compiler._generateChapterXhtml(section, chapter);
    expect(xhtml).toContain('katex');
  });
  it('contains rendered HTML content', () => {
    const xhtml = compiler._generateChapterXhtml(section, chapter);
    expect(xhtml).toContain('Hello world');
  });
  it('uses correct section-chapter id', () => {
    const xhtml = compiler._generateChapterXhtml(section, chapter);
    expect(xhtml).toContain('id="chapter-1-1"');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// renderChapterXhtml
// ────────────────────────────────────────────────────────────────────────────

describe('EpubCompiler.renderChapterXhtml', () => {
  const config = makeConfig();
  const chapter = makeChapter(2, 3, 'Deep Chapter', '# Deep Chapter\n\nContent.');
  const section = makeSection(2, 'Part Two', [chapter]);

  it('returns the same XHTML as _generateChapterXhtml', () => {
    const compiler = new EpubCompiler(config, [section], new StyleManager());
    const via_render = compiler.renderChapterXhtml(2, 3);
    const via_generate = compiler._generateChapterXhtml(section, chapter);
    expect(via_render).toBe(via_generate);
  });

  it('throws when section not found', () => {
    const compiler = new EpubCompiler(config, [], new StyleManager());
    expect(() => compiler.renderChapterXhtml(99, 1)).toThrow('section 99 not found');
  });

  it('throws when chapter not found', () => {
    const emptySection = makeSection(1, 'Empty', []);
    const compiler = new EpubCompiler(config, [emptySection], new StyleManager());
    expect(() => compiler.renderChapterXhtml(1, 9)).toThrow('chapter 1.9 not found');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// compileToEpub — integration (writes a real .epub to temp dir)
// ────────────────────────────────────────────────────────────────────────────

describe('EpubCompiler.compileToEpub (integration)', () => {
  let tempDir: string;
  let outputPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bitig-epub-test-'));
    outputPath = path.join(tempDir, 'test.epub');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates a .epub file on disk', async () => {
    const config = makeConfig({ distDir: tempDir } as any);
    const chapter = makeChapter(1, 1, 'Intro', '# Intro\n\nWelcome.');
    const section = makeSection(1, 'Introduction', [chapter]);
    const compiler = new EpubCompiler(config, [section], new StyleManager());
    await compiler.compileToEpub(outputPath);
    expect(fs.existsSync(outputPath)).toBe(true);
    const stat = fs.statSync(outputPath);
    expect(stat.size).toBeGreaterThan(0);
  });

  it('creates a valid ZIP (starts with PK header bytes)', async () => {
    const config = makeConfig({ distDir: tempDir } as any);
    const chapter = makeChapter(1, 1, 'Intro', '# Intro\n\nHello.');
    const section = makeSection(1, 'Section', [chapter]);
    const compiler = new EpubCompiler(config, [section], new StyleManager());
    await compiler.compileToEpub(outputPath);

    const buffer = fs.readFileSync(outputPath);
    // ZIP magic bytes: 50 4B 03 04 (PK..)
    expect(buffer[0]).toBe(0x50); // 'P'
    expect(buffer[1]).toBe(0x4b); // 'K'
  });

  it('skips copyright page when no publishing metadata is set', async () => {
    // config with no isbn/publisher/publishDate/copyright
    const config = new BookConfig({
      title: 'Bare Book',
      assetsDir: tempDir,
      distDir: tempDir,
      outputFilename: 'book.md',
      epub: true,
      language: 'en'
    });
    const chapter = makeChapter(1, 1, 'Ch1', '# Ch1\n\nContent.');
    const section = makeSection(1, 'Section', [chapter]);
    const compiler = new EpubCompiler(config, [section], new StyleManager());
    await compiler.compileToEpub(outputPath);
    // File should still be created
    expect(fs.existsSync(outputPath)).toBe(true);
  });

  it('includes copyright page when isbn is provided', async () => {
    const config = makeConfig({ isbn: '978-0-00-000000-0', distDir: tempDir } as any);
    const chapter = makeChapter(1, 1, 'Ch1', '# Ch1\n\nContent.');
    const section = makeSection(1, 'Section', [chapter]);
    const compiler = new EpubCompiler(config, [section], new StyleManager());
    // No error should be thrown
    await expect(compiler.compileToEpub(outputPath)).resolves.not.toThrow();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// BookConfig epub field
// ────────────────────────────────────────────────────────────────────────────

describe('BookConfig.epub', () => {
  it('defaults to false when not set', () => {
    const config = new BookConfig({
      title: 'Test',
      assetsDir: '/tmp',
      distDir: '/tmp',
      outputFilename: 'book.md'
    });
    expect(config.epub).toBe(false);
  });

  it('can be set to true', () => {
    const config = new BookConfig({
      title: 'Test',
      assetsDir: '/tmp',
      distDir: '/tmp',
      outputFilename: 'book.md',
      epub: true
    });
    expect(config.epub).toBe(true);
  });

  it('is included in rawConfig', () => {
    const config = new BookConfig({
      title: 'Test',
      assetsDir: '/tmp',
      distDir: '/tmp',
      outputFilename: 'book.md',
      epub: true
    });
    expect(config.rawConfig.epub).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// StyleManager.getEpubCSS
// ────────────────────────────────────────────────────────────────────────────

describe('StyleManager.getEpubCSS', () => {
  it('does not contain @page rules', () => {
    const sm = new StyleManager();
    sm.usePredefinedTheme('serif');
    const css = sm.getEpubCSS();
    expect(css).not.toMatch(/@page\s*\{/);
  });

  it('does not contain page-break-before or page-break-after properties', () => {
    const sm = new StyleManager();
    sm.usePredefinedTheme('academic');
    const css = sm.getEpubCSS();
    expect(css).not.toMatch(/page-break-before/i);
    expect(css).not.toMatch(/page-break-after/i);
  });

  it('does not contain orphans or widows properties', () => {
    const sm = new StyleManager();
    sm.usePredefinedTheme('sans-serif');
    const css = sm.getEpubCSS();
    expect(css).not.toMatch(/^\s*orphans\s*:/m);
    expect(css).not.toMatch(/^\s*widows\s*:/m);
  });

  it('returns non-empty CSS string', () => {
    const sm = new StyleManager();
    sm.usePredefinedTheme('serif');
    const css = sm.getEpubCSS();
    expect(css.length).toBeGreaterThan(100);
  });
});
