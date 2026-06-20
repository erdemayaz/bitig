#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { BookConfig } from './BookConfig';
import { BookCompiler } from './BookCompiler';
import { BookConfigData } from './types';
import { BookManager } from './BookManager';
import { BookLinter } from './BookLinter';
import { ContextPackager } from './ContextPackager';
import { BookSearcher } from './BookSearcher';
import { Locale } from './Locale';

interface CliArgs {
  command?: string;
  config?: string;
  theme?: string;
  output?: string;
  dist?: string;
  pdf?: boolean;
  help?: boolean;
  positionals: string[];
  title?: string;
  target?: string;
}

const args = process.argv.slice(2);
const cliArgs = parseArgs(args);

if (
  cliArgs.help ||
  (cliArgs.command && cliArgs.command === 'help') ||
  (!cliArgs.command && args.length > 0 && args[0].startsWith('-h'))
) {
  showHelp();
  process.exit(0);
}

// Default command to 'build' if not specified and config exists
const command = cliArgs.command || 'build';

switch (command) {
  case 'init':
    handleInit();
    break;
  case 'build':
    handleBuild(cliArgs);
    break;
  case 'add:section':
    handleAddSection(cliArgs);
    break;
  case 'add:chapter':
    handleAddChapter(cliArgs);
    break;
  case 'move:chapter':
    handleMoveChapter(cliArgs);
    break;
  case 'delete:chapter':
    handleDeleteChapter(cliArgs);
    break;
  case 'stats':
  case 'status':
    handleStats(cliArgs);
    break;
  case 'check':
  case 'lint':
    handleCheck(cliArgs);
    break;
  case 'context':
    handleContext(cliArgs);
    break;
  case 'search':
    handleSearch(cliArgs);
    break;
  case 'guide':
    handleGuide();
    break;
  default:
    console.error(`Error: Unknown command "${command}"`);
    showHelp();
    process.exit(1);
}

/**
 * Command-line arguments parser.
 * @param args
 * @returns CliArgs
 */
function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = { positionals: [] };
  if (args.length === 0) return result;

  let startIndex = 0;
  const firstArg = args[0];

  // Check if first arg is a command
  if (!firstArg.startsWith('-')) {
    result.command = firstArg;
    startIndex = 1;
  }

  for (let i = startIndex; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      result.help = true;
    } else if (arg === '-g' || arg === '--guide') {
      result.command = 'guide';
    } else if (arg === '-c' || arg === '--config') {
      if (i + 1 < args.length) {
        result.config = args[++i];
      } else {
        console.error('Error: Option --config requires a value.');
        process.exit(1);
      }
    } else if (arg === '-t' || arg === '--theme') {
      if (i + 1 < args.length) {
        result.theme = args[++i];
      } else {
        console.error('Error: Option --theme requires a value.');
        process.exit(1);
      }
    } else if (arg === '-o' || arg === '--output') {
      if (i + 1 < args.length) {
        result.output = args[++i];
      } else {
        console.error('Error: Option --output requires a value.');
        process.exit(1);
      }
    } else if (arg === '-d' || arg === '--dist') {
      if (i + 1 < args.length) {
        result.dist = args[++i];
      } else {
        console.error('Error: Option --dist requires a value.');
        process.exit(1);
      }
    } else if (arg === '--title') {
      if (i + 1 < args.length) {
        result.title = args[++i];
      } else {
        console.error('Error: Option --title requires a value.');
        process.exit(1);
      }
    } else if (arg === '--target') {
      if (i + 1 < args.length) {
        result.target = args[++i];
      } else {
        console.error('Error: Option --target requires a value.');
        process.exit(1);
      }
    } else if (arg === '--no-pdf') {
      result.pdf = false;
    } else if (arg === '--pdf') {
      result.pdf = true;
    } else if (!arg.startsWith('-')) {
      result.positionals.push(arg);
    }
  }

  return result;
}

