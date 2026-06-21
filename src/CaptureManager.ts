import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { BookConfig } from './BookConfig';
import { CaptureOptions } from './types';
import { Locale } from './Locale';
import { BookCompiler } from './BookCompiler';
import { EpubCompiler } from './EpubCompiler';

export class CaptureManager {
  private config: BookConfig;
  private configPath: string;

  constructor(config: BookConfig, configPath: string) {
    this.config = config;
    this.configPath = configPath;
  }

  /**
   * Generates screenshots of pages or HTML sections as specified.
   */
  public async capture(options: CaptureOptions): Promise<void> {
    const pdfPath = path.join(
      this.config.distDir,
      this.config.outputFilename.replace(/\.md$/, '.pdf')
    );
    const htmlPath = path.join(
      this.config.distDir,
      this.config.outputFilename.replace(/\.md$/, '.html')
    );

    const isPdfCapture =
      options.page !== undefined ||
      options.range !== undefined ||
      (options.coords === undefined &&
        options.selector === undefined &&
        options.epubChapter === undefined);

    // Auto-build if outputs are missing
    if (isPdfCapture && (!fs.existsSync(pdfPath) || !this.config.pdf)) {
      // Temporarily enable PDF output for compilation if it's disabled in config
      const originalPdf = this.config.pdf;
      this.config.pdf = true;
      try {
        const compiler = new BookCompiler(this.config);
        compiler.scanAndLoad();
        await compiler.writeOutputs();
      } finally {
        this.config.pdf = originalPdf;
      }
    } else if (!isPdfCapture && !fs.existsSync(htmlPath) && !options.epubChapter) {
      const compiler = new BookCompiler(this.config);
      compiler.scanAndLoad();
      await compiler.writeOutputs();
    }

    const outputDir = options.outputDir || path.join(this.config.distDir, 'screenshots');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(Locale.get('captureStarting', this.config.language));

    let browser = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
      });
      const page = await browser.newPage();
      page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
      page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

      if (isPdfCapture) {
        // PDF-based capture using browser-side PDF.js
        const pdfBuffer = fs.readFileSync(pdfPath);
        const pdfBase64 = pdfBuffer.toString('base64');

        // Set blank content
        await page.setContent(
          '<html><head><style>body { margin: 0; padding: 0; background: #f0f0f0; }</style></head><body></body></html>'
        );

        // Load PDF.js scripts from CDN
        await page.addScriptTag({
          url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js'
        });
        await page.addScriptTag({
          url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js'
        });

        // Parse page numbers to capture
        const pagesToCapture: number[] = [];
        if (options.range) {
          const parts = options.range.split('-');
          const start = parseInt(parts[0], 10);
          const end = parseInt(parts[1], 10);
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = start; i <= end; i++) {
              pagesToCapture.push(i);
            }
          }
        } else {
          pagesToCapture.push(options.page || 1);
        }

        for (const pageNum of pagesToCapture) {
          // Clear any existing canvases
          await page.evaluate(() => {
            const oldCanvas = document.getElementById('pdf-canvas');
            if (oldCanvas) oldCanvas.remove();
          });

          // Render via PDF.js
          const renderResult = await page.evaluate(
            async (pdfDataB64, num) => {
              const bin = atob(pdfDataB64);
              const len = bin.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = bin.charCodeAt(i);
              }

              const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
              pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

              const loadingTask = pdfjsLib.getDocument({ data: bytes });
              const pdf = await loadingTask.promise;

              if (num < 1 || num > pdf.numPages) {
                return {
                  success: false,
                  error: `Page ${num} is out of bounds. Total pages: ${pdf.numPages}`
                };
              }

              const pdfPage = await pdf.getPage(num);
              const viewport = pdfPage.getViewport({ scale: 2.0 }); // High-quality scale

              const canvas = document.createElement('canvas');
              canvas.id = 'pdf-canvas';
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              document.body.appendChild(canvas);

              const context = canvas.getContext('2d');
              await pdfPage.render({
                canvasContext: context,
                viewport: viewport
              }).promise;

              return { success: true };
            },
            pdfBase64,
            pageNum
          );

          if (!renderResult.success) {
            console.warn(Locale.get('captureInvalidPage', this.config.language, { page: pageNum }));
            continue;
          }

          const canvasEl = await page.$('#pdf-canvas');
          if (canvasEl) {
            const destPath = path.join(outputDir, `page-${pageNum}.png`);
            await canvasEl.screenshot({ path: destPath });
            console.log(Locale.get('captureSaved', this.config.language, { path: destPath }));
          }
        }
      } else {
        // HTML-based selector or coords capture
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        let selector = '';
        let fileSuffix = '';

        if (options.coords) {
          selector = `.chapter-container[data-coords="${options.coords}"]`;
          fileSuffix = `coords-${options.coords}`;
        } else if (options.selector) {
          selector = options.selector;
          fileSuffix = `selector-${options.selector.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
        }

        const element = await page.$(selector);
        if (!element) {
          throw new Error(`Element not found for selector: ${selector}`);
        }

        const destPath = path.join(outputDir, `${fileSuffix}.png`);
        await element.screenshot({ path: destPath });
        console.log(Locale.get('captureSaved', this.config.language, { path: destPath }));
      }
    } catch (err: any) {
      throw new Error(Locale.get('captureFailed', this.config.language, { error: err.message }));
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Captures a screenshot of a specific EPUB chapter rendered in a headless browser.
   * The chapter XHTML is generated on-the-fly by EpubCompiler and fed directly to
   * Puppeteer via setContent() — no disk-based .epub file is required.
   * @param coords  Chapter coordinates in "sectionNum.chapterNum" format (e.g. "1.2")
   * @param outputDir  Directory to save the PNG screenshot
   */
  public async captureEpubChapter(coords: string, outputDir: string): Promise<void> {
    const parts = coords.split('.');
    if (parts.length < 2) {
      throw new Error(`Invalid EPUB chapter coordinates: "${coords}". Expected format: "1.2"`);
    }
    const sectionNum = parseInt(parts[0], 10);
    const chapterNum = parseInt(parts[1], 10);
    if (isNaN(sectionNum) || isNaN(chapterNum)) {
      throw new Error(`Invalid EPUB chapter coordinates: "${coords}". Must be numeric.`);
    }

    console.log(Locale.get('captureEpubChapter', this.config.language, { coords }));

    // Scan and load book structure to feed EpubCompiler
    const compiler = new BookCompiler(this.config);
    compiler.scanAndLoad();

    const epubCompiler = new EpubCompiler(this.config, compiler.sections, compiler.styleManager);

    // Render chapter XHTML string (no disk I/O for the EPUB itself)
    const xhtmlContent = epubCompiler.renderChapterXhtml(sectionNum, chapterNum);

    // Resolve resource directory (check both src/resources and dist/resources)
    const possiblePaths = [
      path.join(__dirname, 'resources'),
      path.join(__dirname, '../src/resources'),
      path.join(__dirname, '../resources')
    ];
    let resourceDir = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        resourceDir = p;
        break;
      }
    }

    let processedXhtml = xhtmlContent;

    // Inline book.css (since the CSS contains fonts and layout styles)
    const bookCss = compiler.styleManager.getEpubCSS();
    processedXhtml = processedXhtml.replace(
      /<link[^>]*href="[^"]*book\.css"[^>]*\/?>/gi,
      () => `<style type="text/css">${bookCss}</style>`
    );

    // Inline KaTeX CSS and JS if local resources exist
    if (resourceDir) {
      const katexCssPath = path.join(resourceDir, 'katex.min.css');
      const katexJsPath = path.join(resourceDir, 'katex.min.js');
      const autoRenderJsPath = path.join(resourceDir, 'auto-render.min.js');

      if (
        fs.existsSync(katexCssPath) &&
        fs.existsSync(katexJsPath) &&
        fs.existsSync(autoRenderJsPath)
      ) {
        const katexCss = fs.readFileSync(katexCssPath, 'utf8');
        const katexJs = fs.readFileSync(katexJsPath, 'utf8');
        const autoRenderJs = fs.readFileSync(autoRenderJsPath, 'utf8');

        processedXhtml = processedXhtml
          .replace(
            /<link[^>]*href="[^"]*katex\.min\.css"[^>]*\/?>/gi,
            () => `<style type="text/css">${katexCss}</style>`
          )
          .replace(
            /<script[^>]*src="[^"]*katex\.min\.js"[^>]*><\/script>/gi,
            () => `<script type="text/javascript">${katexJs}</script>`
          )
          .replace(
            /<script[^>]*src="[^"]*auto-render\.min\.js"[^>]*><\/script>/gi,
            () => `<script type="text/javascript">${autoRenderJs}</script>`
          );
      }
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let browser = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(processedXhtml, { waitUntil: 'networkidle0' });

      const destPath = path.join(outputDir, `epub-chapter-${coords.replace('.', '-')}.png`);
      await page.screenshot({ path: destPath, fullPage: true });
      console.log(Locale.get('captureSaved', this.config.language, { path: destPath }));
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
export default CaptureManager;
