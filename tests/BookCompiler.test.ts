import * as fs from 'fs';
import { BookCompiler } from '../src/BookCompiler';
import { BookConfig } from '../src/BookConfig';
import { Section } from '../src/Section';
import { Chapter } from '../src/Chapter';
import { PdfCompiler } from '../src/PdfCompiler';

// Path-selective fs mock to avoid breaking Puppeteer configuration checks
jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    existsSync: jest.fn((p) => {
      if (typeof p === 'string' && p.includes('assets')) {
        return true;
      }
      return originalFs.existsSync(p);
    }),
    readdirSync: jest.fn((p, options) => {
      if (typeof p === 'string' && (p.includes('assets') || p.includes('section'))) {
        if (!p.includes('section')) {
          return ['section-1', 'SUMMARY.md'];
        }
        return ['1.1.md'];
      }
      return originalFs.readdirSync(p, options);
    }),
    statSync: jest.fn((p) => {
      if (typeof p === 'string' && (p.includes('assets') || p.includes('section'))) {
        return {
          isDirectory: () => p.includes('section-1') && !p.endsWith('.md')
        };
      }
      return originalFs.statSync(p);
    }),
    readFileSync: jest.fn((p, options) => {
      if (typeof p === 'string' && p.includes('assets')) {
        return '# Chapter One\nSome content.';
      }
      return originalFs.readFileSync(p, options);
    }),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn()
  };
});

jest.mock('../src/PdfCompiler');