/**
 * Displays the help menu.
 */
function showHelp(): void {
  console.log(`
Bitig - OOP Book Compiler CLI

Usage:
  bitig <command> [options]

Commands:
  init                           Initializes a template book project in the current directory.
  build                          Compiles the book according to the configuration.
  add:section <secNum>           Creates a new section folder and updates book.json.
  add:chapter <secNum>.<chapNum> Creates a template markdown file for the chapter.
  move:chapter <from> <to>       Moves and renames a chapter (e.g., bitig move:chapter 1.1 1.2).
  delete:chapter <sec>.<chap>    Deletes a chapter markdown file.
  stats                          Prints progress analytics, word counts, and structure breakdown.
  check                          Runs static diagnostics for broken links, syntax, and citation usage.
  context <sec>.<chap>           Generates a focused RAG/prompt package containing outlines and synopsis.
  search <query>                 Searches the entire book for keywords or phrases.
  guide                          Displays the comprehensive English guide on book writing workflow.
  help                           Displays this help menu.

Global Options:
  -c, --config <path>            Path to the book configuration JSON file (default: ./book.json)
  -g, --guide                    Displays the comprehensive English guide on book writing workflow.

Build Options:
  -t, --theme <theme>            Override the visual theme (serif, sans-serif, academic).
  -o, --output <name>            Override the compiled markdown output filename.
  -d, --dist <dir>               Override the output distribution directory.
  --pdf                          Enable PDF compilation (default).
  --no-pdf                       Disable PDF compilation.

Add Options:
  --title "<title>"              Set a custom title for the section or chapter.

Context Options:
  --target <sec>.<chap>          Alternative way to specify target chapter for context command.
`);
}

/**
 * Helper to get resolved config path.
 */
function getConfigPath(configArg?: string): string {
  const currentDir = process.cwd();
  return configArg ? path.resolve(configArg) : path.join(currentDir, 'book.json');
}

/**
 * Helper to load config safely.
 */
function loadConfig(configArg?: string): BookConfig {
  const configPath = getConfigPath(configArg);
  if (!fs.existsSync(configPath)) {
    console.error(`Error: Configuration file not found at: ${configPath}`);
    console.log('Use "bitig init" to initialize a new project.');
    process.exit(1);
  }
  return BookConfig.loadFromFile(configPath);
}

/**
 * Initializes a template project directory in Turkish by default.
 */
function handleInit(): void {
  const currentDir = process.cwd();
  const configPath = path.join(currentDir, 'book.json');

  if (fs.existsSync(configPath)) {
    console.error('Error: A book.json file already exists in this directory!');
    process.exit(1);
  }

  const templateConfig: BookConfigData = {
    title: 'Yeni Kitap Başlığı',
    subtitle: 'Kitap Alt Başlığı',
    author: 'Yazar Adı',
    description: 'Kitap açıklaması veya özeti buraya yazılır.',
    theme: 'serif',
    assetsDir: './assets',
    distDir: './dist',
    outputFilename: 'book.md',
    epilogueFile: 'epilogue.md',
    bibliographyFile: 'bibliography.md',
    pdf: true,
    language: 'tr',
    sectionTitles: {
      '0': 'Giriş ve Önsöz',
      '1': '1. Bölüm: Temeller',
      '2': '2. Bölüm: Derin Dalış',
      '998': 'Son Söz',
      '999': 'Kaynakça'
    },
    citations: [
      {
        term: 'kuantum dolanıklığı',
        replacement: 'kuantum dolanıklığı<sup>[1]</sup>'
      }
    ]
  };

  try {
    fs.writeFileSync(configPath, JSON.stringify(templateConfig, null, 2), 'utf8');
    console.log(Locale.get('initSuccessJson', 'tr'));

    const assetsDir = path.join(currentDir, 'assets');
    const section0Dir = path.join(assetsDir, 'section-0');
    const section1Dir = path.join(assetsDir, 'section-1');

    fs.mkdirSync(section0Dir, { recursive: true });
    fs.mkdirSync(section1Dir, { recursive: true });

    fs.writeFileSync(
      path.join(section0Dir, '0.1.md'),
      `# Giriş ve Önsöz\n\nBu kitap Bitig kullanılarak oluşturulmuştur. Bu giriş veya önsöz bölümüdür.`,
      'utf8'
    );
    fs.writeFileSync(
      path.join(section1Dir, '1.1.md'),
      `# Temeller ve Dünya\n\nKuantum dolanıklığı evrenin en derin sırlarından biridir. Bu ilk bölümdür.`,
      'utf8'
    );
    fs.writeFileSync(
      path.join(assetsDir, 'epilogue.md'),
      `# Son Söz\n\nBu kitap son söz ile bitmektedir.`,
      'utf8'
    );
    fs.writeFileSync(
      path.join(assetsDir, 'bibliography.md'),
      `# Kaynakça\n\n[1] Penrose, R. (1989). The Emperor's New Mind.`,
      'utf8'
    );

    console.log(Locale.get('initSuccessChapters', 'tr'));
    console.log(Locale.get('initSuccessRun', 'tr'));
  } catch (error) {
    const err = error as Error;
    console.error(Locale.get('initError', 'tr'), err.message);
    process.exit(1);
  }
}

