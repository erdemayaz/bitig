import { ContextPackager } from '../src/ContextPackager';
import { BookCompiler } from '../src/BookCompiler';
import { BookConfig } from '../src/BookConfig';
import { Section } from '../src/Section';
import { Chapter } from '../src/Chapter';
import { AgentMetadataGenerator } from '../src/AgentMetadataGenerator';

describe('ContextPackager', () => {
  it('should package AI context correctly including outlines, styles, and preceding text', () => {
    const config = new BookConfig({
      title: 'Context Book',
      author: 'Ayla',
      description: 'Sci-fi novel',
      theme: 'academic',
      citations: [
        {
          term: 'Turing',
          replacement: 'Turing<sup>[1]</sup>'
        }
      ]
    });
    const compiler = new BookCompiler(config);
    jest.spyOn(compiler, 'scanAndLoad').mockImplementation(() => {});

    // Create sections and chapters
    const section1 = new Section(1, 'Introduction');
    const chapter1 = new Chapter('assets/section-1/1.1.md', './assets');
    chapter1.title = 'A New Dawn';
    chapter1.rawContent = 'Paragraph one of the first chapter. This is about Turing.';

    const chapter2 = new Chapter('assets/section-1/1.2.md', './assets');
    chapter2.title = 'The Machine Rise';
    chapter2.rawContent = 'This is the target chapter content.';

    section1.addChapter(chapter1);
    section1.addChapter(chapter2);
    compiler.sections = [section1];

    compiler.metadataGenerator = new AgentMetadataGenerator(config, compiler.sections);

    const packager = new ContextPackager(compiler);
    const result = packager.packageContextFor(1, 2);

    expect(result).toContain('# BOOK WRITING CONTEXT PACK');
    expect(result).toContain('Section 1, Chapter 2');
    expect(result).toContain('Context Book');
    expect(result).toContain('Ayla');
    expect(result).toContain('academic');
    expect(result).toContain('Term: "Turing"');
    expect(result).toContain('Paragraph one of the first chapter.');
    expect(result).toContain('This is the target chapter content.');
  });
});
