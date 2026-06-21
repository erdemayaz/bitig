import { BookConfig } from '../src/BookConfig';
import * as fs from 'fs';

jest.mock('fs');

describe('BookConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor defaults', () => {
    it('should set reasonable defaults', () => {
      const config = new BookConfig();
      expect(config.title).toBe('Untitled Book');
      expect(config.author).toBe('Anonymous');
      expect(config.theme).toBe('serif');
      expect(config.pdf).toBe(true);
      expect(config.isbn).toBe('');
      expect(config.publisher).toBe('');
      expect(config.publishDate).toBe('');
      expect(config.copyright).toBe('');
    });
  });

  describe('validation', () => {
    it('should pass validation with valid options', () => {
      const config = new BookConfig({
        title: 'Valid Book',
        assetsDir: './assets',
        distDir: './dist'
      });
      expect(config.validate()).toBe(true);
    });

    it('should throw an error if title is missing', () => {
      const config = new BookConfig();
      config.title = ''; // bypass constructor fallback
      expect(() => config.validate()).toThrow();
    });

    it('should throw an error if assetsDir is missing', () => {
      const config = new BookConfig();
      config.assetsDir = ''; // bypass constructor fallback
      expect(() => config.validate()).toThrow();
    });

    it('should throw an error if distDir is missing', () => {
      const config = new BookConfig();
      config.distDir = ''; // bypass constructor fallback
      expect(() => config.validate()).toThrow('Config Error: "distDir" is required.');
    });

    it('should throw an error if outputFilename is not a string', () => {
      const config = new BookConfig();
      config.outputFilename = undefined as any;
      expect(() => config.validate()).toThrow(
        'Config Error: "outputFilename" must be a valid string.'
      );
    });

    it('should throw an error if language is not a string', () => {
      const config = new BookConfig();
      config.language = 123 as any;
      expect(() => config.validate()).toThrow('Config Error: "language" must be a valid string.');
    });

    it('should throw an error if isbn is not a string', () => {
      const config = new BookConfig();
      config.isbn = 123 as any;
      expect(() => config.validate()).toThrow('Config Error: "isbn" must be a valid string.');
    });

    it('should throw an error if publisher is not a string', () => {
      const config = new BookConfig();
      config.publisher = 123 as any;
      expect(() => config.validate()).toThrow('Config Error: "publisher" must be a valid string.');
    });

    it('should throw an error if publishDate is not a string', () => {
      const config = new BookConfig();
      config.publishDate = 123 as any;
      expect(() => config.validate()).toThrow(
        'Config Error: "publishDate" must be a valid string.'
      );
    });

    it('should throw an error if copyright is not a string', () => {
      const config = new BookConfig();
      config.copyright = 123 as any;
      expect(() => config.validate()).toThrow('Config Error: "copyright" must be a valid string.');
    });
  });

  describe('loadFromFile', () => {
    it('should load config JSON and resolve relative paths', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          title: 'File Book',
          assetsDir: './my-assets',
          distDir: './my-dist',
          customThemePath: './custom.css'
        })
      );

      const config = BookConfig.loadFromFile('/path/to/book.json');
      expect(config.title).toBe('File Book');
      expect(config.assetsDir).toContain('my-assets');
      expect(config.distDir).toContain('my-dist');
      expect(config.customThemePath).toContain('custom.css');
    });

    it('should load config JSON and not resolve paths if they are missing', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          title: 'Missing Paths Book'
        })
      );

      const config = BookConfig.loadFromFile('/path/to/book.json');
      expect(config.title).toBe('Missing Paths Book');
      expect(config.assetsDir).toBe('./assets'); // defaults from constructor
      expect(config.distDir).toBe('./dist'); // defaults from constructor
      expect(config.customThemePath).toBe('');
    });

    it('should throw error if config file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      expect(() => BookConfig.loadFromFile('missing.json')).toThrow();
    });

    it('should throw error with custom message if JSON parsing fails', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json { content }');
      expect(() => BookConfig.loadFromFile('/path/to/book.json')).toThrow(
        'Failed to load config from /path/to/book.json'
      );
    });
  });

  describe('getCitationRules', () => {
    it('should escape regex characters in string terms', () => {
      const config = new BookConfig({
        citations: [
          {
            term: 'Orch-OR *(Orchestrated)*',
            replacement: 'Orch-OR<sup>[1]</sup>'
          }
        ]
      });

      const compiled = config.getCitationRules();
      expect(compiled.length).toBe(1);

      const rule = compiled[0];
      expect(rule.replacement).toBe('Orch-OR<sup>[1]</sup>');

      // The term should be a RegExp matching the string literally
      const testString = 'The Orch-OR *(Orchestrated)* theory.';
      expect(testString.match(rule.term)).toBeTruthy();
      expect(testString.replace(rule.term, rule.replacement)).toBe(
        'The Orch-OR<sup>[1]</sup> theory.'
      );
    });

    it('should return empty array if citations is not an array', () => {
      const config = new BookConfig();
      config.citations = null as any;
      expect(config.getCitationRules()).toEqual([]);
    });

    it('should ignore rules where term is not a string', () => {
      const config = new BookConfig({
        citations: [
          {
            term: 12345 as any,
            replacement: 'replaced'
          }
        ]
      });
      expect(config.getCitationRules()).toEqual([]);
    });
  });
});
