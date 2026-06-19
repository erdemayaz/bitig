import { TextProcessor } from '../src/TextProcessor';
import { CitationCompiledRule } from '../src/types';

describe('TextProcessor', () => {
  describe('shiftHeaders', () => {
    it('should shift headers down by one level', () => {
      const content = '# Header 1\n## Header 2\nSome text';
      const expected = '## Header 1\n### Header 2\nSome text';
      expect(TextProcessor.shiftHeaders(content)).toBe(expected);
    });

    it('should not shift headers inside code blocks', () => {
      const content = '# Header 1\n```markdown\n# Code Header\n```\n## Header 2';
      const expected = '## Header 1\n```markdown\n# Code Header\n```\n### Header 2';
      expect(TextProcessor.shiftHeaders(content)).toBe(expected);
    });
  });

  describe('applyCitations', () => {
    it('should replace matched terms with citation markup', () => {
      const rules: CitationCompiledRule[] = [
        {
          term: /quantum entanglement/g,
          replacement: 'quantum entanglement<sup>[1]</sup>'
        }
      ];
      const content = 'This is a discussion on quantum entanglement.';
      const expected = 'This is a discussion on quantum entanglement<sup>[1]</sup>.';
      expect(TextProcessor.applyCitations(content, rules)).toBe(expected);
    });

    it('should handle multiple rules', () => {
      const rules: CitationCompiledRule[] = [
        {
          term: /term A/g,
          replacement: 'term A<sup>[1]</sup>'
        },
        {
          term: /term B/g,
          replacement: 'term B<sup>[2]</sup>'
        }
      ];
      const content = 'Matching term A and term B here.';
      const expected = 'Matching term A<sup>[1]</sup> and term B<sup>[2]</sup> here.';
      expect(TextProcessor.applyCitations(content, rules)).toBe(expected);
    });
  });

  describe('slugify', () => {
    it('should convert heading to a url slug', () => {
      expect(TextProcessor.slugify('Hello World!')).toBe('hello-world');
      expect(TextProcessor.slugify('  Spaced  Out  ')).toBe('spaced-out');
    });

    it('should correctly map Turkish characters', () => {
      expect(TextProcessor.slugify('Çalışma Odası Şenliği')).toBe('calisma-odasi-senligi');
      expect(TextProcessor.slugify('Ilık Göller Öksüz Kalmasın')).toBe(
        'ilik-goller-oksuz-kalmasin'
      );
    });
  });
});