/**
 * Loads configuration, applies CLI overrides, and runs the compiler.
 * @param cliArgs
 */
async function handleBuild(cliArgs: CliArgs): Promise<void> {
  let config: BookConfig | undefined;
  try {
    config = loadConfig(cliArgs.config);

    // Apply CLI argument overrides
    if (cliArgs.theme) {
      config.theme = cliArgs.theme;
    }
    if (cliArgs.output) {
      config.outputFilename = cliArgs.output;
    }
    if (cliArgs.dist) {
      config.distDir = path.resolve(cliArgs.dist);
    }
    if (cliArgs.pdf !== undefined) {
      config.pdf = cliArgs.pdf;
    }

    const compiler = new BookCompiler(config);
    const lang = config.language;

    console.log(Locale.get('buildLoadingConfig', lang));
    console.log(Locale.get('buildScanning', lang));
    compiler.scanAndLoad();

    console.log(Locale.get('buildCompiling', lang));
    await compiler.writeOutputs();

    console.log(Locale.get('buildSuccess', lang));
  } catch (error) {
    const err = error as Error;
    const lang = config ? config.language : 'tr';
    console.error(Locale.get('cliErrorCompilationFailed', lang), err.message);
    process.exit(1);
  }
}

/**
 * Adds a new section configuration and folder.
 */
function handleAddSection(cliArgs: CliArgs): void {
  const sectionNum = parseInt(cliArgs.positionals[0], 10);
  if (isNaN(sectionNum)) {
    console.error(
      'Error: Please specify a valid section number, e.g.: bitig add:section 3 --title "My New Section"'
    );
    process.exit(1);
  }
  const title = cliArgs.title || `Section ${sectionNum}`;
  let config: BookConfig | undefined;
  try {
    config = loadConfig(cliArgs.config);
    const manager = new BookManager(config, getConfigPath(cliArgs.config));
    manager.addSection(sectionNum, title);
  } catch (error) {
    const err = error as Error;
    const lang = config ? config.language : 'tr';
    console.error(Locale.get('cliErrorFailedAddSection', lang), err.message);
    process.exit(1);
  }
}

/**
 * Adds a new chapter template.
 */
