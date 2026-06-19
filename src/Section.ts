import { Chapter } from './Chapter';

export class Section {
  public sectionNum: number;
  public title: string;
  public chapters: Chapter[];

  constructor(sectionNum: number, title?: string) {
    this.sectionNum = sectionNum;
    this.title = title || `Section ${sectionNum}`;
    this.chapters = [];
  }

  /**
   * Adds a chapter to the section.
   * @param chapter
   */
  public addChapter(chapter: Chapter): void {
    this.chapters.push(chapter);
  }

  /**
   * Sorts chapters in this section by their chapterNum.
   */
  public sortChapters(): void {
    this.chapters.sort((a, b) => {
      if (a.chapterNum !== b.chapterNum) {
        return a.chapterNum - b.chapterNum;
      }
      return a.filePath.localeCompare(b.filePath);
    });
  }
}
export default Section;
