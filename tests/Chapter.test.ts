import * as fs from 'fs';
import { Chapter } from '../src/Chapter';

// Mock fs to isolate existsSync and readFileSync checks
jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    existsSync: jest.fn(),
    readFileSync: jest.fn()
  };
});

describe('Chapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parsing numbers from filename and paths', () => {
    it('should parse normal chapter coordinates correctly', () => {
      const chapter = new Chapter('assets/section-3/3.12.md', './assets');
      expect(chapter.sectionNum).toBe(3);
      expect(chapter.chapterNum).toBe(12);
    });

    it('should fall back to filename numbers if section folder is not parsed', () => {
      const chapter = new Chapter('assets/random/4_5.md', './assets');
      expect(chapter.sectionNum).toBe(4);
      expect(chapter.chapterNum).toBe(5);
    });

    it('should parse epilogue file to section 998, chapter 1', () => {
      const specialFiles = { epilogue: 'son-soz.md', bibliography: 'kaynakca.md' };
      const chapter = new Chapter('assets/son-soz.md', './assets', specialFiles);
      expect(chapter.sectionNum).toBe(998);
      expect(chapter.chapterNum).toBe(1);
    });

    it('should parse bibliography file to section 999, chapter 1', () => {
      const specialFiles = { epilogue: 'son-soz.md', bibliography: 'kaynakca.md' };
      const chapter = new Chapter('assets/kaynakca.md', './assets', specialFiles);
      expect(chapter.sectionNum).toBe(999);
      expect(chapter.chapterNum).toBe(1);
    });
  });

  describe('getSortKey', () => {
    it('should generate zero-padded sort key', () => {
      const chapter = new Chapter('assets/section-1/1.5.md', './assets');
      expect(chapter.getSortKey()).toBe('00000001-00000005');
    });
  });

  describe('load file content', () => {
    it('should read file content and extract title from H1', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('# My Cool Chapter\n\nSome body text.');

      const chapter = new Chapter('assets/section-1/1.1.md', './assets');
      chapter.load();

      expect(chapter.title).toBe('My Cool Chapter');
      expect(chapter.rawContent).toBe('# My Cool Chapter\n\nSome body text.');
    });

    it('should fall back to filename if H1 is missing', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('Some body text without header.');

      const chapter = new Chapter('assets/section-1/1.1.md', './assets');
      chapter.load();

      expect(chapter.title).toBe('1.1');
    });
  });
});
