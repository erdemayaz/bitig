import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { CaptureManager } from '../src/CaptureManager';
import { BookConfig } from '../src/BookConfig';

jest.mock('puppeteer');

const testDir = path.resolve(__dirname, 'temp-capture-test');

describe('CaptureManager', () => {
  let config: BookConfig;
  const configPath = path.join(testDir, 'book.json');
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  beforeAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    const bookJson = {
      title: 'Capture Test',
      assetsDir: './assets',
      distDir: './dist',
      outputFilename: 'book.md',
      pdf: true,
      language: 'en'
    };
    fs.writeFileSync(configPath, JSON.stringify(bookJson, null, 2), 'utf8');
    config = BookConfig.loadFromFile(configPath);
    // Adjust absolute paths to the temp directory
    config.distDir = path.join(testDir, 'dist');
    config.assetsDir = path.join(testDir, 'assets');
    fs.mkdirSync(config.distDir, { recursive: true });
    fs.mkdirSync(config.assetsDir, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // Helper to create mocked puppeteer browser/page flow
  function setupMockPuppeteer(mockElement: any, extraPageOverrides = {}) {
    const mockPage = {
      on: jest.fn().mockReturnValue(undefined),
      setContent: jest.fn().mockResolvedValue(undefined),
      addScriptTag: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockImplementation((fn, ...args) => {
        if (fn && fn.toString().includes('getDocument')) {
          return { success: true };
        }
        return undefined;
      }),
      $: jest.fn().mockResolvedValue(mockElement),
      pdf: jest.fn().mockImplementation((opts: any) => {
        if (opts && opts.path) {
          fs.writeFileSync(opts.path, 'pdf data');
        }
        return Promise.resolve(Buffer.from('pdf data'));
      }),
      ...extraPageOverrides
    };
    const mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined)
    };
    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);
    return { mockBrowser, mockPage };
  }

  it('should capture a specific HTML coordinate', async () => {
    const htmlPath = path.join(config.distDir, 'book.html');
    fs.writeFileSync(
      htmlPath,
      '<html><body><div class="chapter-container" data-coords="1.1">Intro</div></body></html>',
      'utf8'
    );

    const mockElement = {
      screenshot: jest.fn().mockImplementation((opts: any) => {
        if (opts && opts.path) {
          fs.writeFileSync(opts.path, 'png data');
        }
        return Promise.resolve(Buffer.from('png data'));
      })
    };

    const { mockBrowser, mockPage } = setupMockPuppeteer(mockElement);

    const manager = new CaptureManager(config, configPath);
    await manager.capture({ coords: '1.1' });

    expect(mockPage.setContent).toHaveBeenCalledWith(
      expect.stringContaining('Intro'),
      expect.objectContaining({ waitUntil: 'networkidle0' })
    );
    expect(mockPage.$).toHaveBeenCalledWith('.chapter-container[data-coords="1.1"]');
    expect(mockElement.screenshot).toHaveBeenCalled();
    expect(mockBrowser.close).toHaveBeenCalled();

    const expectedScreenshot = path.join(config.distDir, 'screenshots', 'coords-1.1.png');
    expect(fs.existsSync(expectedScreenshot)).toBe(true);
  });

  it('should capture a specific CSS selector', async () => {
    const htmlPath = path.join(config.distDir, 'book.html');
    fs.writeFileSync(
      htmlPath,
      '<html><body><div class="custom-class">Custom</div></body></html>',
      'utf8'
    );

    const mockElement = {
      screenshot: jest.fn().mockImplementation((opts: any) => {
        if (opts && opts.path) {
          fs.writeFileSync(opts.path, 'png data');
        }
        return Promise.resolve(Buffer.from('png data'));
      })
    };

    const { mockPage } = setupMockPuppeteer(mockElement);

    const manager = new CaptureManager(config, configPath);
    await manager.capture({ selector: '.custom-class' });

    expect(mockPage.$).toHaveBeenCalledWith('.custom-class');
    expect(mockElement.screenshot).toHaveBeenCalled();

    const expectedScreenshot = path.join(
      config.distDir,
      'screenshots',
      'selector-_custom-class.png'
    );
    expect(fs.existsSync(expectedScreenshot)).toBe(true);
  });

  it('should capture PDF page using browser-side PDF.js render', async () => {
    const pdfPath = path.join(config.distDir, 'book.pdf');
    fs.writeFileSync(pdfPath, 'mock-pdf-binary-content', 'utf8');

    const mockElement = {
      screenshot: jest.fn().mockImplementation((opts: any) => {
        if (opts && opts.path) {
          fs.writeFileSync(opts.path, 'png data');
        }
        return Promise.resolve(Buffer.from('png data'));
      })
    };

    const { mockPage } = setupMockPuppeteer(mockElement);

    const manager = new CaptureManager(config, configPath);
    await manager.capture({ page: 1 });

    expect(mockPage.setContent).toHaveBeenCalledWith(expect.stringContaining('html'));
    expect(mockPage.addScriptTag).toHaveBeenCalledTimes(2);
    expect(mockPage.$).toHaveBeenCalledWith('#pdf-canvas');
    expect(mockElement.screenshot).toHaveBeenCalled();

    const expectedScreenshot = path.join(config.distDir, 'screenshots', 'page-1.png');
    expect(fs.existsSync(expectedScreenshot)).toBe(true);
  });

  it('should capture PDF page range', async () => {
    const pdfPath = path.join(config.distDir, 'book.pdf');
    fs.writeFileSync(pdfPath, 'mock-pdf-binary-content', 'utf8');

    const mockElement = {
      screenshot: jest.fn().mockImplementation((opts: any) => {
        if (opts && opts.path) {
          fs.writeFileSync(opts.path, 'png data');
        }
        return Promise.resolve(Buffer.from('png data'));
      })
    };

    const { mockPage } = setupMockPuppeteer(mockElement);

    const manager = new CaptureManager(config, configPath);
    await manager.capture({ range: '1-2' });

    expect(mockPage.evaluate).toHaveBeenCalledTimes(4);
    const expectedScreenshot1 = path.join(config.distDir, 'screenshots', 'page-1.png');
    const expectedScreenshot2 = path.join(config.distDir, 'screenshots', 'page-2.png');
    expect(fs.existsSync(expectedScreenshot1)).toBe(true);
    expect(fs.existsSync(expectedScreenshot2)).toBe(true);
  });

  it('should auto-compile book when outputs are missing', async () => {
    const htmlPath = path.join(config.distDir, 'book.html');
    const pdfPath = path.join(config.distDir, 'book.pdf');
    if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);

    const sectionDir = path.join(config.assetsDir, 'section-1');
    fs.mkdirSync(sectionDir, { recursive: true });
    fs.writeFileSync(path.join(sectionDir, '1.1.md'), '# Title\n\nChapter content', 'utf8');

    const mockElement = {
      screenshot: jest.fn().mockImplementation((opts: any) => {
        if (opts && opts.path) {
          fs.writeFileSync(opts.path, 'png data');
        }
        return Promise.resolve(Buffer.from('png data'));
      })
    };

    const { mockPage } = setupMockPuppeteer(mockElement);

    const manager = new CaptureManager(config, configPath);
    await manager.capture({ coords: '1.1' });

    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(mockPage.$).toHaveBeenCalledWith('.chapter-container[data-coords="1.1"]');
  });

  it('should handle compilation if PDF page is requested and pdf compilation was disabled', async () => {
    config.pdf = false;
    const pdfPath = path.join(config.distDir, 'book.pdf');
    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);

    const mockElement = {
      screenshot: jest.fn().mockImplementation((opts: any) => {
        if (opts && opts.path) {
          fs.writeFileSync(opts.path, 'png data');
        }
        return Promise.resolve(Buffer.from('png data'));
      })
    };

    setupMockPuppeteer(mockElement);

    const manager = new CaptureManager(config, configPath);
    await manager.capture({ page: 1 });

    expect(fs.existsSync(pdfPath)).toBe(true);
    expect(config.pdf).toBe(false);
  });

  it('should log a warning if page is invalid', async () => {
    const pdfPath = path.join(config.distDir, 'book.pdf');
    fs.writeFileSync(pdfPath, 'mock-pdf-binary-content', 'utf8');

    const mockElement = {
      screenshot: jest.fn().mockResolvedValue(Buffer.from('png data'))
    };

    const { mockPage } = setupMockPuppeteer(mockElement, {
      evaluate: jest.fn().mockImplementation((fn, ...args) => {
        if (fn && fn.toString().includes('getDocument')) {
          return { success: false };
        }
        return undefined;
      })
    });

    const manager = new CaptureManager(config, configPath);
    await manager.capture({ page: 999 });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid page number: 999'));
  });

  it('should throw an error if elements are not found', async () => {
    const htmlPath = path.join(config.distDir, 'book.html');
    fs.writeFileSync(htmlPath, '<html><body></body></html>', 'utf8');

    const mockElement = null;
    setupMockPuppeteer(mockElement);

    const manager = new CaptureManager(config, configPath);
    await expect(manager.capture({ selector: '.non-existent' })).rejects.toThrow(
      'Failed to capture screenshot:'
    );
  });

  it('should capture an EPUB chapter with inlined assets', async () => {
    const mockElement = {
      screenshot: jest.fn().mockImplementation((opts: any) => {
        if (opts && opts.path) {
          fs.writeFileSync(opts.path, 'png data');
        }
        return Promise.resolve(Buffer.from('png data'));
      })
    };

    const { mockBrowser, mockPage } = setupMockPuppeteer(mockElement, {
      screenshot: mockElement.screenshot
    });

    // Create manuscript chapters to compile
    const assetsDir = path.join(config.assetsDir, 'section-1');
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(path.join(assetsDir, '1.1.md'), '# Title\n\nChapter body content', 'utf8');

    const manager = new CaptureManager(config, configPath);
    await manager.captureEpubChapter('1.1', path.join(config.distDir, 'screenshots'));

    expect(mockPage.setContent).toHaveBeenCalledWith(
      expect.stringContaining('Title'),
      expect.objectContaining({ waitUntil: 'networkidle0' })
    );
    expect(mockPage.setContent).toHaveBeenCalledWith(
      expect.stringContaining('style'),
      expect.any(Object)
    );
    expect(mockBrowser.close).toHaveBeenCalled();

    const expectedScreenshot = path.join(config.distDir, 'screenshots', 'epub-chapter-1-1.png');
    expect(fs.existsSync(expectedScreenshot)).toBe(true);
  });
});
