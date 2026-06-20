import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Bitig CLI Integration Tests', () => {
  let tempDir: string = '';
  const cliPath = path.resolve(__dirname, '../dist/cli.js');

  beforeEach(() => {
    // Create a clean temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bitig-test-'));
  });

  afterEach(() => {
    // Clean up the temp directory after each test
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should initialize a template project successfully', () => {
    execSync(`node ${cliPath} init`, { cwd: tempDir });

    expect(fs.existsSync(path.join(tempDir, 'book.json'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'assets/section-0/0.1.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'assets/section-1/1.1.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'assets/epilogue.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'assets/bibliography.md'))).toBe(true);

    const configContent = fs.readFileSync(path.join(tempDir, 'book.json'), 'utf8');
    const config = JSON.parse(configContent);
    expect(config.title).toBe('Yeni Kitap Başlığı');
    expect(config.language).toBe('tr');
  });

  it('should execute scaffolding and directory management commands', () => {
    // 1. Init
    execSync(`node ${cliPath} init`, { cwd: tempDir });

    // 2. Add Section
    execSync(`node ${cliPath} add:section 2 --title "Middle Part"`, { cwd: tempDir });
    expect(fs.existsSync(path.join(tempDir, 'assets/section-2'))).toBe(true);

    const configContent = fs.readFileSync(path.join(tempDir, 'book.json'), 'utf8');
    const config = JSON.parse(configContent);
    expect(config.sectionTitles['2']).toBe('Middle Part');

    // 3. Add Chapter
    execSync(`node ${cliPath} add:chapter 2.1 --title "Beginning"`, { cwd: tempDir });
    expect(fs.existsSync(path.join(tempDir, 'assets/section-2/2.1.md'))).toBe(true);

    const chapContent = fs.readFileSync(path.join(tempDir, 'assets/section-2/2.1.md'), 'utf8');
    expect(chapContent).toContain('# Beginning');

    // 4. Move Chapter
    execSync(`node ${cliPath} move:chapter 2.1 2.2`, { cwd: tempDir });
    expect(fs.existsSync(path.join(tempDir, 'assets/section-2/2.1.md'))).toBe(false);
    expect(fs.existsSync(path.join(tempDir, 'assets/section-2/2.2.md'))).toBe(true);

    // 5. Delete Chapter
    execSync(`node ${cliPath} delete:chapter 2.2`, { cwd: tempDir });
    expect(fs.existsSync(path.join(tempDir, 'assets/section-2/2.2.md'))).toBe(false);
  });

  it('should run query and diagnostic commands successfully', () => {
    execSync(`node ${cliPath} init`, { cwd: tempDir });

    // Test stats command
    const statsOutput = execSync(`node ${cliPath} stats`, { cwd: tempDir, encoding: 'utf8' });
    expect(statsOutput).toContain('KİTAP DURUM RAPORU');
    expect(statsOutput).toContain('Toplam Bölüm:     4');

    // Test check/lint command
    const checkOutput = execSync(`node ${cliPath} check`, { cwd: tempDir, encoding: 'utf8' });
    expect(checkOutput).toContain('Tanılamalar çalıştırılıyor');
    // Default template has 1 warning because "Kuantum dolanıklığı" is capitalized but citation term "kuantum dolanıklığı" is lowercase
    expect(checkOutput).toContain('Tanılama tamamlandı: 0 hata, 1 uyarı bulundu.');

    // Test search command
    const searchOutput = execSync(`node ${cliPath} search "kuantum"`, {
      cwd: tempDir,
      encoding: 'utf8'
    });
    expect(searchOutput).toContain('"kuantum" için arama yapılıyor');
    expect(searchOutput).toContain('1 eşleşme bulundu');

    // Test context command
    const contextOutput = execSync(`node ${cliPath} context 1.1`, {
      cwd: tempDir,
      encoding: 'utf8'
    });
    expect(contextOutput).toContain('KİTAP YAZIM BAĞLAM PAKETİ');
    expect(contextOutput).toContain('Kısım 1, Bölüm 1');
    expect(contextOutput).toContain('Temeller ve Dünya');
  });

  it('should compile the book to dist outputs including PDF', () => {
    execSync(`node ${cliPath} init`, { cwd: tempDir });

    // Run build (which defaults to pdf: true)
    execSync(`node ${cliPath} build`, { cwd: tempDir });

    const distPath = path.join(tempDir, 'dist');
    expect(fs.existsSync(path.join(distPath, 'book.md'))).toBe(true);
    expect(fs.existsSync(path.join(distPath, 'book.html'))).toBe(true);
    expect(fs.existsSync(path.join(distPath, 'book-metadata.json'))).toBe(true);
    expect(fs.existsSync(path.join(distPath, 'book.pdf'))).toBe(true);

    // Verify metadata structure
    const metaContent = fs.readFileSync(path.join(distPath, 'book-metadata.json'), 'utf8');
    const metadata = JSON.parse(metaContent);
    expect(metadata.book.title).toBe('Yeni Kitap Başlığı');
    expect(metadata.stats.totalChapters).toBe(4);
  });
});
