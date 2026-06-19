import puppeteer from 'puppeteer';
import * as path from 'path';

export class PdfCompiler {
  /**
   * Compiles HTML content to PDF using Puppeteer.
   * Sets zero margins in print options to allow custom CSS @page rules to govern layout.
   * @param htmlContent - Full HTML document as string (with inline styles).
   * @param outputPath - Destination PDF filepath.
   * @returns Promise<string>
   */
  public async compileToPdf(htmlContent: string, outputPath: string): Promise<string> {
    const absoluteOutputPath = path.resolve(outputPath);
    let browser = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
      });

      const page = await browser.newPage();

      // Set the content of the page
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0' // waits for @import fonts and stylesheets to load
      });

      // Render the PDF
      await page.pdf({
        path: absoluteOutputPath,
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true, // Crucial for CSS @page size to be respected
        margin: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        }
      });

      return absoluteOutputPath;
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to compile PDF via Puppeteer: ${err.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
export default PdfCompiler;
