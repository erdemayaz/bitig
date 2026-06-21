import * as fs from 'fs';
import * as path from 'path';
import { BookConfig } from './BookConfig';
import { Locale } from './Locale';

export class StyleManager {
  public themeName: string;
  public customCSS: string;
  public customCSSPath: string;

  constructor() {
    this.themeName = 'serif';
    this.customCSS = '';
    this.customCSSPath = '';
  }

  /**
   * Set a predefined theme.
   * @param themeName - Options: 'serif', 'sans-serif', 'academic'
   */
  public usePredefinedTheme(themeName: string): void {
    const validThemes = ['serif', 'sans-serif', 'academic'];
    if (validThemes.includes(themeName)) {
      this.themeName = themeName;
      this.customCSS = '';
      this.customCSSPath = '';
    } else {
      console.warn(`Warning: Theme "${themeName}" is not predefined. Defaulting to "serif".`);
      this.themeName = 'serif';
    }
  }

  /**
   * Loads custom CSS from a file path.
   * @param cssPath
   */
  public useCustomTheme(cssPath: string): void {
    if (!cssPath) return;

    const absolutePath = path.resolve(cssPath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Custom CSS file not found at: ${cssPath}`);
    }

    this.customCSSPath = absolutePath;
    this.customCSS = fs.readFileSync(absolutePath, 'utf8').trim();
  }

  /**
   * Get raw CSS code for the active theme.
   * @returns string
   */
  public getCSS(): string {
    if (this.customCSS) {
      return this.customCSS;
    }

    switch (this.themeName) {
      case 'sans-serif':
        return this._getSansSerifCSS();
      case 'academic':
        return this._getAcademicCSS();
      case 'serif':
      default:
        return this._getSerifCSS();
    }
  }

  /**
   * Get CSS code wrapped in a <style> tag.
   * @returns string
   */
  public getStyleBlock(): string {
    return `<style>\n${this.getCSS()}\n</style>`;
  }

  /**
   * Generates HTML for the cover page.
   * @param config
   * @returns string
   */
  public generateCoverPage(config: BookConfig): string {
    return `
<div class="cover-page">
  <h1 class="cover-title">${config.title.toUpperCase()}</h1>
  ${config.subtitle ? `<h2 class="cover-subtitle">${config.subtitle}</h2>` : ''}
  <p class="cover-author">${config.author}</p>
  ${config.description ? `<p class="cover-description">${config.description}</p>` : ''}
</div>

<div class="page-break"></div>
`;
  }

  /**
   * Generates HTML for the copyright page.
   * @param config
   * @returns string
   */
  public generateCopyrightPage(config: BookConfig): string {
    const title = config.title;
    const author = config.author;
    const lang = config.language;

    const pageTitle = Locale.get('copyrightPageTitle', lang);
    const publisherLabel = Locale.get('copyrightPublisherLabel', lang);
    const publishedLabel = Locale.get('copyrightPublishedLabel', lang);
    const isbnLabel = Locale.get('copyrightIsbnLabel', lang);
    const noticeText = Locale.get('copyrightNoticeText', lang);

    const year = new Date().getFullYear();
    const copyrightStatement = config.copyright || `© ${year} ${author}. ${noticeText}`;

    let publisherBlock = '';
    if (config.publisher) {
      publisherBlock = `<p class="copyright-publisher"><strong>${publisherLabel}:</strong> ${config.publisher}</p>`;
    }

    let publishedBlock = '';
    if (config.publishDate) {
      publishedBlock = `<p class="copyright-date"><strong>${publishedLabel}:</strong> ${config.publishDate}</p>`;
    }

    let isbnBlock = '';
    if (config.isbn) {
      isbnBlock = `<p class="copyright-isbn"><strong>${isbnLabel}:</strong> ${config.isbn}</p>`;
    }

    return `
<div class="copyright-page">
  <div class="copyright-header">
    <h2 class="copyright-page-title">${pageTitle}</h2>
    <p class="copyright-book-title">${title}</p>
    ${config.subtitle ? `<p class="copyright-book-subtitle">${config.subtitle}</p>` : ''}
    <p class="copyright-book-author">${author}</p>
  </div>
  
  <div class="copyright-details">
    <p class="copyright-statement">${copyrightStatement}</p>
    ${publisherBlock}
    ${publishedBlock}
    ${isbnBlock}
  </div>
</div>

<div class="page-break"></div>
`;
  }

  /**
   * Predefined Serif Theme (Montserrat + Merriweather)
   */
  private _getSerifCSS(): string {
    return `
  @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Montserrat:wght@400;500;700&display=swap');
  
  @page {
    size: A4;
    margin: 2.5cm 2.5cm 2.5cm 2.5cm;
    @bottom-center {
      content: counter(page);
      font-family: 'Montserrat', sans-serif;
      font-size: 9pt;
      color: #7f8c8d;
    }
  }
  
  @page cover-page-layout {
    margin-top: 0;
    margin-bottom: 0;
    @bottom-center {
      content: none;
    }
  }

  @page toc-page-layout {
    @bottom-center {
      content: none;
    }
  }
  
  body {
    font-family: 'Merriweather', Georgia, serif;
    font-size: 11pt;
    line-height: 1.65;
    color: #2c3e50;
    background-color: #ffffff;
  }
  
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Montserrat', sans-serif;
    color: #1a252f;
    font-weight: 700;
    page-break-after: avoid;
    break-after: avoid;
  }
  
  h1 {
    font-size: 26pt;
    text-align: center;
    margin-top: 5cm;
    margin-bottom: 2cm;
    page-break-before: always;
    break-before: page;
    letter-spacing: 2px;
  }
  
  h2 {
    font-size: 18pt;
    margin-top: 1.8cm;
    margin-bottom: 0.8cm;
    border-bottom: 2px solid #34495e;
    padding-bottom: 0.3cm;
  }
  
  h3 {
    font-size: 13pt;
    margin-top: 1.2cm;
    margin-bottom: 0.6cm;
    color: #34495e;
  }
  
  .page-break {
    page-break-before: always;
    break-before: page;
  }
  
  .cover-page {
    page: cover-page-layout;
    text-align: center;
    padding: 2cm !important;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
  }
  
  .cover-title {
    font-size: 40pt;
    font-weight: 700;
    color: #2c3e50;
    margin-bottom: 0.5cm;
    letter-spacing: 5px;
    page-break-before: avoid !important;
    break-before: avoid !important;
  }
  
  .cover-subtitle {
    font-size: 18pt;
    font-weight: 400;
    color: #7f8c8d;
    margin-bottom: 1cm;
    border-bottom: none !important;
    padding-bottom: 0;
  }
  
  .cover-author {
    font-family: 'Montserrat', sans-serif;
    font-size: 16pt;
    font-weight: 500;
    color: #2c3e50;
    margin-bottom: 1.5cm;
    letter-spacing: 3px;
  }
  
  .cover-description {
    font-size: 12pt;
    font-style: italic;
    color: #7f8c8d;
    max-width: 14cm;
    line-height: 1.6;
    margin: 0 auto;
  }
  
  blockquote {
    font-family: 'Merriweather', serif;
    font-style: italic;
    background-color: #f8f9fa;
    border-left: 4px solid #2c3e50;
    padding: 15px 25px;
    margin: 2em 0;
    color: #34495e;
    line-height: 1.7;
    border-radius: 0 8px 8px 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  .mermaid {
    margin: 2.5em auto;
    display: block;
    text-align: center !important;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  ul, ol {
    margin-bottom: 1.2em;
    padding-left: 2em;
  }
  
  li {
    margin-bottom: 0.5em;
  }
  
  p {
    margin-bottom: 1.2em;
    text-align: justify;
    orphans: 3;
    widows: 3;
  }
  
  .toc-page {
    page: toc-page-layout;
    page-break-before: always;
    break-before: page;
    padding-top: 2cm;
    box-sizing: border-box;
  }
  
  .toc-heading {
    font-size: 22pt;
    text-align: center;
    margin-bottom: 1.5cm;
    letter-spacing: 3px;
    color: #2c3e50;
  }
  
  .toc-container {
    max-width: 16cm;
    margin: 0 auto;
  }
  
  .toc-section {
    margin-bottom: 1cm;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  .toc-section-title {
    font-family: 'Montserrat', sans-serif;
    font-size: 13pt;
    font-weight: 700;
    color: #2c3e50;
    border-bottom: 1.5px solid #34495e;
    padding-bottom: 0.1cm;
    margin-bottom: 0.3cm;
  }
  
  .toc-section-title a {
    text-decoration: none;
    color: #2c3e50;
  }
  
  .toc-chapters {
    list-style: none;
    padding-left: 0.5em;
    margin-bottom: 0;
  }
  
  .toc-chapters li {
    font-family: 'Merriweather', serif;
    font-size: 10.5pt;
    margin-bottom: 0.25cm;
    line-height: 1.4;
  }
  
  .toc-chapters li a {
    text-decoration: none;
    color: #34495e;
  }
  
  .toc-chapters li a:hover {
    color: #1a252f;
    text-decoration: underline;
  }

  @page copyright-page-layout {
    @bottom-center {
      content: none;
    }
  }
  
  .copyright-page {
    page: copyright-page-layout;
    font-family: 'Montserrat', sans-serif;
    font-size: 10pt;
    color: #7f8c8d;
    text-align: left;
    max-width: 14cm;
    margin: 5cm auto 0 auto;
    line-height: 1.6;
    box-sizing: border-box;
    page-break-before: always;
    break-before: page;
  }
  .copyright-page-title {
    font-family: 'Montserrat', sans-serif;
    font-size: 14pt;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 1cm;
    color: #2c3e50;
    border-bottom: none !important;
    padding-bottom: 0;
    text-align: left;
  }
  .copyright-book-title {
    font-weight: 700;
    margin-bottom: 0.1cm;
  }
  .copyright-book-subtitle {
    font-style: italic;
    margin-bottom: 0.2cm;
  }
  .copyright-book-author {
    margin-bottom: 1cm;
  }
  .copyright-details {
    font-size: 9.5pt;
    border-top: 1px solid #bdc3c7;
    padding-top: 0.5cm;
  }
  .copyright-statement {
    margin-bottom: 0.5cm;
  }
`;
  }

  /**
   * Predefined Sans-Serif Theme (Outfit + Inter)
   */
  private _getSansSerifCSS(): string {
    return `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Outfit:wght@400;500;700&display=swap');
  
  @page {
    size: A4;
    margin: 2.5cm 2.5cm 2.5cm 2.5cm;
    @bottom-center {
      content: counter(page);
      font-family: 'Outfit', sans-serif;
      font-size: 9pt;
      color: #94a3b8;
    }
  }
  
  @page cover-page-layout {
    margin-top: 0;
    margin-bottom: 0;
    @bottom-center {
      content: none;
    }
  }

  @page toc-page-layout {
    @bottom-center {
      content: none;
    }
  }
  
  body {
    font-family: 'Inter', sans-serif;
    font-size: 10.5pt;
    line-height: 1.6;
    color: #1e293b;
    background-color: #ffffff;
  }
  
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Outfit', sans-serif;
    color: #0f172a;
    font-weight: 700;
    page-break-after: avoid;
    break-after: avoid;
  }
  
  h1 {
    font-size: 28pt;
    text-align: center;
    margin-top: 5cm;
    margin-bottom: 2cm;
    page-break-before: always;
    break-before: page;
    letter-spacing: 1px;
  }
  
  h2 {
    font-size: 18pt;
    margin-top: 1.8cm;
    margin-bottom: 0.8cm;
    border-bottom: 2px solid #cbd5e1;
    padding-bottom: 0.3cm;
  }
  
  h3 {
    font-size: 13pt;
    margin-top: 1.2cm;
    margin-bottom: 0.6cm;
    color: #334155;
  }
  
  .page-break {
    page-break-before: always;
    break-before: page;
  }
  
  .cover-page {
    page: cover-page-layout;
    text-align: center;
    padding: 2cm !important;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
  }
  
  .cover-title {
    font-size: 42pt;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 0.5cm;
    letter-spacing: 3px;
    page-break-before: avoid !important;
    break-before: avoid !important;
  }
  
  .cover-subtitle {
    font-size: 18pt;
    font-weight: 400;
    color: #64748b;
    margin-bottom: 1cm;
    border-bottom: none !important;
    padding-bottom: 0;
  }
  
  .cover-author {
    font-family: 'Outfit', sans-serif;
    font-size: 16pt;
    font-weight: 500;
    color: #0f172a;
    margin-bottom: 1.5cm;
    letter-spacing: 2px;
  }
  
  .cover-description {
    font-size: 12pt;
    color: #64748b;
    max-width: 14cm;
    line-height: 1.6;
    margin: 0 auto;
  }
  
  blockquote {
    font-family: 'Inter', sans-serif;
    font-style: normal;
    background-color: #f1f5f9;
    border-left: 4px solid #3b82f6;
    padding: 15px 25px;
    margin: 2em 0;
    color: #334155;
    line-height: 1.6;
    border-radius: 4px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  .mermaid {
    margin: 2.5em auto;
    display: block;
    text-align: center !important;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  ul, ol {
    margin-bottom: 1.2em;
    padding-left: 2em;
  }
  
  li {
    margin-bottom: 0.5em;
  }
  
  p {
    margin-bottom: 1.2em;
    text-align: justify;
    orphans: 3;
    widows: 3;
  }
  
  .toc-page {
    page: toc-page-layout;
    page-break-before: always;
    break-before: page;
    padding-top: 2cm;
    box-sizing: border-box;
  }
  
  .toc-heading {
    font-size: 24pt;
    text-align: center;
    margin-bottom: 1.5cm;
    letter-spacing: 2px;
    color: #0f172a;
  }
  
  .toc-container {
    max-width: 16cm;
    margin: 0 auto;
  }
  
  .toc-section {
    margin-bottom: 1cm;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  .toc-section-title {
    font-family: 'Outfit', sans-serif;
    font-size: 13pt;
    font-weight: 700;
    color: #0f172a;
    border-bottom: 1.5px solid #cbd5e1;
    padding-bottom: 0.1cm;
    margin-bottom: 0.3cm;
  }
  
  .toc-section-title a {
    text-decoration: none;
    color: #0f172a;
  }
  
  .toc-chapters {
    list-style: none;
    padding-left: 0.5em;
    margin-bottom: 0;
  }
  
  .toc-chapters li {
    font-family: 'Inter', sans-serif;
    font-size: 10.5pt;
    margin-bottom: 0.25cm;
    line-height: 1.4;
  }
  
  .toc-chapters li a {
    text-decoration: none;
    color: #475569;
  }
  
  .toc-chapters li a:hover {
    color: #0f172a;
    text-decoration: underline;
  }

  @page copyright-page-layout {
    @bottom-center {
      content: none;
    }
  }
  
  .copyright-page {
    page: copyright-page-layout;
    font-family: 'Outfit', sans-serif;
    font-size: 10pt;
    color: #64748b;
    text-align: left;
    max-width: 14cm;
    margin: 5cm auto 0 auto;
    line-height: 1.6;
    box-sizing: border-box;
    page-break-before: always;
    break-before: page;
  }
  .copyright-page-title {
    font-family: 'Outfit', sans-serif;
    font-size: 14pt;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 1cm;
    color: #0f172a;
    border-bottom: none !important;
    padding-bottom: 0;
    text-align: left;
  }
  .copyright-book-title {
    font-weight: 700;
    margin-bottom: 0.1cm;
  }
  .copyright-book-subtitle {
    font-style: italic;
    margin-bottom: 0.2cm;
  }
  .copyright-book-author {
    margin-bottom: 1cm;
  }
  .copyright-details {
    font-size: 9.5pt;
    border-top: 1px solid #e2e8f0;
    padding-top: 0.5cm;
  }
  .copyright-statement {
    margin-bottom: 0.5cm;
  }
`;
  }

  /**
   * Predefined Academic Theme (Classical Serif style)
   */
  private _getAcademicCSS(): string {
    return `
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,400&display=swap');
  
  @page {
    size: A4;
    margin: 3cm 3cm 3cm 3cm;
    @bottom-center {
      content: "- " counter(page) " -";
      font-family: 'EB Garamond', serif;
      font-size: 10pt;
      color: #000000;
    }
  }
  
  @page cover-page-layout {
    margin-top: 0;
    margin-bottom: 0;
    @bottom-center {
      content: none;
    }
  }

  @page toc-page-layout {
    @bottom-center {
      content: none;
    }
  }
  
  body {
    font-family: 'EB Garamond', Times, serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #000000;
    background-color: #ffffff;
  }
  
  h1, h2, h3, h4, h5, h6 {
    font-family: 'EB Garamond', serif;
    color: #000000;
    font-weight: 700;
    page-break-after: avoid;
    break-after: avoid;
  }
  
  h1 {
    font-size: 24pt;
    text-align: center;
    margin-top: 6cm;
    margin-bottom: 2cm;
    page-break-before: always;
    break-before: page;
  }
  
  h2 {
    font-size: 16pt;
    margin-top: 2cm;
    margin-bottom: 1cm;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 1px;
    border-bottom: 1px solid #000000;
    padding-bottom: 0.2cm;
  }
  
  h3 {
    font-size: 13pt;
    font-style: italic;
    margin-top: 1.5cm;
    margin-bottom: 0.8cm;
  }
  
  .page-break {
    page-break-before: always;
    break-before: page;
  }
  
  .cover-page {
    page: cover-page-layout;
    text-align: center;
    padding: 2cm !important;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
  }
  
  .cover-title {
    font-size: 36pt;
    font-weight: 700;
    color: #000000;
    margin-bottom: 0.5cm;
    letter-spacing: 2px;
    page-break-before: avoid !important;
    break-before: avoid !important;
  }
  
  .cover-subtitle {
    font-size: 16pt;
    font-weight: 400;
    font-style: italic;
    color: #333333;
    margin-bottom: 1.5cm;
    border-bottom: none !important;
    padding-bottom: 0;
  }
  
  .cover-author {
    font-size: 14pt;
    font-weight: 700;
    color: #000000;
    margin-bottom: 2cm;
    letter-spacing: 1px;
  }
  
  .cover-description {
    font-size: 11pt;
    color: #333333;
    max-width: 12cm;
    line-height: 1.5;
    margin: 0 auto;
  }
  
  blockquote {
    font-family: 'EB Garamond', serif;
    font-style: italic;
    padding: 0 0 0 1.5cm;
    margin: 1.5em 0;
    color: #000000;
    line-height: 1.5;
    border-left: none;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  .mermaid {
    margin: 2.5em auto;
    display: block;
    text-align: center !important;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  ul, ol {
    margin-bottom: 1.2em;
    padding-left: 2em;
  }
  
  li {
    margin-bottom: 0.5em;
  }
  
  p {
    margin-bottom: 1.2em;
    text-align: justify;
    text-indent: 1cm;
    orphans: 3;
    widows: 3;
  }
  
  p:first-of-type {
    text-indent: 0;
  }
  
  .toc-page {
    page: toc-page-layout;
    page-break-before: always;
    break-before: page;
    padding-top: 2cm;
    box-sizing: border-box;
  }
  
  .toc-heading {
    font-size: 20pt;
    text-align: center;
    margin-bottom: 2cm;
    letter-spacing: 2px;
    color: #000000;
    text-transform: uppercase;
  }
  
  .toc-container {
    max-width: 14cm;
    margin: 0 auto;
  }
  
  .toc-section {
    margin-bottom: 1cm;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  .toc-section-title {
    font-size: 12pt;
    font-weight: 700;
    color: #000000;
    border-bottom: 1px solid #000000;
    padding-bottom: 0.1cm;
    margin-bottom: 0.3cm;
    text-transform: uppercase;
  }
  
  .toc-section-title a {
    text-decoration: none;
    color: #000000;
  }
  
  .toc-chapters {
    list-style: none;
    padding-left: 0.5em;
    margin-bottom: 0;
  }
  
  .toc-chapters li {
    font-size: 11pt;
    margin-bottom: 0.25cm;
    line-height: 1.4;
  }
  
  .toc-chapters li a {
    text-decoration: none;
    color: #000000;
  }
  
  .toc-chapters li a:hover {
    text-decoration: underline;
  }

  @page copyright-page-layout {
    @bottom-center {
      content: none;
    }
  }
  
  .copyright-page {
    page: copyright-page-layout;
    font-family: 'EB Garamond', serif;
    font-size: 11pt;
    color: #000000;
    text-align: left;
    max-width: 14cm;
    margin: 5cm auto 0 auto;
    line-height: 1.6;
    box-sizing: border-box;
    page-break-before: always;
    break-before: page;
  }
  .copyright-page-title {
    font-family: 'EB Garamond', serif;
    font-size: 14pt;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 1cm;
    color: #000000;
    border-bottom: none !important;
    padding-bottom: 0;
    text-align: left;
  }
  .copyright-book-title {
    font-weight: 700;
    margin-bottom: 0.1cm;
  }
  .copyright-book-subtitle {
    font-style: italic;
    margin-bottom: 0.2cm;
  }
  .copyright-book-author {
    margin-bottom: 1cm;
  }
  .copyright-details {
    font-size: 10.5pt;
    border-top: 1px solid #000000;
    padding-top: 0.5cm;
  }
  .copyright-statement {
    margin-bottom: 0.5cm;
  }
`;
  }
}
