import { CitationCompiledRule } from './types';

export class TextProcessor {
  /**
   * Shifts markdown header levels down by one level.
   * e.g., "# Header" -> "## Header"
   * Safely ignores any text inside markdown code blocks.
   * @param content
   * @returns string
   */
  public static shiftHeaders(content: string): string {
    if (!content) return '';

    let inCodeBlock = false;
    return content
      .split('\n')
      .map((line: string): string => {
        if (line.trim().startsWith('```')) {
          inCodeBlock = !inCodeBlock;
          return line;
        }
        if (inCodeBlock) {
          return line;
        }
        if (line.startsWith('# ')) return '## ' + line.slice(2);
        if (line.startsWith('## ')) return '### ' + line.slice(3);
        if (line.startsWith('### ')) return '#### ' + line.slice(4);
        if (line.startsWith('#### ')) return '##### ' + line.slice(5);
        return line;
      })
      .join('\n');
  }

  /**
   * Applies citation replacement rules to the content.
   * @param content
   * @param rules
   * @returns string
   */
  public static applyCitations(content: string, rules: CitationCompiledRule[]): string {
    if (!content || !Array.isArray(rules) || rules.length === 0) {
      return content;
    }

    let processedContent = content;
    for (const rule of rules) {
      if (rule && rule.term && typeof rule.replacement === 'string') {
        processedContent = processedContent.replace(rule.term, rule.replacement);
      }
    }
    return processedContent;
  }

  /**
   * Converts a heading string into a URL-friendly slug.
   * Handles Turkish character mapping appropriately.
   * @param text
   * @returns string
   */
  public static slugify(text: string): string {
    if (!text) return '';

    const trMap: { [key: string]: string } = {
      ç: 'c',
      ğ: 'g',
      ı: 'i',
      ö: 'o',
      ş: 's',
      ü: 'u',
      Ç: 'c',
      Ğ: 'g',
      İ: 'i',
      Ö: 'o',
      Ş: 's',
      Ü: 'u'
    };

    const slug = text
      .split('')
      .map((c: string): string => trMap[c] || c)
      .join('');
    return slug
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-');
  }
}
