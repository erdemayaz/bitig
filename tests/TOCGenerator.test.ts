import { TOCGenerator } from '../src/TOCGenerator';
import { Section } from '../src/Section';
import { Chapter } from '../src/Chapter';

describe('TOCGenerator', () => {
  let sections: Section[];

  beforeEach(() => {
    const section0 = new Section(0, 'Preface');
    const chapter0 = new Chapter('assets/section-0/0.1.md', './assets');
    chapter0.title = 'Introduction';
    section0.addChapter(chapter0);

    const section1 = new Section(1, 'Chapter One');
    const chapter1 = new Chapter('assets/section-1/1.1.md', './assets');
    chapter1.title = 'Deep Space';
    section1.addChapter(chapter1);

    const section998 = new Section(998, 'Epilogue');
    const chapter998 = new Chapter('assets/epilogue.md', './assets');
    chapter998.title = 'The End';
    section998.addChapter(chapter998);

    sections = [section0, section1, section998];
  });

  describe('generateHTML', () => {
    it('should return empty string for empty sections', () => {
      expect(TOCGenerator.generateHTML([])).toBe('');
    });

    it('should render HTML layout with appropriate section titles and anchors in English', () => {
      const html = TOCGenerator.generateHTML(sections, 'en');
      expect(html).toContain('TABLE OF CONTENTS');
      expect(html).toContain('href="#preface"');
      expect(html).toContain('href="#chapter-one"');
      expect(html).toContain('href="#epilogue"');
    });

    it('should render HTML layout with appropriate section titles and anchors in Turkish', () => {
      const html = TOCGenerator.generateHTML(sections, 'tr');
      expect(html).toContain('İÇİNDEKİLER');
    });

    it('should prefix numerical chapters only for regular sections (section > 0 and < 998) in English', () => {
      const html = TOCGenerator.generateHTML(sections, 'en');
      // Section 0 chapter should not have a numerical prefix in the label
      expect(html).toContain('<li><a href="#introduction">Introduction</a></li>');
      // Section 1 chapter should have numerical prefix 1.1
      expect(html).toContain('<li><a href="#deep-space">1.1 Deep Space</a></li>');
      // Section 998 should not have prefix
      expect(html).toContain('<li><a href="#the-end">The End</a></li>');
    });
  });

  describe('generateMarkdown', () => {
    it('should return empty string for empty sections', () => {
      expect(TOCGenerator.generateMarkdown([])).toBe('');
    });

    it('should render markdown structure with anchors in English', () => {
      const md = TOCGenerator.generateMarkdown(sections, 'en');
      expect(md).toContain('# Table of Contents');
      expect(md).toContain('## [Preface](#preface)');
      expect(md).toContain('## [Chapter One](#chapter-one)');
      expect(md).toContain('* [1.1 Deep Space](#deep-space)');
      expect(md).toContain('* [The End](#the-end)');
    });

    it('should render markdown structure with anchors in Turkish', () => {
      const md = TOCGenerator.generateMarkdown(sections, 'tr');
      expect(md).toContain('# İçindekiler');
    });
  });
});
