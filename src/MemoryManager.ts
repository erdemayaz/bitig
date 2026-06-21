import * as fs from 'fs';
import * as path from 'path';
import { BookMemoryData, MemoryContent } from './types';
import { Locale } from './Locale';

const emptyMemory = (): MemoryContent => ({
  feedback: [],
  style: [],
  routines: []
});

const defaultMemoryData = (): BookMemoryData => ({
  global: emptyMemory(),
  sections: {},
  chapters: {}
});

export class MemoryManager {
  public memoryPath: string;
  public data: BookMemoryData;

  constructor(memoryPath: string) {
    this.memoryPath = path.resolve(memoryPath);
    this.data = defaultMemoryData();
    this.loadMemory();
  }

  /**
   * Loads memory from memory.json, creating a new default one if it doesn't exist.
   */
  public loadMemory(): void {
    if (!fs.existsSync(this.memoryPath)) {
      this.data = defaultMemoryData();
      return;
    }

    try {
      const content = fs.readFileSync(this.memoryPath, 'utf8').trim();
      if (!content) {
        this.data = defaultMemoryData();
        return;
      }
      const parsed = JSON.parse(content) as Partial<BookMemoryData>;
      this.data = {
        global: parsed.global || emptyMemory(),
        sections: parsed.sections || {},
        chapters: parsed.chapters || {}
      };

      // Ensure arrays are initialized
      this._sanitizeMemoryContent(this.data.global);
      Object.keys(this.data.sections).forEach((k) =>
        this._sanitizeMemoryContent(this.data.sections[k])
      );
      Object.keys(this.data.chapters).forEach((k) =>
        this._sanitizeMemoryContent(this.data.chapters[k])
      );
    } catch (err) {
      console.warn(
        `Warning: Failed to parse memory file. Initializing empty memory. Error: ${(err as Error).message}`
      );
      this.data = defaultMemoryData();
    }
  }

  /**
   * Writes the current memory data back to memory.json.
   */
  public saveMemory(): void {
    const dir = path.dirname(this.memoryPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.memoryPath, JSON.stringify(this.data, null, 2), 'utf8');
  }

  /**
   * Appends new feedback, style, or routine learning items to the specified scope.
   */
  public learn(
    scope: string,
    options: { feedback?: string; style?: string; routine?: string }
  ): void {
    const target = this._resolveScope(scope);

    if (options.feedback) {
      const trimmed = options.feedback.trim();
      if (trimmed && !target.feedback.includes(trimmed)) {
        target.feedback.push(trimmed);
      }
    }
    if (options.style) {
      const trimmed = options.style.trim();
      if (trimmed && !target.style.includes(trimmed)) {
        target.style.push(trimmed);
      }
    }
    if (options.routine) {
      const trimmed = options.routine.trim();
      if (trimmed && !target.routines.includes(trimmed)) {
        target.routines.push(trimmed);
      }
    }

    this.saveMemory();
  }

  /**
   * Clears memory records for a given scope.
   */
  public clear(scope: string): void {
    const parsed = this._parseScopeArgs(scope);
    if (parsed.type === 'global') {
      this.data.global = emptyMemory();
    } else if (parsed.type === 'section') {
      delete this.data.sections[parsed.key!];
    } else if (parsed.type === 'chapter') {
      delete this.data.chapters[parsed.key!];
    }
    this.saveMemory();
  }

