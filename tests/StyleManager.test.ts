import { StyleManager } from '../src/StyleManager';
import { BookConfig } from '../src/BookConfig';
import * as fs from 'fs';

jest.mock('fs');

describe('StyleManager', () => {
  let manager: StyleManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new StyleManager();
  });

  it('should default to serif theme', () => {
    expect(manager.themeName).toBe('serif');
  });

  it('should allow setting predefined themes', () => {
    manager.usePredefinedTheme('sans-serif');
    expect(manager.themeName).toBe('sans-serif');
    expect(manager.getCSS()).toContain('Outfit');

    manager.usePredefinedTheme('academic');
    expect(manager.themeName).toBe('academic');
    expect(manager.getCSS()).toContain('Garamond');

    manager.usePredefinedTheme('serif');
    expect(manager.themeName).toBe('serif');
    expect(manager.getCSS()).toContain('Merriweather');
  });

  it('should default to serif and warn when setting an invalid theme', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    manager.usePredefinedTheme('invalid-theme');
    expect(manager.themeName).toBe('serif');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should support custom CSS files', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('body { color: red; }');

    manager.useCustomTheme('custom.css');
    expect(manager.getCSS()).toBe('body { color: red; }');
    expect(manager.getStyleBlock()).toContain('<style>\nbody { color: red; }\n</style>');
  });

  it('should throw error if custom CSS path does not exist', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    expect(() => manager.useCustomTheme('nonexistent.css')).toThrow();
  });

  it('should return early and do nothing if custom CSS path is empty', () => {
    manager.useCustomTheme('');
    expect(manager.customCSS).toBe('');
    expect(fs.existsSync).not.toHaveBeenCalled();
  });

  it('should generate cover page HTML', () => {
    const config = new BookConfig({
      title: 'My Novel',
      subtitle: 'A saga',
      author: 'Author',
      description: 'An epic story.'
    });

    const html = manager.generateCoverPage(config);
    expect(html).toContain('MY NOVEL');
    expect(html).toContain('A saga');
    expect(html).toContain('Author');
    expect(html).toContain('An epic story.');
  });

  it('should generate cover page HTML without subtitle or description if they are missing', () => {
    const config = new BookConfig({
      title: 'Minimal Book',
      author: 'Author'
    });
    config.subtitle = '';
    config.description = '';

    const html = manager.generateCoverPage(config);
    expect(html).toContain('MINIMAL BOOK');
    expect(html).not.toContain('cover-subtitle');
    expect(html).not.toContain('cover-description');
  });

  describe('generateCopyrightPage', () => {
    it('should generate copyright page HTML with standard default notice', () => {
      const config = new BookConfig({
        title: 'Quantum Physics',
        author: 'Einstein',
        language: 'en'
      });

      const html = manager.generateCopyrightPage(config);
      expect(html).toContain('COPYRIGHT');
      expect(html).toContain('Quantum Physics');
      expect(html).toContain('Einstein');
      expect(html).toContain('All rights reserved. No part of this publication');
    });

    it('should generate copyright page HTML in Turkish when configured', () => {
      const config = new BookConfig({
        title: 'Kuantum Teorisi',
        author: 'Erdem Ayaz',
        language: 'tr'
      });

      const html = manager.generateCopyrightPage(config);
      expect(html).toContain('TELİF HAKKI');
      expect(html).toContain('Tüm hakları saklıdır. Bu yayının hiçbir bölümü');
    });

    it('should include publisher, publish date, isbn, and custom copyright statement if configured', () => {
      const config = new BookConfig({
        title: 'Bitig Manual',
        author: 'Developer',
        isbn: '978-3-16-148410-0',
        publisher: 'Antigravity Press',
        publishDate: '2026-06-21',
        copyright: 'Creative Commons Zero v1.0 Universal',
        language: 'en'
      });

      const html = manager.generateCopyrightPage(config);
      expect(html).toContain('Bitig Manual');
      expect(html).toContain('Developer');
      expect(html).toContain('Creative Commons Zero v1.0 Universal');
      expect(html).toContain('Publisher:</strong> Antigravity Press');
      expect(html).toContain('Published:</strong> 2026-06-21');
      expect(html).toContain('ISBN:</strong> 978-3-16-148410-0');
    });
  });
});
