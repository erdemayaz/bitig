import { PdfCompiler } from '../src/PdfCompiler';
import puppeteer from 'puppeteer';

jest.mock('puppeteer');

describe('PdfCompiler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call Puppeteer browser launch, newPage, setContent, pdf, and close', async () => {
    const mockPdf = jest.fn().mockResolvedValue(Buffer.from('pdf data'));
    const mockSetContent = jest.fn().mockResolvedValue(undefined);
    const mockNewPage = jest.fn().mockResolvedValue({
      setContent: mockSetContent,
      pdf: mockPdf
    });
    const mockClose = jest.fn().mockResolvedValue(undefined);
    const mockBrowser = {
      newPage: mockNewPage,
      close: mockClose
    };

    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

    const compiler = new PdfCompiler();
    const result = await compiler.compileToPdf('<html></html>', 'output.pdf');

    expect(puppeteer.launch).toHaveBeenCalledWith(
      expect.objectContaining({
        headless: true
      })
    );
    expect(mockNewPage).toHaveBeenCalled();
    expect(mockSetContent).toHaveBeenCalledWith(
      '<html></html>',
      expect.objectContaining({
        waitUntil: 'networkidle0'
      })
    );
    expect(mockPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.any(String),
        format: 'A4',
        margin: { top: 0, bottom: 0, left: 0, right: 0 }
      })
    );
    expect(mockClose).toHaveBeenCalled();
    expect(result).toContain('output.pdf');
  });

  it('should throw an error and close browser if puppeteer launch fails', async () => {
    (puppeteer.launch as jest.Mock).mockRejectedValue(new Error('launch error'));

    const compiler = new PdfCompiler();
    await expect(compiler.compileToPdf('<html></html>', 'output.pdf')).rejects.toThrow(
      'launch error'
    );
  });
});
