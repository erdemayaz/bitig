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
import { DevServer } from './DevServer';
import { CaptureManager } from './CaptureManager';
import { MemoryManager } from './MemoryManager';

interface CliArgs {
  command?: string;
  config?: string;
  theme?: string;
  output?: string;
  dist?: string;
  pdf?: boolean;
  epub?: boolean;
  help?: boolean;
  positionals: string[];
  title?: string;
  target?: string;
  synopsis?: string;
  port?: number;
  page?: number;
  range?: string;
  coords?: string;
  selector?: string;
  outputDir?: string;
  epubChapter?: string;
  feedback?: string;
  style?: string;
  routine?: string;
  clear?: boolean;
  memory?: string;
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
  case 'learn':
    handleLearn(cliArgs);
    break;
  case 'search':
    handleSearch(cliArgs);
    break;
  case 'dev':
  case 'serve':
    handleDev(cliArgs);
    break;
  case 'update:metadata':
    handleUpdateMetadata(cliArgs);
    break;
  case 'capture':
  case 'screenshot':
    handleCapture(cliArgs);
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
    } else if (arg === '--synopsis') {
      if (i + 1 < args.length) {
        result.synopsis = args[++i];
      } else {
        console.error('Error: Option --synopsis requires a value.');
        process.exit(1);
      }
    } else if (arg === '-p' || arg === '--port') {
      if (i + 1 < args.length) {
        const pVal = parseInt(args[++i], 10);
        if (isNaN(pVal)) {
          console.error('Error: Option --port requires a valid number.');
          process.exit(1);
        }
        result.port = pVal;
      } else {
        console.error('Error: Option --port requires a value.');
        process.exit(1);
      }
    } else if (arg === '--no-pdf') {
      result.pdf = false;
    } else if (arg === '--pdf') {
      result.pdf = true;
    } else if (arg === '--epub') {
      result.epub = true;
    } else if (arg === '--no-epub') {
      result.epub = false;
    } else if (arg === '--epub-chapter') {
      if (i + 1 < args.length) {
        result.epubChapter = args[++i];
      } else {
        console.error('Error: Option --epub-chapter requires a value (e.g. 1.1).');
        process.exit(1);
      }
    } else if (arg === '--page') {
      if (i + 1 < args.length) {
        const pageVal = parseInt(args[++i], 10);
        if (isNaN(pageVal)) {
          console.error('Error: Option --page requires a valid number.');
          process.exit(1);
        }
        result.page = pageVal;
      } else {
        console.error('Error: Option --page requires a value.');
        process.exit(1);
      }
    } else if (arg === '--range') {
      if (i + 1 < args.length) {
        result.range = args[++i];
      } else {
        console.error('Error: Option --range requires a value.');
        process.exit(1);
      }
    } else if (arg === '--coords') {
      if (i + 1 < args.length) {
        result.coords = args[++i];
      } else {
        console.error('Error: Option --coords requires a value.');
        process.exit(1);
      }
    } else if (arg === '--selector') {
      if (i + 1 < args.length) {
        result.selector = args[++i];
      } else {
        console.error('Error: Option --selector requires a value.');
        process.exit(1);
      }
    } else if (arg === '--output-dir') {
      if (i + 1 < args.length) {
        result.outputDir = args[++i];
      } else {
        console.error('Error: Option --output-dir requires a value.');
        process.exit(1);
      }
    } else if (arg === '--feedback') {
      if (i + 1 < args.length) {
        result.feedback = args[++i];
      } else {
        console.error('Error: Option --feedback requires a value.');
        process.exit(1);
      }
    } else if (arg === '--style') {
      if (i + 1 < args.length) {
        result.style = args[++i];
      } else {
        console.error('Error: Option --style requires a value.');
        process.exit(1);
      }
    } else if (arg === '--routine') {
      if (i + 1 < args.length) {
        result.routine = args[++i];
      } else {
        console.error('Error: Option --routine requires a value.');
        process.exit(1);
      }
    } else if (arg === '--clear') {
      result.clear = true;
    } else if (arg === '--memory') {
      if (i + 1 < args.length) {
        result.memory = args[++i];
      } else {
        console.error('Error: Option --memory requires a value.');
        process.exit(1);
      }
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
  dev / serve                    Starts a local preview server with hot-reloading on port 3000.
  update:metadata <sec>.<chap>   Programmatically updates chapter synopsis and/or H1 title.
  capture / screenshot           Generates PNG screenshots of PDF pages or HTML regions.
  add:section <secNum>           Creates a new section folder and updates book.json.
  add:chapter <secNum>.<chapNum> Creates a template markdown file for the chapter.
  move:chapter <from> <to>       Moves and renames a chapter (e.g., bitig move:chapter 1.1 1.2).
  delete:chapter <sec>.<chap>    Deletes a chapter markdown file.
  stats                          Prints progress analytics, word counts, and structure breakdown.
  check                          Runs static diagnostics for broken links, syntax, and citation usage.
  context <sec>.<chap>           Generates a focused RAG/prompt package containing outlines and synopsis.
  learn <scope> [options]        Updates the persistent AI agent memory and feedback log.
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
  --epub                         Enable EPUB 3 compilation (opt-in, disabled by default).
  --no-epub                      Disable EPUB compilation (overrides book.json).

Dev Options:
  -p, --port <number>            Port for the local development preview server (default: 3000).

Capture Options:
  --page <number>                Page number of the PDF to capture (default: 1 if no HTML options are set).
  --range <start>-<end>          Range of pages to capture (e.g. 1-3).
  --coords <coords>              Section/Chapter coordinates to capture from HTML (e.g. 1.1).
  --selector <selector>          CSS selector of the element to capture from HTML (e.g. ".cover-page").
  --epub-chapter <coords>        Render and screenshot a specific EPUB chapter (e.g. 1.1).
  --output-dir <dir>             Directory where screenshots will be saved (default: dist/screenshots).

Add Options:
  --title "<title>"              Set a custom title for the section or chapter.

Metadata Options:
  --synopsis "<text>"            Set synopsis/summary text for the chapter.
  --title "<title>"              Set a new H1 title for the chapter.

Context Options:
  --target <sec>.<chap>          Alternative way to specify target chapter for context command.
  --memory <layers>              Comma-separated list of memory layers to include (global,section,chapter or none).

Memory / Learning Options:
  --feedback "<text>"            Add user feedback to specified scope.
  --style "<text>"               Add styling instruction to specified scope.
  --routine "<text>"             Add workflow routine/rule to specified scope.
  --clear                        Clear memory for specified scope.

Configuration Details:
  For a comprehensive reference on book.json structural and styling parameters (themes, custom fonts, page sizes, margins, colors, etc.), run:
    bitig guide
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
    if (cliArgs.epub !== undefined) {
      config.epub = cliArgs.epub;
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

    let activeMemoryLayers = ['global', 'section', 'chapter'];
    if (cliArgs.memory !== undefined) {
      const memoryArg = cliArgs.memory.trim().toLowerCase();
      if (memoryArg === 'none') {
        activeMemoryLayers = [];
      } else {
        activeMemoryLayers = memoryArg
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }

    const pack = packager.packageContextFor(sectionNum, chapterNum, activeMemoryLayers);
    console.log('\n' + pack);
  } catch (error) {
    const err = error as Error;
    const lang = config ? config.language : 'tr';
    console.error(Locale.get('cliErrorFailedPackageContext', lang), err.message);
    process.exit(1);
  }
}

/**
 * Updates the persistent AI agent memory and feedback log.
 */
function handleLearn(cliArgs: CliArgs): void {
  const scope = cliArgs.positionals[0];
  if (!scope) {
    console.error(
      'Error: Please specify a memory scope, e.g.: bitig learn global or bitig learn 1.3'
    );
    process.exit(1);
  }

  const { feedback, style, routine, clear } = cliArgs;

  if (!feedback && !style && !routine && !clear) {
    console.error(
      'Error: Please specify at least one action: --feedback, --style, --routine, or --clear.'
    );
    process.exit(1);
  }

  let config: BookConfig | undefined;
  try {
    config = loadConfig(cliArgs.config);
    const projectDir = path.dirname(config.assetsDir);
    const memoryPath = path.join(projectDir, 'memory.json');
    const memoryManager = new MemoryManager(memoryPath);

    if (clear) {
      memoryManager.clear(scope);
      console.log(`Memory cleared successfully for scope "${scope}".`);
    } else {
      memoryManager.learn(scope, { feedback, style, routine });
      console.log(`Learned new items successfully for scope "${scope}".`);
    }
  } catch (error) {
    const err = error as Error;
    console.error(`Error: Failed to update memory: ${err.message}`);
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

3. AI CONTEXT PACKAGING & AUTONOMOUS LOOP (For AI Writers)
   When using an LLM / AI Agent to write or continue a chapter, do NOT pass the entire book.
   Instead, package a focused context prompt:
     bitig context <secNum>.<chapNum>
   This generates a prompt pack containing:
     - Book metadata & overall outlines.
     - Detailed synopses of all chapters.
     - Style/citation guidelines.
     - The complete text of the preceding chapter to maintain narrative flow.
     - Target chapter's current text (if any) to expand or edit.

   🤖 THE AI-FIRST AUTONOMOUS LOOP:
   AI agents can execute a complete autonomous cycle to write, verify, and summarize content:
     1. bitig context 2.3  --> Retrieve prompt pack
     2. Write/edit manuscript chapter file (assets/section-2/2.3.md)
     3. bitig capture --coords 2.3 (or --epub-chapter 2.3) --> Visual validation
     4. bitig update:metadata 2.3 --synopsis "..." --> AI feedback loop to update index

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

6. LOCAL PREVIEW
   Start a local HTTP preview server that watches assets/ and book.json for changes, recompiles, and hot-reloads the browser automatically (PDF compiling is bypassed to keep reload times under 50ms):
     bitig dev [--port <port>]

7. PROGRAMMATIC METADATA UPDATES
   Update chapter titles and synopses programmatically:
     bitig update:metadata <secNum>.<chapNum> [--synopsis "<text>"] [--title "<title>"]

8. VISUAL SCREENSHOT CAPTURE
   Capture PNG screenshots of PDF pages or specific HTML sections/chapters:
     bitig capture [--page <number>] [--range <start>-<end>] [--coords <coords>] [--selector <selector>] [--output-dir <dir>]

For detailed command options, run:
  bitig --help

================================================================================
## BOOK CONFIGURATION REFERENCE (book.json)
================================================================================

book.json is the central configuration file of your book project. It governs both structural properties and visual styling.

### 1. Structural Configuration Options

* title: (Required) The primary title of the book.
* subtitle: (Optional) The subtitle of the book.
* author: (Optional) The author's name.
* description: (Optional) A brief summary of the book.
* assetsDir: (Required) Path to the manuscript directory (default: "./assets").
* distDir: (Required) Path to the output directory (default: "./dist").
* outputFilename: (Required) Filename of the compiled book (default: "book.md").
* epilogueFile: (Optional) Epilogue markdown file (default: "epilogue.md").
* bibliographyFile: (Optional) Bibliography markdown file (default: "bibliography.md").
* pdf: (Optional) Enable/disable PDF compilation (default: true).
* language: (Optional) Locale of the book (default: "tr", supported: "tr", "en", "de", "es", "fr").
* sectionTitles: (Optional) Section folder to header title mappings.
* citations: (Optional) Rules for auto-replacement of citations.
* synopses: (Optional) Chapter summaries coordinate map (e.g. {"1.1": "summary"}).

### 2. Styling & Layout Customization

#### Theme Configurations
* theme: Set a predefined style theme (default: "serif").
  - serif: Merriweather (body) + Montserrat (headings). Classic literary look.
  - sans-serif: Inter (body) + Outfit (headings). Modern, clean look.
  - academic: EB Garamond. Classical look with 3cm margins and paragraph indentation.
* customThemePath: Path to a custom CSS stylesheet file. Completely overrides themes.

#### Customizing Layout and Design using CSS (customThemePath)
By pointing customThemePath to a local CSS file, you can customize every detail:

* Typography: Import Google Fonts and define sizes:
  @import url('https://fonts.googleapis.com/css2?family=Lora&family=Playfair+Display&display=swap');
  body { font-family: 'Lora', serif; font-size: 11.5pt; line-height: 1.7; }
  h1, h2 { font-family: 'Playfair Display', serif; }

* Page Dimensions & Margins: Alter margins and page numbering using CSS @page:
  @page {
    size: A4;
    margin: 2.5cm;
    @bottom-center { content: counter(page); font-size: 9pt; }
  }

* Selective Page Layouts: Customize cover page and TOC specifically to hide page numbers:
  @page cover-page-layout { margin: 0; @bottom-center { content: none; } }
  .cover-page { page: cover-page-layout; padding: 3cm; }
  @page toc-page-layout { @bottom-center { content: none; } }
  .toc-page { page: toc-page-layout; }

* Paragraph Styling: Define alignment, spacing, and indents:
  p { text-align: justify; text-indent: 1cm; margin-bottom: 1.2em; orphans: 3; widows: 3; }
  p:first-of-type { text-indent: 0; }

* Custom Containers: Style blockquotes, code blocks, lists, and tables:
  blockquote { font-style: italic; background-color: #f9f9f9; border-left: 5px solid #d2b48c; padding: 10px 20px; }
`);
}

async function handleDev(cliArgs: CliArgs): Promise<void> {
  let config: BookConfig | undefined;
  try {
    config = loadConfig(cliArgs.config);
    const configPath = getConfigPath(cliArgs.config);
    const port = cliArgs.port || 3000;

    const devServer = new DevServer(config, configPath, port);

    // Graceful shutdown on termination signals
    const shutdown = async () => {
      console.log('\nShutting down dev server...');
      await devServer.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    await devServer.start();
  } catch (error) {
    const err = error as Error;
    const lang = config ? config.language : 'tr';
    console.error(Locale.get('cliErrorFailedStartDevServer', lang), err.message);
    process.exit(1);
  }
}

/**
 * Programmatically updates chapter metadata.
 * @param cliArgs
 */
function handleUpdateMetadata(cliArgs: CliArgs): void {
  const coords = cliArgs.positionals[0];
  if (!coords) {
    console.error(
      'Error: Please specify target chapter coordinates, e.g.: bitig update:metadata 1.1 --synopsis "My Synopsis" --title "My Title"'
    );
    process.exit(1);
  }

  const parts = coords.split('.');
  const sectionNum = parseInt(parts[0], 10);
  const chapterNum = parts.length > 1 ? parseInt(parts[1], 10) : 1;

  if (isNaN(sectionNum) || isNaN(chapterNum)) {
    console.error('Error: Invalid section/chapter coordinates format. Use format X.Y');
    process.exit(1);
  }

  if (cliArgs.synopsis === undefined && cliArgs.title === undefined) {
    console.error('Error: Please specify at least one of --title or --synopsis options to update.');
    process.exit(1);
  }

  let config: BookConfig | undefined;
  try {
    config = loadConfig(cliArgs.config);
    const manager = new BookManager(config, getConfigPath(cliArgs.config));
    manager.updateChapterMetadata(sectionNum, chapterNum, {
      title: cliArgs.title,
      synopsis: cliArgs.synopsis
    });
  } catch (error) {
    const err = error as Error;
    const lang = config ? config.language : 'tr';
    console.error(`Error: Failed to update metadata: ${err.message}`);
    process.exit(1);
  }
}

async function handleCapture(cliArgs: CliArgs): Promise<void> {
  let config: BookConfig | undefined;
  try {
    config = loadConfig(cliArgs.config);
    const configPath = getConfigPath(cliArgs.config);
    const captureManager = new CaptureManager(config, configPath);

    // EPUB chapter capture is a distinct code path
    if (cliArgs.epubChapter) {
      const outputDir = cliArgs.outputDir || path.join(config.distDir, 'screenshots');
      await captureManager.captureEpubChapter(cliArgs.epubChapter, outputDir);
    } else {
      await captureManager.capture({
        page: cliArgs.page,
        range: cliArgs.range,
        coords: cliArgs.coords,
        selector: cliArgs.selector,
        outputDir: cliArgs.outputDir
      });
    }
  } catch (error) {
    const err = error as Error;
    console.error(`Error: Visual capture failed: ${err.message}`);
    process.exit(1);
  }
}
