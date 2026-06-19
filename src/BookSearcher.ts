import { BookCompiler } from './BookCompiler';

export interface SearchResult {
  file: string;
  chapterTitle: string;
  lineNumber: number;
  lineContent: string;
}

export class BookSearcher {
  public compiler: BookCompiler;

  constructor(compiler: BookCompiler) {
    this.compiler = compiler;
  }

  /**
   * Searches the entire book for a specific query string.
   * Case-insensitive keyword search.
   * @param query
   * @returns SearchResult[]
   */
  public search(query: string): SearchResult[] {
    if (!query) return [];

    // Ensure files are loaded
    this.compiler.scanAndLoad();

    const results: SearchResult[] = [];
    const normalizedQuery = query.toLowerCase();

    this.compiler.sections.forEach((section) => {
      section.chapters.forEach((chapter) => {
        const lines = chapter.rawContent.split('\n');
        lines.forEach((line, idx) => {
          if (line.toLowerCase().includes(normalizedQuery)) {
            results.push({
              file: chapter.relativePath,
              chapterTitle: chapter.title,
              lineNumber: idx + 1,
              lineContent: line.trim()
            });
          }
        });
      });
    });

    return results;
  }
}
export default BookSearcher;
