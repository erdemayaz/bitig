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
    writeFileSync: jest.fn()
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
  });
});