function handleAddChapter(cliArgs: CliArgs): void {
  const target = cliArgs.positionals[0];
  if (!target) {
    console.error(
      'Error: Please specify target chapter coordinates, e.g.: bitig add:chapter 1.2 --title "My Chapter"'
    );
    process.exit(1);
  }

  const parts = target.split('.');
  const sectionNum = parseInt(parts[0], 10);
  const chapterNum = parts.length > 1 ? parseInt(parts[1], 10) : 1;

  if (isNaN(sectionNum) || isNaN(chapterNum)) {
    console.error('Error: Invalid section/chapter format. Use e.g. 1.2');
    process.exit(1);
  }

  const title = cliArgs.title || `Chapter ${sectionNum}.${chapterNum}`;
  let config: BookConfig | undefined;
  try {
    config = loadConfig(cliArgs.config);
    const manager = new BookManager(config, getConfigPath(cliArgs.config));
    manager.addChapter(sectionNum, chapterNum, title);
  } catch (error) {
    const err = error as Error;
    const lang = config ? config.language : 'tr';
    console.error(Locale.get('cliErrorFailedAddChapter', lang), err.message);
    process.exit(1);
  }
}

/**
 * Moves a chapter.
 */
function handleMoveChapter(cliArgs: CliArgs): void {
  const from = cliArgs.positionals[0];
  const to = cliArgs.positionals[1];

  if (!from || !to) {
    console.error(
      'Error: Please specify source and target chapter coordinates, e.g.: bitig move:chapter 1.1 1.2'
    );
    process.exit(1);
  }

  const fromParts = from.split('.');
  const toParts = to.split('.');

  const fromSec = parseInt(fromParts[0], 10);
  const fromChap = parseInt(fromParts[1], 10);
  const toSec = parseInt(toParts[0], 10);
  const toChap = parseInt(toParts[1], 10);

  if (isNaN(fromSec) || isNaN(fromChap) || isNaN(toSec) || isNaN(toChap)) {
    console.error('Error: Invalid coordinates format. Use format X.Y');
    process.exit(1);
  }

  let config: BookConfig | undefined;
  try {
    config = loadConfig(cliArgs.config);
    const manager = new BookManager(config, getConfigPath(cliArgs.config));
    manager.moveChapter(fromSec, fromChap, toSec, toChap);
  } catch (error) {
    const err = error as Error;
    const lang = config ? config.language : 'tr';
    console.error(Locale.get('cliErrorFailedMoveChapter', lang), err.message);
    process.exit(1);
  }
}

/**
 * Deletes a chapter.
 */
function handleDeleteChapter(cliArgs: CliArgs): void {
  const target = cliArgs.positionals[0];
  if (!target) {
    console.error('Error: Please specify target chapter, e.g.: bitig delete:chapter 1.2');
    process.exit(1);
  }

  const parts = target.split('.');
  const sectionNum = parseInt(parts[0], 10);
  const chapterNum = parseInt(parts[1], 10);

  if (isNaN(sectionNum) || isNaN(chapterNum)) {
    console.error('Error: Invalid coordinates format. Use format X.Y');
    process.exit(1);
  }

  let config: BookConfig | undefined;
  try {
    config = loadConfig(cliArgs.config);
    const manager = new BookManager(config, getConfigPath(cliArgs.config));
    manager.deleteChapter(sectionNum, chapterNum);
  } catch (error) {
    const err = error as Error;
    const lang = config ? config.language : 'tr';
    console.error(Locale.get('cliErrorFailedDeleteChapter', lang), err.message);
    process.exit(1);
  }
}

/**
 * Displays draft analytics and progress statistics.
 */