describe('BookCompiler', () => {
  let config: BookConfig;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    config = new BookConfig({
      title: 'Compile Book',
      assetsDir: './assets',
      distDir: './dist',
      outputFilename: 'book.md',
      pdf: true
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should throw error if config is not BookConfig', () => {
      expect(() => new BookCompiler({} as any)).toThrow();
    });
  });

  describe('scanAndLoad', () => {
    it('should crawl assetsDir and load markdown files', () => {
      const compiler = new BookCompiler(config);
      compiler.scanAndLoad();

      expect(compiler.sections.length).toBe(1);
      expect(compiler.sections[0].sectionNum).toBe(1);
      expect(compiler.sections[0].chapters.length).toBe(1);
      expect(compiler.sections[0].chapters[0].title).toBe('Chapter One');
    });

    it('should throw error if assets directory does not exist', () => {
      // Temporarily mock existsSync to return false
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
      const compiler = new BookCompiler(config);
      expect(() => compiler.scanAndLoad()).toThrow('Assets directory not found');
    });
  });

  describe('compile and writeOutputs', () => {
    it('should assemble markdown and HTML outputs and trigger PDF compile if enabled', async () => {
      const compiler = new BookCompiler(config);

      const section = new Section(1, 'Part One');
      const chapter = new Chapter('assets/section-1/1.1.md', './assets');
      chapter.title = 'Start';
      chapter.rawContent = '# Start\nThis is content.';
      section.addChapter(chapter);

      compiler.sections = [section];
      compiler.metadataGenerator = {
        generateJSONMetadata: () => '{}',
        injectYAMLFrontmatter: (c: string) => 'YAML\n' + c
      } as any;

      const mockCompileToPdf = jest.fn().mockResolvedValue('output.pdf');
      (PdfCompiler as jest.Mock).mockImplementation(() => {
        return { compileToPdf: mockCompileToPdf };
      });

      await compiler.writeOutputs();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('book.md'),
        expect.stringContaining('YAML'),
        'utf8'
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('book-metadata.json'),
        '{}',
        'utf8'
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('book.html'),
        expect.any(String),
        'utf8'
      );
      expect(mockCompileToPdf).toHaveBeenCalled();
    });

    it('should throw error if compile is called before scanAndLoad (metadataGenerator is null)', () => {
      const compiler = new BookCompiler(config);
      expect(() => compiler.compile()).toThrow(
        'BookCompiler: scanAndLoad must be called before compile.'
      );
    });

    it('should throw error if writeOutputs is called before scanAndLoad (metadataGenerator is null)', async () => {
      const compiler = new BookCompiler(config);
      jest.spyOn(compiler, 'compile').mockReturnValue({ markdown: '', html: '' });
      await expect(compiler.writeOutputs()).rejects.toThrow(
        'BookCompiler: scanAndLoad must be called before writeOutputs.'
      );
    });

    it('should create dist directory if it does not exist', async () => {
      (fs.existsSync as jest.Mock).mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('dist')) {
          return false;
        }
        return true;
      });

      const compiler = new BookCompiler(config);
      compiler.metadataGenerator = {
        generateJSONMetadata: () => '{}',
        injectYAMLFrontmatter: (c: string) => 'YAML\n' + c
      } as any;
      compiler.sections = [new Section(1, 'S1')];

      await compiler.writeOutputs();
      expect(fs.mkdirSync).toHaveBeenCalled();
    });

    it('should skip PDF generation if pdf is false in config', async () => {
      config.pdf = false;
      const compiler = new BookCompiler(config);
      compiler.metadataGenerator = {
        generateJSONMetadata: () => '{}',
        injectYAMLFrontmatter: (c: string) => 'YAML\n' + c
      } as any;
      compiler.sections = [new Section(1, 'S1')];

      await compiler.writeOutputs();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('PDF'));
    });

    it('should resolve custom theme path in constructor', () => {
      config.customThemePath = 'my-custom-theme.css';
      // Mock existsSync for my-custom-theme.css
      (fs.existsSync as jest.Mock).mockImplementation((p) => {
        if (typeof p === 'string' && p.includes('my-custom-theme.css')) {
          return true;
        }
        return true;
      });
      const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue('body { color: blue; }');

      const compiler = new BookCompiler(config);
      expect(compiler.styleManager.customCSS).toBe('body { color: blue; }');
      readSpy.mockRestore();
    });

    it('should handle epilogue and bibliography section title fallbacks', () => {
      const compiler = new BookCompiler(config);

      // Mock existsSync, readdirSync, and statSync to avoid infinite recursion
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockImplementation((p) => {
        if (p === './assets') {
          return ['section-1', 'section-2', 'epilogue.md', 'bibliography.md'];
        }
        return [];
      });
      (fs.statSync as jest.Mock).mockImplementation((p) => {
        return {
          isDirectory: () => !p.endsWith('.md')
        };
      });

      const epilogueChapter = new Chapter('assets/epilogue.md', './assets', {
        epilogue: 'epilogue.md'
      });
      epilogueChapter.sectionNum = 998;
      epilogueChapter.title = 'My Epilogue';
      epilogueChapter.rawContent = '# My Epilogue';

      const bibliographyChapter = new Chapter('assets/bibliography.md', './assets', {
        bibliography: 'bibliography.md'
      });
      bibliographyChapter.sectionNum = 999;
      bibliographyChapter.title = 'My Bibliography';
      bibliographyChapter.rawContent = '# My Bibliography';

      // Manually add chapters that scanAndLoad would load
      (fs.readFileSync as jest.Mock).mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('epilogue.md')) return '# My Epilogue';
        if (typeof path === 'string' && path.includes('bibliography.md'))
          return '# My Bibliography';
        return '# Chapter';
      });

      // Let scanAndLoad run with mocked folders section-1 and section-2 (maxFolderSection = 2)
      // epilogue will map to sectionTitles[3] -> "Section 3" or default "Epilogue"
      // bibliography will map to sectionTitles[4] -> "Section 4" or default "Bibliography"
      compiler.scanAndLoad();

      const epilogueSection = compiler.sections.find((s) => s.sectionNum === 998);
      const bibSection = compiler.sections.find((s) => s.sectionNum === 999);

      expect(epilogueSection).toBeDefined();
      expect(epilogueSection?.title).toBe('Epilogue');
      expect(bibSection).toBeDefined();
      expect(bibSection?.title).toBe('Bibliography');
    });

    it('should generate page breaks between adjacent chapters and adjacent sections', () => {
      const compiler = new BookCompiler(config);

      const section1 = new Section(1, 'S1');
      const c1 = new Chapter('assets/section-1/1.1.md', './assets');
      c1.title = 'Chap 1';
      c1.rawContent = '# Chap 1';
      const c2 = new Chapter('assets/section-1/1.2.md', './assets');
      c2.title = 'Chap 2';
      c2.rawContent = '# Chap 2';
      section1.addChapter(c1);
      section1.addChapter(c2);

      const section2 = new Section(2, 'S2');
      const c3 = new Chapter('assets/section-2/2.1.md', './assets');
      c3.title = 'Chap 3';
      c3.rawContent = '# Chap 3';
      section2.addChapter(c3);

      compiler.sections = [section1, section2];
      compiler.metadataGenerator = {
        generateJSONMetadata: () => '{}',
        injectYAMLFrontmatter: (c: string) => 'YAML\n' + c
      } as any;

      const compiled = compiler.compile();
      // Should contain page break class between c1 and c2
      expect(compiled.html).toContain('<div class="page-break"></div>');
      expect(compiled.html).not.toContain('<div class="copyright-page">');
    });

    it('should inject metadata tags and copyright page HTML if configured', () => {
      const configWithMeta = new BookConfig({
        title: 'Metadata Book',
        author: 'John Doe',
        assetsDir: './assets',
        distDir: './dist',
        isbn: '123-456-789',
        publisher: 'Test Publisher',
        publishDate: '2026',
        copyright: 'All Rights Reserved',
        language: 'en'
      });
      const compiler = new BookCompiler(configWithMeta);
      compiler.scanAndLoad();
      const compiled = compiler.compile();

      expect(compiled.html).toContain(
        '<meta name="dcterms.identifier" content="urn:isbn:123-456-789">'
      );
      expect(compiled.html).toContain('<meta name="dcterms.publisher" content="Test Publisher">');
      expect(compiled.html).toContain('<meta name="dcterms.date" content="2026">');
      expect(compiled.html).toContain('<meta name="dcterms.rights" content="All Rights Reserved">');
      expect(compiled.html).toContain('<div class="copyright-page">');
      expect(compiled.html).toContain('COPYRIGHT');
    });

    it('should handle sectionHeaderStyle config option formats correctly', () => {
      const section = new Section(1, 'Part One');
      const chapter = new Chapter('assets/section-1/1.1.md', './assets');
      chapter.title = 'Start';
      chapter.rawContent = '# Start\nThis is content.';
      section.addChapter(chapter);

      // 1. split style
      const configSplit = new BookConfig({
        title: 'Book',
        assetsDir: './assets',
        distDir: './dist',
        sectionHeaderStyle: 'split',
        language: 'en'
      });
      const compilerSplit = new BookCompiler(configSplit);
      compilerSplit.sections = [section];
      compilerSplit.metadataGenerator = {
        generateJSONMetadata: () => '{}',
        injectYAMLFrontmatter: (c: string) => c
      } as any;

      const compiledSplit = compilerSplit.compile();
      expect(compiledSplit.markdown).toContain(
        '<div class="section-header" id="section-header-1">'
      );
      expect(compiledSplit.markdown).toContain('<div class="section-number">Section 1</div>');
      expect(compiledSplit.markdown).toContain('<h1 class="section-title">Part One</h1>');

      // 2. title-only style
      const configTitleOnly = new BookConfig({
        title: 'Book',
        assetsDir: './assets',
        distDir: './dist',
        sectionHeaderStyle: 'title-only'
      });
      const compilerTitleOnly = new BookCompiler(configTitleOnly);
      compilerTitleOnly.sections = [section];
      compilerTitleOnly.metadataGenerator = {
        generateJSONMetadata: () => '{}',
        injectYAMLFrontmatter: (c: string) => c
      } as any;

      const compiledTitleOnly = compilerTitleOnly.compile();
      expect(compiledTitleOnly.markdown).toContain('# Part One');
      expect(compiledTitleOnly.markdown).not.toContain('<div class="section-header">');

      // 3. hidden style
      const configHidden = new BookConfig({
        title: 'Book',
        assetsDir: './assets',
        distDir: './dist',
        sectionHeaderStyle: 'hidden'
      });
      const compilerHidden = new BookCompiler(configHidden);
      compilerHidden.sections = [section];
      compilerHidden.metadataGenerator = {
        generateJSONMetadata: () => '{}',
        injectYAMLFrontmatter: (c: string) => c
      } as any;

      const compiledHidden = compilerHidden.compile();
      expect(compiledHidden.markdown).toContain('<div id="part-one"></div>');
      expect(compiledHidden.markdown).not.toContain('# Part One');

      // 4. split style with special section (e.g. Epilogue 998)
      const specialSection = new Section(998, 'Epilogue');
      const epilogueChapter = new Chapter('assets/epilogue.md', './assets');
      epilogueChapter.title = 'End';
      epilogueChapter.rawContent = '# End\nContent.';
      specialSection.addChapter(epilogueChapter);

      const compilerSpecial = new BookCompiler(configSplit);
      compilerSpecial.sections = [specialSection];
      compilerSpecial.metadataGenerator = {
        generateJSONMetadata: () => '{}',
        injectYAMLFrontmatter: (c: string) => c
      } as any;

      const compiledSpecial = compilerSpecial.compile();
      expect(compiledSpecial.markdown).toContain(
        '<div class="section-header" id="section-header-998">'
      );
      expect(compiledSpecial.markdown).not.toContain('<div class="section-number">');
      expect(compiledSpecial.markdown).toContain('<h1 class="section-title">Epilogue</h1>');
    });

    it('should inject KaTeX stylesheets, script tags, and auto-render config', () => {
      const compiler = new BookCompiler(config);
      compiler.scanAndLoad();
      const compiled = compiler.compile();

      expect(compiled.html).toContain('katex.min.css');
      expect(compiled.html).toContain('katex.min.js');
      expect(compiled.html).toContain('auto-render.min.js');
      expect(compiled.html).toContain('renderMathInElement(document.body');
    });
  });
});
