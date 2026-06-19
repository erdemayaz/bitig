import * as fs from 'fs';
import { BookLinter } from '../src/BookLinter';
import { BookCompiler } from '../src/BookCompiler';
import { BookConfig } from '../src/BookConfig';
import { Section } from '../src/Section';
import { Chapter } from '../src/Chapter';

// File-level mock of fs to prevent 'Cannot redefine property' errors on existsSync
jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    existsSync: jest.fn((p) => {
      if (typeof p === 'string' && p.includes('non-existent.md')) {
        return false;
      }
      return originalFs.existsSync(p);
    })
  };
});

describe('BookLinter', () => {
  let compiler: BookCompiler;

  beforeEach(() => {
    jest.restoreAllMocks();
    const config = new BookConfig({
      title: 'Lint Book',
      assetsDir: './assets',
      distDir: './dist',
      citations: [
        {
          term: 'apple term',
          replacement: 'apple term<sup>[1]</sup>'
        },
        {
          term: 'banana term',
          replacement: 'banana term<sup>[2]</sup>'
        }
      ]
    });
    compiler = new BookCompiler(config);
  });

  it('should flag empty chapters and unclosed code blocks', () => {
    const section = new Section(1, 'Foundations');
    const chapter1 = new Chapter('assets/section-1/1.1.md', './assets');
    chapter1.title = 'Empty Chapter';
    chapter1.rawContent = ''; // empty

    const chapter2 = new Chapter('assets/section-1/1.2.md', './assets');
    chapter2.title = 'Unclosed Code Block';
    chapter2.rawContent = '# Chapter\n```javascript\nconst x = 5;\n'; // odd triple backticks

    section.addChapter(chapter1);
    section.addChapter(chapter2);
    compiler.sections = [section];

    const linter = new BookLinter(compiler);

    // Stub compiler.scanAndLoad so it doesn't try to read real files
    jest.spyOn(compiler, 'scanAndLoad').mockImplementation(() => {});

    const reports = linter.runAllChecks();

    const warnings = reports.filter((r) => r.type === 'warning');
    const errors = reports.filter((r) => r.type === 'error');

    expect(warnings.some((w) => w.message.includes('empty or only contains'))).toBe(true);
    expect(errors.some((e) => e.message.includes('unclosed markdown code block'))).toBe(true);
  });

  it('should flag unused citation rules', () => {
    const section = new Section(1, 'Foundations');
    const chapter = new Chapter('assets/section-1/1.1.md', './assets');
    chapter.title = 'Content';
    chapter.rawContent = 'This chapter matches the banana term in text.';
    section.addChapter(chapter);
    compiler.sections = [section];

    const linter = new BookLinter(compiler);
    jest.spyOn(compiler, 'scanAndLoad').mockImplementation(() => {});

    const reports = linter.runAllChecks();

    // The unused term (apple term) should be flagged as a warning in book.json
    const unusedWarn = reports.find(
      (r) => r.type === 'warning' && r.file === 'book.json' && r.message.includes('apple term')
    );
    expect(unusedWarn).toBeDefined();

    // The used term (banana term) should NOT be flagged
    const usedWarn = reports.find(
      (r) => r.type === 'warning' && r.file === 'book.json' && r.message.includes('banana term')
    );
    expect(usedWarn).toBeUndefined();
  });

  it('should flag broken links', () => {
    const section = new Section(1, 'Foundations');
    const chapter = new Chapter('assets/section-1/1.1.md', './assets');
    chapter.title = 'Link Chapter';
    chapter.rawContent = 'This chapter contains a [broken link](non-existent.md).';
    section.addChapter(chapter);
    compiler.sections = [section];

    const linter = new BookLinter(compiler);
    jest.spyOn(compiler, 'scanAndLoad').mockImplementation(() => {});

    const reports = linter.runAllChecks();
    const linkError = reports.find(
      (r) => r.type === 'error' && r.message.includes('Broken internal markdown link')
    );
    expect(linkError).toBeDefined();
  });
});