function handleStats(cliArgs: CliArgs): void {
  let config: BookConfig | undefined;
  try {
    config = loadConfig(cliArgs.config);
    const compiler = new BookCompiler(config);
    compiler.scanAndLoad();

    if (!compiler.metadataGenerator) {
      console.error('Error: Failed to initialize metadata generator.');
      process.exit(1);
    }

    const lang = config.language;
    const metadata = JSON.parse(compiler.metadataGenerator.generateJSONMetadata());

    console.log(`
============================================================
${Locale.get('statsReportTitle', lang)}: "${metadata.book.title}"
============================================================
${Locale.get('statsAuthor', lang)}:             ${metadata.book.author}
${Locale.get('statsSubtitle', lang)}:           ${metadata.book.subtitle || 'N/A'}
${Locale.get('statsTheme', lang)}:              ${metadata.book.theme}

${Locale.get('statsDraftStats', lang)}
${Locale.get('statsTotalSections', lang)}:     ${metadata.stats.totalSections}
${Locale.get('statsTotalChapters', lang)}:     ${metadata.stats.totalChapters}
${Locale.get('statsTotalWords', lang)}:        ${metadata.stats.totalWords}
${Locale.get('statsTotalChars', lang)}:   ${metadata.stats.totalCharacters}
${Locale.get('statsEstReadingTime', lang, { time: metadata.stats.estimatedReadTimeMinutes })}

${Locale.get('statsStructureBreakdown', lang)}`);

    metadata.structure.forEach((sec: any) => {
      console.log(
        Locale.get('statsSectionLabel', lang, {
          num: sec.sectionNum,
          title: sec.title,
          count: sec.chaptersCount
        })
      );
      sec.chapters.forEach((chap: any) => {
        console.log(
          Locale.get('statsChapterLabel', lang, {
            sec: sec.sectionNum,
            chap: chap.chapterNum,
            title: chap.title,
            words: chap.wordCount
          })
        );
      });
    });
    console.log('\n============================================================');
  } catch (error) {
    const err = error as Error;
    const lang = config ? config.language : 'tr';
    console.error(Locale.get('cliErrorFailedLoadStats', lang), err.message);
    process.exit(1);
  }
}

/**
 * Runs diagnostics checks on the book files.
 */
function handleCheck(cliArgs: CliArgs): void {
  let config: BookConfig | undefined;
  try {
    config = loadConfig(cliArgs.config);
    const compiler = new BookCompiler(config);
    const linter = new BookLinter(compiler);
    const lang = config.language;

    console.log(Locale.get('checkRunning', lang));
    const messages = linter.runAllChecks();

    if (messages.length === 0) {
      console.log(Locale.get('checkClean', lang));
      return;
    }

    let errors = 0;
    let warnings = 0;

    messages.forEach((msg) => {
      const badge = msg.type === 'error' ? '[ERROR]' : '[WARN]';
      if (msg.type === 'error') errors++;
      else warnings++;

      const lineInfo = msg.line ? `:${msg.line}` : '';
      console.log(`${badge} ${msg.file}${lineInfo} - ${msg.message}`);
    });

    console.log(Locale.get('checkFinished', lang, { errors, warnings }));
    if (errors > 0) {
      process.exit(1);
    }
  } catch (error) {
    const err = error as Error;
    const lang = config ? config.language : 'tr';
    console.error(Locale.get('cliErrorFailedRunCheck', lang), err.message);
    process.exit(1);
  }
}

/**
 * Packages RAG context prompt.
 */
function handleContext(cliArgs: CliArgs): void {
  const target = cliArgs.positionals[0] || cliArgs.target;
  if (!target) {
    console.error('Error: Please specify target chapter coordinates, e.g.: bitig context 1.2');
    process.exit(1);
  }

  const parts = target.split('.');
  const sectionNum = parseInt(parts[0], 10);
  const chapterNum = parseInt(parts[1], 10);

  if (isNaN(sectionNum) || isNaN(chapterNum)) {
    console.error('Error: Invalid section/chapter format. Use e.g. 1.2');
    process.exit(1);
  }

  let config: BookConfig | undefined;
  try {
    config = loadConfig(cliArgs.config);
    const compiler = new BookCompiler(config);
    const packager = new ContextPackager(compiler);

    console.log(Locale.get('buildScanning', config.language));
    const pack = packager.packageContextFor(sectionNum, chapterNum);
    console.log('\n' + pack);
  } catch (error) {
    const err = error as Error;
    const lang = config ? config.language : 'tr';
    console.error(Locale.get('cliErrorFailedPackageContext', lang), err.message);
    process.exit(1);
  }
}

