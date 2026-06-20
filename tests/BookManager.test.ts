import * as fs from 'fs';
import { BookManager } from '../src/BookManager';
import { BookConfig } from '../src/BookConfig';

jest.mock('fs');

describe('BookManager', () => {
  let config: BookConfig;
  let manager: BookManager;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    config = new BookConfig({
      title: 'Manager Book',
      assetsDir: './my-assets',
      distDir: './my-dist',
      language: 'en',
      epilogueFile: 'my-epilogue.md',
      bibliographyFile: 'my-bibliography.md'
    });

    manager = new BookManager(config, './book.json');
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('addSection', () => {
    it('should create section folder and update configuration titles', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ title: 'Manager Book' }));

      manager.addSection(2, 'The New Section');

      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('section-2'), {
        recursive: true
      });
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('book.json'),
        expect.stringContaining('The New Section'),
        'utf8'
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Section 2'));
    });

    it('should initialize sectionTitles if not present in raw config', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ title: 'Manager Book' }));

      manager.addSection(3, 'Section Three');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('book.json'),
        expect.stringContaining('"3": "Section Three"'),
        'utf8'
      );
    });
  });

  describe('addChapter', () => {
    it('should create chapter file under normal section and write template content', () => {
      (fs.existsSync as jest.Mock).mockImplementation((path) => {
        // assetsDir exists but chapter file does not exist
        if (typeof path === 'string' && path.endsWith('2.1.md')) {
          return false;
        }
        return true;
      });

      manager.addChapter(2, 1, 'My First Chapter');

      expect(fs.mkdirSync).not.toHaveBeenCalled(); // folder already exists (mocked true)
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('2.1.md'),
        expect.stringContaining('# My First Chapter'),
        'utf8'
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('2.1.md'));
    });

    it('should create target section directory if it does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false); // nothing exists

      manager.addChapter(3, 2, 'Chapter Title');

      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('section-3'), {
        recursive: true
      });
    });

    it('should throw error if chapter file already exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true); // file exists

      expect(() => manager.addChapter(2, 1, 'Exists')).toThrow('Chapter file already exists at');
    });

    it('should handle special chapter addition for epilogue (998) with custom config', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      manager.addChapter(998, 1, 'End Word');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('my-epilogue.md'),
        expect.any(String),
        'utf8'
      );
    });

    it('should handle special chapter addition for epilogue (998) fallback name', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const simpleConfig = new BookConfig({
        title: 'Simple',
        assetsDir: './assets',
        distDir: './dist'
      });
      const simpleManager = new BookManager(simpleConfig, './book.json');

      simpleManager.addChapter(998, 1, 'End Word');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('epilogue.md'),
        expect.any(String),
        'utf8'
      );
    });

    it('should handle special chapter addition for bibliography (999) with custom config', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      manager.addChapter(999, 1, 'References');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('my-bibliography.md'),
        expect.any(String),
        'utf8'
      );
    });

    it('should handle special chapter addition for bibliography (999) fallback name', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const simpleConfig = new BookConfig({
        title: 'Simple',
        assetsDir: './assets',
        distDir: './dist'
      });
      const simpleManager = new BookManager(simpleConfig, './book.json');

      simpleManager.addChapter(999, 1, 'References');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('bibliography.md'),
        expect.any(String),
        'utf8'
      );
    });
  });

  describe('moveChapter', () => {
    it('should move chapter file, creating target directory if needed', () => {
      (fs.existsSync as jest.Mock).mockImplementation((path) => {
        if (typeof path === 'string') {
          if (path.endsWith('1.1.md')) return true; // source exists
          if (path.endsWith('section-2')) return false; // dest dir doesn't exist
          if (path.endsWith('2.1.md')) return false; // target file doesn't exist
        }
        return false;
      });

      manager.moveChapter(1, 1, 2, 1);

      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('section-2'), {
        recursive: true
      });
      expect(fs.renameSync).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1.1.md'));
    });

    it('should throw error if source chapter does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      expect(() => manager.moveChapter(1, 1, 2, 1)).toThrow('Source chapter not found at');
    });

    it('should throw error if target chapter already exists', () => {
      (fs.existsSync as jest.Mock).mockImplementation((path) => {
        if (typeof path === 'string') {
          if (path.endsWith('1.1.md')) return true; // source exists
          if (path.endsWith('section-2')) return true; // dest dir exists
          if (path.endsWith('2.1.md')) return true; // target file exists
        }
        return false;
      });

      expect(() => manager.moveChapter(1, 1, 2, 1)).toThrow('Target chapter path already exists');
    });
  });

  describe('deleteChapter', () => {
    it('should delete chapter file', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      manager.deleteChapter(1, 1);

      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1.1.md'));
    });

    it('should throw error if chapter file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      expect(() => manager.deleteChapter(1, 1)).toThrow('Chapter file not found');
    });
  });

  describe('updateChapterMetadata', () => {
    it('should update synopsis in book.json', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ title: 'Manager Book' }));

      manager.updateChapterMetadata(1, 2, { synopsis: 'Test Synopsis' });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('book.json'),
        expect.stringContaining('"1.2": "Test Synopsis"'),
        'utf8'
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1.2'));
    });

    it('should update H1 title in chapter markdown file if exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('# Old Title\nSome content.');

      manager.updateChapterMetadata(1, 1, { title: 'New Title' });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('1.1.md'),
        '# New Title\nSome content.',
        'utf8'
      );
    });

    it('should prepend H1 title in chapter markdown file if H1 does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('Some content.');

      manager.updateChapterMetadata(1, 1, { title: 'New Title' });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('1.1.md'),
        '# New Title\n\nSome content.',
        'utf8'
      );
    });

    it('should update title for special chapter epilogue (998)', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('# Old Epilogue\nSome content.');

      manager.updateChapterMetadata(998, 1, { title: 'New Epilogue' });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('my-epilogue.md'),
        '# New Epilogue\nSome content.',
        'utf8'
      );
    });

    it('should update title for special chapter bibliography (999)', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('# Old Bib\nSome content.');

      manager.updateChapterMetadata(999, 1, { title: 'New Bib' });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('my-bibliography.md'),
        '# New Bib\nSome content.',
        'utf8'
      );
    });

    it('should update title for special chapter epilogue (998) fallback name', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('# Old Epilogue\nSome content.');

      const simpleConfig = new BookConfig({
        title: 'Simple',
        assetsDir: './assets',
        distDir: './dist'
      });
      const simpleManager = new BookManager(simpleConfig, './book.json');

      simpleManager.updateChapterMetadata(998, 1, { title: 'New Epilogue' });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('epilogue.md'),
        '# New Epilogue\nSome content.',
        'utf8'
      );
    });

    it('should update title for special chapter bibliography (999) fallback name', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('# Old Bib\nSome content.');

      const simpleConfig = new BookConfig({
        title: 'Simple',
        assetsDir: './assets',
        distDir: './dist'
      });
      const simpleManager = new BookManager(simpleConfig, './book.json');

      simpleManager.updateChapterMetadata(999, 1, { title: 'New Bib' });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('bibliography.md'),
        '# New Bib\nSome content.',
        'utf8'
      );
    });

    it('should throw error when updating title for non-existent chapter file', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      expect(() => manager.updateChapterMetadata(1, 1, { title: 'New Title' })).toThrow(
        'Chapter file not found:'
      );
    });
  });
});
