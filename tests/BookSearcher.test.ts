import { BookSearcher } from '../src/BookSearcher';
import { BookCompiler } from '../src/BookCompiler';
import { BookConfig } from '../src/BookConfig';
import { Section } from '../src/Section';
import { Chapter } from '../src/Chapter';

describe('BookSearcher', () => {
  it('should find keyword matches in chapter contents', () => {
    const config = new BookConfig({
      title: 'Search Book',
      assetsDir: './assets',
      distDir: './dist'
    });
    const compiler = new BookCompiler(config);
    jest.spyOn(compiler, 'scanAndLoad').mockImplementation(() => {});

    // Mock sections and chapters
    const section1 = new Section(1, 'Foundations');
    const chapter1 = new Chapter('assets/section-1/1.1.md', './assets');
    chapter1.title = 'Introduction';
    chapter1.rawContent = 'This chapter covers quantum consciousness and Orch-OR theory.';

    const chapter2 = new Chapter('assets/section-1/1.2.md', './assets');
    chapter2.title = 'Deep Dive';
    chapter2.rawContent = 'Nothing here but normal text.';

    section1.addChapter(chapter1);
    section1.addChapter(chapter2);
    compiler.sections = [section1];

    const searcher = new BookSearcher(compiler);
    const results = searcher.search('quantum');

    expect(results.length).toBe(1);
    expect(results[0].file).toBe('section-1/1.1.md');
    expect(results[0].chapterTitle).toBe('Introduction');
    expect(results[0].lineNumber).toBe(1);
    expect(results[0].lineContent).toBe(
      'This chapter covers quantum consciousness and Orch-OR theory.'
    );
  });

  it('should be case-insensitive', () => {
    const config = new BookConfig({
      title: 'Search Book',
      assetsDir: './assets',
      distDir: './dist'
    });
    const compiler = new BookCompiler(config);
    jest.spyOn(compiler, 'scanAndLoad').mockImplementation(() => {});

    const section1 = new Section(1, 'Foundations');
    const chapter1 = new Chapter('assets/section-1/1.1.md', './assets');
    chapter1.title = 'Intro';
    chapter1.rawContent = 'CASE SENSITIVE TEXT.';
    section1.addChapter(chapter1);
    compiler.sections = [section1];

    const searcher = new BookSearcher(compiler);
    const results = searcher.search('case');
    expect(results.length).toBe(1);
  });
});
