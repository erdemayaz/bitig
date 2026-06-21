import * as path from 'path';
import { BookCompiler } from './BookCompiler';
import { Chapter } from './Chapter';
import { Locale } from './Locale';
import { MemoryManager } from './MemoryManager';

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
  public packageContextFor(
    sectionNum: number,
    chapterNum: number,
    activeMemoryLayers: string[] = ['global', 'section', 'chapter']
  ): string {
    // Ensure files are loaded
    this.compiler.scanAndLoad();

    const lang = this.compiler.config.language;

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
    let synopsesText = Locale.get('contextStructureNoSynopsis', lang);
    if (metadataGen) {
      const metadata = JSON.parse(metadataGen.generateJSONMetadata());
      const synopsisLines: string[] = [];

      metadata.structure.forEach((sec: any) => {
        synopsisLines.push(
          Locale.get('contextStructureSection', lang, { sec: sec.sectionNum, title: sec.title })
        );
        sec.chapters.forEach((chap: any) => {
          const isTarget = chap.chapterNum === chapterNum && sec.sectionNum === sectionNum;
          const marker = isTarget ? ' 🌟 [TARGET CHAPTER]' : '';
          const synopsis = chap.synopsis || Locale.get('contextStructureNoContent', lang);
          synopsisLines.push(
            Locale.get('contextStructureChapter', lang, {
              sec: sec.sectionNum,
              chap: chap.chapterNum,
              title: chap.title,
              synopsis,
              marker
            })
          );
        });
      });
      synopsesText = synopsisLines.join('\n');
    }

    // Build guidelines
    const citations = this.compiler.config.citations;

    let memoryBlock = '';
    if (activeMemoryLayers.length > 0) {
      const projectDir = path.dirname(this.compiler.config.assetsDir);
      const memoryPath = path.join(projectDir, 'memory.json');
      const memoryManager = new MemoryManager(memoryPath);
      const formatted = memoryManager.getFormattedMemory(
        { sectionNum, chapterNum },
        activeMemoryLayers,
        lang
      );
      if (formatted) {
        memoryBlock = `${formatted}\n`;
      }
    }
    const styleTheme = this.compiler.config.theme;

    const metadataHeader = Locale.get('contextMetadataHeader', lang);
    const structureHeader = Locale.get('contextStructureHeader', lang);
    const guidelinesHeader = Locale.get('contextGuidelinesHeader', lang);
    const precedingHeader = Locale.get('contextPrecedingHeader', lang);
    const targetHeader = Locale.get('contextTargetHeader', lang);
    const instructionsHeader = Locale.get('contextInstructionsHeader', lang);

    const bookTitleLabel = Locale.get('contextBookTitle', lang);
    const bookSubtitleLabel = Locale.get('contextBookSubtitle', lang);
    const bookAuthorLabel = Locale.get('contextBookAuthor', lang);
    const bookDescLabel = Locale.get('contextBookDescription', lang);
    const bookThemeLabel = Locale.get('contextBookTheme', lang);

    let citationsText = Locale.get('contextGuidelinesNoCitations', lang);
    if (citations.length > 0) {
      citationsText = citations
        .map((c) =>
          Locale.get('contextGuidelinesRule', lang, { term: c.term, replacement: c.replacement })
        )
        .join('\n');
    }

    let precedingText = Locale.get('contextPrecedingNone', lang);
    if (prevChapter) {
      const intro = Locale.get('contextPrecedingIntro', lang, {
        sec: prevChapter.sectionNum,
        chap: prevChapter.chapterNum,
        title: prevChapter.title
      });
      precedingText = `${intro}\n\n\`\`\`markdown\n${prevChapter.rawContent}\n\`\`\``;
    }

    let targetText = Locale.get('contextTargetEmpty', lang);
    if (targetChapter.rawContent.trim() !== '') {
      const intro = Locale.get('contextTargetIntro', lang);
      targetText = `${intro}\n\n\`\`\`markdown\n${targetChapter.rawContent}\n\`\`\``;
    }

    const context = `
${Locale.get('contextTitle', lang)}
=========================
${Locale.get('contextIntro', lang)}
${Locale.get('contextTargetChapter', lang, { sec: sectionNum, chap: chapterNum, title: targetChapter.title })}

---

${metadataHeader}
- **${bookTitleLabel}**: ${this.compiler.config.title}
- **${bookSubtitleLabel}**: ${this.compiler.config.subtitle || 'N/A'}
- **${bookAuthorLabel}**: ${this.compiler.config.author}
- **${bookDescLabel}**: ${this.compiler.config.description || 'N/A'}
- **${bookThemeLabel}**: ${styleTheme}

---

${structureHeader}
${Locale.get('contextStructureIntro', lang)}
${synopsesText}

---
${memoryBlock}${guidelinesHeader}
${Locale.get('contextGuidelinesIntro', lang)}
${citationsText}

---

${precedingHeader}
${precedingText}

---

${targetHeader}
${targetText}

=========================
[${instructionsHeader}]
${Locale.get('contextInstruction1', lang)}
${Locale.get('contextInstruction2', lang)}
${Locale.get('contextInstruction3', lang)}
${Locale.get('contextInstruction4', lang)}
`;

    return context.trim();
  }
}
export default ContextPackager;