/**
 * Keyword search across all book chapters.
 */
function handleSearch(cliArgs: CliArgs): void {
  const query = cliArgs.positionals.join(' ');
  if (!query) {
    console.error(
      'Error: Please specify a search query, e.g.: bitig search "quantum consciousness"'
    );
    process.exit(1);
  }

  let config: BookConfig | undefined;
  try {
    config = loadConfig(cliArgs.config);
    const compiler = new BookCompiler(config);
    const searcher = new BookSearcher(compiler);
    const lang = config.language;

    console.log(Locale.get('searchRunning', lang, { query }));
    const results = searcher.search(query);

    if (results.length === 0) {
      console.log(Locale.get('searchNoMatches', lang));
      return;
    }

    console.log(Locale.get('searchFoundMatches', lang, { count: results.length }));
    results.forEach((res) => {
      console.log(`\n${res.file}:${res.lineNumber} [${res.chapterTitle}]`);
      console.log(`   > ${res.lineContent}`);
    });
  } catch (error) {
    const err = error as Error;
    const lang = config ? config.language : 'tr';
    console.error(Locale.get('cliErrorFailedSearch', lang), err.message);
    process.exit(1);
  }
}

/**
 * Displays the comprehensive English writing workflow guide.
 * Reads README.md if available, otherwise prints the built-in guide.
 */
function handleGuide(): void {
  const readmePath = path.join(__dirname, '..', 'README.md');
  if (fs.existsSync(readmePath)) {
    try {
      const content = fs.readFileSync(readmePath, 'utf8');
      console.log(content);
      return;
    } catch (e) {
      // Fallback if read failed
    }
  }

  // Built-in English Guide fallback
  console.log(`
# BITIG - AI-FRIENDLY BOOK WRITING WORKFLOW GUIDE

Welcome to Bitig! This guide details the workflow steps to write, refine, and compile a structured book with AI assistance.

## WORKFLOW STEPS

1. INITIALIZATION
   Create a new book directory, navigate into it, and run:
     bitig init
   This scaffolds the default structure:
     - book.json: Main book metadata, outline, citations, and themes.
     - assets/: Directory containing section folders and markdown chapters.

2. STRUCTURE MANAGEMENT
   Manage your book hierarchy using structural CLI commands:
     - bitig add:section <secNum> --title "<title>"
     - bitig add:chapter <secNum>.<chapNum> --title "<title>"
     - bitig move:chapter <from> <to>
     - bitig delete:chapter <secNum>.<chapNum>

3. AI CONTEXT PACKAGING (For AI Writers)
   When using an LLM / AI Agent to write or continue a chapter, do NOT pass the entire book.
   Instead, package a focused context prompt:
     bitig context <secNum>.<chapNum>
   This generates a prompt pack containing:
     - Book metadata & overall outlines.
     - Detailed synopses of all chapters.
     - Style/citation guidelines.
     - The complete text of the preceding chapter to maintain narrative flow.
     - Target chapter's current text (if any) to expand or edit.

4. DIAGNOSTICS & QUALITY CHECKS
   Run static diagnostics to check for unclosed code blocks, broken internal links, and unused citation terms:
     bitig check

5. COMPILING & PUBLISHING
   Generate your final distribution formats inside the 'dist/' folder:
     bitig build
   This compiles:
     - <bookName>.md: Assembled manuscript with shifted headers and applied citation superscripts.
     - <bookName>.html: Print-styled HTML layout.
     - <bookName>.pdf: Print-ready A4 PDF with covers and page-number aligned TOC (requires Puppeteer).
     - book-metadata.json: Comprehensive structural metadata and chapter summaries for AI search/indexing.

For detailed command options, run:
  bitig --help
`);
}
