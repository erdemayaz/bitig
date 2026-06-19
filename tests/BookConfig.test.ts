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

    it('should throw error if config file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      expect(() => BookConfig.loadFromFile('missing.json')).toThrow();
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
  });
});
