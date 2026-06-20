import { Section } from './Section';
import { TextProcessor } from './TextProcessor';
import { Locale } from './Locale';

export class TOCGenerator {
  /**
   * Generates a beautifully formatted HTML Table of Contents.
   * Compatible with print stylesheets and PDF layouts.
   * @param sections
   * @param language
   * @returns string
   */
  public static generateHTML(sections: Section[], language: string = 'tr'): string {
    if (!Array.isArray(sections) || sections.length === 0) return '';

    const heading = Locale.get('tocHtmlHeading', language);
    let tocHtml = `\n\n<div class="toc-page">\n  <h1 class="toc-heading">${heading}</h1>\n  <div class="toc-container">\n`;

    sections.forEach((section) => {
      // 998: Epilogue, 999: Bibliography
      const isSpecialSection = section.sectionNum >= 998;
      const sectionSlug = TextProcessor.slugify(section.title);

      tocHtml += `    <div class="toc-section">\n`;
      tocHtml += `      <div class="toc-section-title"><a href="#${sectionSlug}">${section.title}</a></div>\n`;

      if (section.chapters && section.chapters.length > 0) {
        tocHtml += `      <ul class="toc-chapters">\n`;

        section.chapters.forEach((chapter) => {
          let prefix = '';
          // Only show numerical prefix for regular chapters, not epilogue/bibliography or section 0 (preface)
          if (section.sectionNum > 0 && !isSpecialSection) {
            prefix = `${section.sectionNum}.${chapter.chapterNum} `;
          }
          const fullChapterTitle = prefix + chapter.title;
          const chapterSlug = TextProcessor.slugify(chapter.title);
          tocHtml += `        <li><a href="#${chapterSlug}">${fullChapterTitle}</a></li>\n`;
        });

        tocHtml += `      </ul>\n`;
      }

      tocHtml += `    </div>\n`;
    });

    tocHtml += `  </div>\n</div>\n\n<div class="page-break"></div>\n\n`;
    return tocHtml;
  }

  /**
   * Generates a standard Markdown Table of Contents.
   * @param sections
   * @param language
   * @returns string
   */
  public static generateMarkdown(sections: Section[], language: string = 'tr'): string {
    if (!Array.isArray(sections) || sections.length === 0) return '';

    const heading = Locale.get('tocMdHeading', language);
    let tocMd = heading;

    sections.forEach((section) => {
      const isSpecialSection = section.sectionNum >= 998;
      const sectionSlug = TextProcessor.slugify(section.title);
      tocMd += `## [${section.title}](#${sectionSlug})\n`;

      if (section.chapters && section.chapters.length > 0) {
        section.chapters.forEach((chapter) => {
          let prefix = '';
          if (section.sectionNum > 0 && !isSpecialSection) {
            prefix = `${section.sectionNum}.${chapter.chapterNum} `;
          }
          const fullChapterTitle = prefix + chapter.title;
          const chapterSlug = TextProcessor.slugify(chapter.title);
          tocMd += `* [${fullChapterTitle}](#${chapterSlug})\n`;
        });
      }
      tocMd += `\n`;
    });

    return tocMd;
  }
}
export default TOCGenerator;
