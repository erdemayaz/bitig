import { Locale } from '../src/Locale';

describe('Locale', () => {
  it('should return the key itself if the key does not exist in any translations', () => {
    const nonExistentKey = 'non_existent_key_12345';
    expect(Locale.get(nonExistentKey, 'en')).toBe(nonExistentKey);
    expect(Locale.get(nonExistentKey, 'tr')).toBe(nonExistentKey);
  });

  it('should retrieve correct translations for English and Turkish', () => {
    // Check known key 'tocHtmlHeading'
    expect(Locale.get('tocHtmlHeading', 'tr')).toBe('İÇİNDEKİLER');
    expect(Locale.get('tocHtmlHeading', 'en')).toBe('TABLE OF CONTENTS');
  });

  it('should default to Turkish if no language is provided', () => {
    expect(Locale.get('tocHtmlHeading')).toBe('İÇİNDEKİLER');
  });

  it('should handle case insensitivity and prefix match for Turkish language code', () => {
    expect(Locale.get('tocHtmlHeading', 'TR-tr')).toBe('İÇİNDEKİLER');
    expect(Locale.get('tocHtmlHeading', 'tr-TR')).toBe('İÇİNDEKİLER');
  });

  it('should fallback to English for non-supported languages', () => {
    expect(Locale.get('tocHtmlHeading', 'it')).toBe('TABLE OF CONTENTS');
  });

  it('should retrieve correct translations for German, Spanish and French', () => {
    expect(Locale.get('tocHtmlHeading', 'de')).toBe('INHALTSVERZEICHNIS');
    expect(Locale.get('tocHtmlHeading', 'es')).toBe('ÍNDICE DE CONTENIDOS');
    expect(Locale.get('tocHtmlHeading', 'fr')).toBe('TABLE DES MATIÈRES');
  });

  it('should correctly perform token replacements', () => {
    const key = 'buildGeneratingPdf'; // Translation text has: "PDF çıktısı üretiliyor: {path}..."
    const trText = Locale.get(key, 'tr', { path: '/some/path/book.pdf' });
    const enText = Locale.get(key, 'en', { path: '/some/path/book.pdf' });

    expect(trText).toContain('/some/path/book.pdf');
    expect(enText).toContain('/some/path/book.pdf');
  });

  it('should fallback to English key if key is missing in Turkish translation but present in English', () => {
    // Temporarily inject a key in translations to test fallback
    const originalTranslations = (Locale as any).translations;
    (Locale as any).translations = {
      en: { fallbackTestKey: 'English Value' },
      tr: {}
    };

    try {
      expect(Locale.get('fallbackTestKey', 'tr')).toBe('English Value');
    } finally {
      (Locale as any).translations = originalTranslations;
    }
  });
});
