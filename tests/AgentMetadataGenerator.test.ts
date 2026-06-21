import { AgentMetadataGenerator } from '../src/AgentMetadataGenerator';
import { BookConfig } from '../src/BookConfig';
import { Section } from '../src/Section';
import { Chapter } from '../src/Chapter';

describe('AgentMetadataGenerator', () => {
  let generator: AgentMetadataGenerator;
  let config: BookConfig;
  let sections: Section[];

  beforeEach(() => {
    config = new BookConfig({
      title: 'Meta Book',
      subtitle: 'The Quest',
      author: 'Author One',
      description: 'An AI story'
    });

    const section1 = new Section(1, 'Part One');
    const chapter1 = new Chapter('assets/section-1/1.1.md', './assets');
    chapter1.title = 'Hello';
    chapter1.rawContent =
      'This is the first paragraph. It is long enough to generate a nice synopsis if we wanted to, but we keep it short.';
    section1.addChapter(chapter1);

    sections = [section1];
    generator = new AgentMetadataGenerator(config, sections);
  });

  it('should generate structured JSON metadata', () => {
    const jsonStr = generator.generateJSONMetadata();
    const data = JSON.parse(jsonStr);

    expect(data.book.title).toBe('Meta Book');
    expect(data.book.author).toBe('Author One');
    expect(data.stats.totalChapters).toBe(1);
    expect(data.stats.totalWords).toBeGreaterThan(0);
    expect(data.structure[0].title).toBe('Part One');
    expect(data.structure[0].chapters[0].title).toBe('Hello');
    expect(data.structure[0].chapters[0].synopsis).toContain('This is the first paragraph.');
  });

  it('should inject YAML frontmatter into compiled markdown', () => {
    const markdown = '## Content of the book';
    const result = generator.injectYAMLFrontmatter(markdown);

    expect(result).toContain('---');
    expect(result).toContain('title: "Meta Book"');
    expect(result).toContain('author: "Author One"');
    expect(result).toContain('aiAgentGuide:');
    expect(result).toContain('section: 1');
    expect(result).toContain('title: "Part One"');
    expect(result).toContain('chapters: ["Hello"]');
    expect(result).toContain('## Content of the book');
  });

  it('should handle empty chapter content and truncate long synopses to 250 chars', () => {
    const emptyChapter = new Chapter('assets/section-1/1.2.md', './assets');
    emptyChapter.title = 'Empty';
    emptyChapter.rawContent = '';

    const longChapter = new Chapter('assets/section-1/1.3.md', './assets');
    longChapter.title = 'Long';
    longChapter.rawContent = 'A'.repeat(300); // 300 character long single paragraph

    const sec = new Section(1, 'Part One');
    sec.addChapter(emptyChapter);
    sec.addChapter(longChapter);

    const gen = new AgentMetadataGenerator(config, [sec]);
    const jsonStr = gen.generateJSONMetadata();
    const data = JSON.parse(jsonStr);

    // Empty chapter asserts
    expect(data.structure[0].chapters[0].characterCount).toBe(0);
    expect(data.structure[0].chapters[0].wordCount).toBe(0);
    expect(data.structure[0].chapters[0].synopsis).toBe('');

    // Long chapter synopsis assert (length should be 253: 250 characters + '...')
    expect(data.structure[0].chapters[1].synopsis.length).toBe(253);
    expect(data.structure[0].chapters[1].synopsis.endsWith('...')).toBe(true);

    // Check countWords private method with empty text via cast
    const wordCountEmpty = (gen as any)._countWords('');
    expect(wordCountEmpty).toBe(0);
  });

  it('should include new publishing metadata (isbn, publisher, publishDate, copyright) in JSON and YAML', () => {
    const configWithMeta = new BookConfig({
      title: 'Meta Book',
      subtitle: 'The Quest',
      author: 'Author One',
      description: 'An AI story',
      isbn: '123-45-67890-12-3',
      publisher: 'Bitig Pub',
      publishDate: '2026-06-21',
      copyright: 'All Rights Reserved'
    });
    const gen = new AgentMetadataGenerator(configWithMeta, sections);

    // JSON assertions
    const jsonStr = gen.generateJSONMetadata();
    const data = JSON.parse(jsonStr);
    expect(data.book.isbn).toBe('123-45-67890-12-3');
    expect(data.book.publisher).toBe('Bitig Pub');
    expect(data.book.publishDate).toBe('2026-06-21');
    expect(data.book.copyright).toBe('All Rights Reserved');

    // YAML assertions
    const yaml = gen.injectYAMLFrontmatter('## Body');
    expect(yaml).toContain('isbn: "123-45-67890-12-3"');
    expect(yaml).toContain('publisher: "Bitig Pub"');
    expect(yaml).toContain('publishDate: "2026-06-21"');
    expect(yaml).toContain('copyright: "All Rights Reserved"');
  });
});