  /**
   * Formats selected memory layers as a structured markdown block.
   */
  public getFormattedMemory(
    coords: { sectionNum: number; chapterNum: number },
    activeLayers: string[],
    language: string = 'tr'
  ): string {
    const sections: string[] = [];

    // Title / Header
    const titleText =
      Locale.get('contextMemoryTitle', language) ||
      '🧠 Otonom Yapay Zeka Belleği & Geri Bildirim Geçmişi';
    const introText =
      Locale.get('contextMemoryIntro', language) ||
      'Aşağıda geçmiş kullanıcı geri bildirimleri, alınan stil kararları ve uyulması gereken iş akışı kuralları yer almaktadır. Buradaki kuralları göz önünde bulundurarak yazım gerçekleştirin:';

    // 1. Global Layer
    if (activeLayers.includes('global')) {
      const globalLines = this._formatMemoryContent(this.data.global, language);
      if (globalLines) {
        const label =
          Locale.get('contextMemoryGlobalLabel', language) || 'Küresel / Proje Geneli Bellek:';
        sections.push(`### ${label}\n${globalLines}`);
      }
    }

    // 2. Section Layer
    const secKey = String(coords.sectionNum);
    if (activeLayers.includes('section') && this.data.sections[secKey]) {
      const sectionLines = this._formatMemoryContent(this.data.sections[secKey], language);
      if (sectionLines) {
        const label =
          Locale.get('contextMemorySectionLabel', language, { sec: coords.sectionNum }) ||
          `Bölüm Grubu ${coords.sectionNum} Belleği:`;
        sections.push(`### ${label}\n${sectionLines}`);
      }
    }

    // 3. Chapter Layer
    const chapKey = `${coords.sectionNum}.${coords.chapterNum}`;
    if (activeLayers.includes('chapter') && this.data.chapters[chapKey]) {
      const chapterLines = this._formatMemoryContent(this.data.chapters[chapKey], language);
      if (chapterLines) {
        const label =
          Locale.get('contextMemoryChapterLabel', language, { coords: chapKey }) ||
          `Bölüm ${chapKey} Belleği:`;
        sections.push(`### ${label}\n${chapterLines}`);
      }
    }

    if (sections.length === 0) {
      return '';
    }

    return `\n${titleText}\n=========================\n${introText}\n\n${sections.join('\n\n')}\n\n---\n`;
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private _sanitizeMemoryContent(content: any): void {
    if (!content) return;
    if (!Array.isArray(content.feedback)) content.feedback = [];
    if (!Array.isArray(content.style)) content.style = [];
    if (!Array.isArray(content.routines)) content.routines = [];
  }

  private _parseScopeArgs(scope: string): { type: 'global' | 'section' | 'chapter'; key?: string } {
    const cleaned = scope.trim().toLowerCase();

    if (cleaned === 'global' || cleaned === 'book') {
      return { type: 'global' };
    }

    if (cleaned.startsWith('section:')) {
      const key = cleaned.split(':')[1].trim();
      return { type: 'section', key };
    }

    if (cleaned.startsWith('chapter:')) {
      const key = cleaned.split(':')[1].trim();
      return { type: 'chapter', key };
    }

    // Coordinates check (e.g. 1.2)
    if (/^\d+\.\d+$/.test(cleaned)) {
      return { type: 'chapter', key: cleaned };
    }

    // Single section number (e.g. 1)
    if (/^\d+$/.test(cleaned)) {
      return { type: 'section', key: cleaned };
    }

    throw new Error(
      `Invalid memory scope: "${scope}". Supported: 'global', 'sectionNum', 'section:sectionNum', 'sectionNum.chapterNum', 'chapter:sectionNum.chapterNum'`
    );
  }

  private _resolveScope(scope: string): MemoryContent {
    const parsed = this._parseScopeArgs(scope);

    if (parsed.type === 'global') {
      return this.data.global;
    } else if (parsed.type === 'section') {
      const key = parsed.key!;
      if (!this.data.sections[key]) {
        this.data.sections[key] = emptyMemory();
      }
      return this.data.sections[key];
    } else {
      const key = parsed.key!;
      if (!this.data.chapters[key]) {
        this.data.chapters[key] = emptyMemory();
      }
      return this.data.chapters[key];
    }
  }

  private _formatMemoryContent(content: MemoryContent, language: string): string {
    const lines: string[] = [];

    const feedbackLabel =
      Locale.get('contextMemoryFeedbackLabel', language) || 'Geri Bildirimler & Düzeltmeler:';
    const styleLabel = Locale.get('contextMemoryStyleLabel', language) || 'Stil Kararları:';
    const routineLabel =
      Locale.get('contextMemoryRoutineLabel', language) || 'İş Akışı Rutinleri / Kurallar:';

    if (content.feedback.length > 0) {
      lines.push(`- **${feedbackLabel}**`);
      content.feedback.forEach((f) => lines.push(`  - ${f}`));
    }
    if (content.style.length > 0) {
      lines.push(`- **${styleLabel}**`);
      content.style.forEach((s) => lines.push(`  - ${s}`));
    }
    if (content.routines.length > 0) {
      lines.push(`- **${routineLabel}**`);
      content.routines.forEach((r) => lines.push(`  - ${r}`));
    }

    return lines.join('\n');
  }
}
