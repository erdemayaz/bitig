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
});
