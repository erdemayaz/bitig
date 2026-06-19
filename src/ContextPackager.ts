import { BookCompiler } from './BookCompiler';
import { Chapter } from './Chapter';

export class ContextPackager {
  public compiler: BookCompiler;

  constructor(compiler: BookCompiler) {
    this.compiler = compiler;
  }

  /**
   * Packages a prompt context for a specific chapter.
   * Helps an AI agent understand the book's architecture, synopsis of each chapter,
   * style instructions, and the content of the preceding chapter for seamless continuity.
   * @param sectionNum
   * @param chapterNum
   * @returns string
   */
  public packageContextFor(sectionNum: number, chapterNum: number): string {
    // Ensure files are loaded
    this.compiler.scanAndLoad();

    // Sort all sections and chapters
    this.compiler.sections.sort((a, b) => a.sectionNum - b.sectionNum);
    this.compiler.sections.forEach((s) => s.sortChapters());

    const allChapters: Chapter[] = [];
    this.compiler.sections.forEach((s) => allChapters.push(...s.chapters));

    // Find the index of the target chapter
    const targetIdx = allChapters.findIndex(
      (c) => c.sectionNum === sectionNum && c.chapterNum === chapterNum
    );

    if (targetIdx === -1) {
      throw new Error(`Target chapter ${sectionNum}.${chapterNum} not found in the scanned files.`);
    }

    const targetChapter = allChapters[targetIdx];
    const prevChapter = targetIdx > 0 ? allChapters[targetIdx - 1] : null;

    // Generate synopses of all chapters
    const metadataGen = this.compiler.metadataGenerator;
    let synopsesText = 'No synopses available.';
    if (metadataGen) {
      const metadata = JSON.parse(metadataGen.generateJSONMetadata());
      const synopsisLines: string[] = [];

      metadata.structure.forEach((sec: any) => {
        synopsisLines.push(`### Section ${sec.sectionNum}: ${sec.title}`);
        sec.chapters.forEach((chap: any) => {
          const isTarget = chap.chapterNum === chapterNum && sec.sectionNum === sectionNum;
          const marker = isTarget ? ' 🌟 [TARGET CHAPTER]' : '';
          synopsisLines.push(
            `  - Chapter ${sec.sectionNum}.${chap.chapterNum} "${chap.title}": ${chap.synopsis || 'No content yet.'}${marker}`
          );
        });
      });
      synopsesText = synopsisLines.join('\n');
    }

    // Build guidelines
    const citations = this.compiler.config.citations;
    const styleTheme = this.compiler.config.theme;

    const context = `
# BOOK WRITING CONTEXT PACK
=========================
This pack is compiled specifically for writing or refining:
👉 **Section ${sectionNum}, Chapter ${chapterNum}**: "${targetChapter.title}"

---

## 1. GENERAL BOOK METADATA
- **Title**: ${this.compiler.config.title}
- **Subtitle**: ${this.compiler.config.subtitle || 'N/A'}
- **Author**: ${this.compiler.config.author}
- **Description**: ${this.compiler.config.description || 'N/A'}
- **Theme**: ${styleTheme}

---

## 2. BOOK STRUCTURE & SYNOPSES
Here is the outline of the book, including the first paragraph (synopsis) of each chapter:
${synopsesText}

---

## 3. STYLE GUIDELINES & CITATION RULES
Apply the following terms automatically. The compiler will map them using superscript formatting:
${
  citations.length > 0
    ? citations.map((c) => `- Term: "${c.term}" -> Citation: "${c.replacement}"`).join('\n')
    : 'No citations defined.'
}

---

## 4. PRECEDING CHAPTER CONTENT (For Narrative Flow)
${
  prevChapter
    ? `Here is the full text of the preceding chapter (Chapter ${prevChapter.sectionNum}.${prevChapter.chapterNum} "${prevChapter.title}") to maintain narrative flow and character consistency:

\`\`\`markdown
${prevChapter.rawContent}
\`\`\`
`
    : 'This is the first chapter of the book. No preceding chapter exists.'
}

---

## 5. TARGET CHAPTER CURRENT CONTENT (To edit or continue)
${
  targetChapter.rawContent.trim() !== ''
    ? `Here is the current content of the target chapter. Expand, edit, or rewrite this:

\`\`\`markdown
${targetChapter.rawContent}
\`\`\`
`
    : 'The target chapter is currently empty.'
}

=========================
[INSTRUCTIONS FOR AI AGENT]
- Maintain the style, vocabulary, and tone of the preceding chapter.
- Do not repeat information already covered in the synopses.
- Integrate the citation terms naturally.
- Output ONLY valid markdown text.
`;

    return context.trim();
  }
}
export default ContextPackager;
