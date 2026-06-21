# Bitig - OOP Book Compiler and Writing Workflow CLI

![TypeScript](https://img.shields.io/badge/TypeScript-%23007ACC.svg?logo=typescript&logoColor=white)
![NPM Version](https://img.shields.io/npm/v/@erdemayaz/bitig.svg)
![License](https://img.shields.io/npm/l/@erdemayaz/bitig.svg)
![Coverage](https://img.shields.io/badge/coverage-97%25-brightgreen)
![Code Style](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)
![Languages](https://img.shields.io/badge/languages-TR%20%7C%20EN%20%7C%20DE%20%7C%20ES%20%7C%20FR-blueviolet)

Bitig is a structured, type-safe TypeScript command-line tool designed for authors and AI agents to outline, write, analyze, lint, and compile manuscripts into high-quality publications (Markdown, HTML, PDF, and AI-readable metadata).

📍 **[Project Roadmap](roadmap.md)** — View our active roadmap and upcoming features.

---

## Getting Started

To initialize a template book structure in your current working directory, run:

```bash
bitig init
```

This creates:

- `book.json`: Configuration for titles, authors, styling, sections, and automated citations.
- `assets/`: Folders for chapters and sections (e.g. `section-0/0.1.md`, `section-1/1.1.md`).
- `assets/epilogue.md` and `assets/bibliography.md`: Placeholder markdown files.

---

## Command Reference

### 1. Compiling the Book

```bash
bitig build [options]
```

Generates outputs inside the `dist/` directory.

- `--no-pdf`: Compiles Markdown, HTML, and AI metadata but skips Puppeteer PDF rendering.
- `--epub`: Enables EPUB 3 compilation (opt-in; disabled by default). Overrides `epub: false` in `book.json`.
- `--no-epub`: Disables EPUB compilation even if `epub: true` is set in `book.json`.
- `-t, --theme <serif|sans-serif|academic>`: Overrides the visual stylesheet.
- `-c, --config <path>`: Points to a custom configuration JSON (defaults to `./book.json`).

### 2. Manuscript Structure Management

Instead of manually renaming files and hacking config paths, manage your book structure with:

```bash
# Add a new section folder and update book.json
bitig add:section 2 --title "The Silicon Mind"

# Add a chapter file under section 2
bitig add:chapter 2.1 --title "First Breath of the Machine"

# Move/re-index a chapter file and references
bitig move:chapter 2.1 2.2

# Delete a chapter markdown file
bitig delete:chapter 2.2
```

### 3. Writing Statistics

```bash
bitig stats
```

Displays draft statistics (word count, reading time estimation) and structural layout mapping.

### 4. Integrity Checks & Diagnostics

```bash
bitig check
```

Scans the manuscript for:

- Odd number of backticks (unclosed code blocks).
- Broken internal links pointing to non-existent markdown chapters.
- Citation terms declared in `book.json` that are unused in the text.

### 5. Semantic Search

```bash
bitig search "<keyword>"
```

Crawls all chapter files and returns line matches, files, line numbers, and headings.

### 6. AI Agent Context Packaging

```bash
bitig context <sectionNum>.<chapterNum> [--memory <layers>]
```

Produces a focused context window prompt pack for LLM/RAG writers to edit or continue the target chapter. Contains outlines, synopses, preceding chapter content, visual theme guidelines, and injected memory layers.

- `--memory <layers>`: Comma-separated list of memory layers to inject (options: `global`, `section`, `chapter` or `none`. Default: all layers).

### 7. AI Agent Learning & Memory

```bash
bitig learn <scope> [options]
```

Updates the persistent AI agent memory log (`memory.json`).

- `<scope>`: Can be `global`, `section:<secNum>` (or `<secNum>`), or `chapter:<coords>` (or `<coords>`, e.g., `1.3`).
- `--feedback "<text>"`: Adds user/agent feedback comments.
- `--style "<text>"`: Adds layout or style instructions.
- `--routine "<text>"`: Adds workflow/action rule constraints.
- `--clear`: Clears memory for the specified scope.

_Example:_

```bash
bitig learn global --feedback "Benden izinsiz git commit yapma"
bitig learn 1.3 --style "Formülü italik yaz"
```

### 8. Visual Screenshot Capture

```bash
bitig capture [options]
```

Generates PNG screenshots of compiled PDF pages, specific HTML sections/chapters, or EPUB chapter renders for layout verification (useful for visual regression checks by AI agents).

- `--page <number>`: Capture a specific page of the PDF (default: 1).
- `--range <start>-<end>`: Capture a range of pages (e.g. `1-3`).
- `--coords <coords>`: Capture a specific chapter by section/chapter coordinates from the HTML (e.g. `1.1`).
- `--selector <selector>`: Capture a specific HTML element using CSS selector (e.g. `".cover-page"`).
- `--epub-chapter <coords>`: Render and screenshot a specific EPUB chapter by coordinates (e.g. `1.1`). No `.epub` file is required — XHTML is generated on-the-fly.
- `--output-dir <dir>`: Custom folder to save screenshots (defaults to `dist/screenshots`).

### 9. Workflow Guide

```bash
bitig guide
```

Outputs this writing workflow guide directly to the terminal for easy reading by AI agents.

### 10. Semantic Diagnostics Guide

```bash
bitig diagnostics-guide
```

Outputs the detailed step-by-step semantic diagnostics and quality scoring guide directly to the terminal for easy reading by AI agents.

### 11. Semantic Diagnostics & Quality Scoring

Provide a framework to analyze manuscript quality (e.g. style consistency, narrative flow, readability) using AI evaluations based on custom rubrics. For a complete guide on how this loop works, run `bitig diagnostics-guide`.

```bash
# Initialize a template quality-guidelines.json schema in the project root
bitig analyze:init [--file <custom_template_json>]

# Generate a unified payload of the chapter manuscript + quality guidelines for the AI agent
bitig analyze:context <sectionNum>.<chapterNum>

# Format and record the AI evaluation JSON report into an ASCII table and save it to the diagnostics/ folder
bitig analyze:report <sectionNum>.<chapterNum> --file <path_to_ai_evaluation_json>
```

- **`analyze:init`**: Creates a custom scoring schema (`quality-guidelines.json`) where editors or AI agents can define evaluation criteria (Accuracy, Progression, Transitions, Readability, Completeness, Consistency, Intelligibility) and assign fractional weights. If `--file <path>` is supplied, it reads and validates the custom template JSON and initializes the guidelines with those custom criteria and weights.
- **`analyze:context`**: Combines the guidelines and target chapter content into a text package, which the AI agent can read to analyze and score the chapter.
- **`analyze:report`**: Reads a temporary evaluation JSON file generated by the AI agent containing criteria scores and qualitative feedback, calculates a weighted score out of 100, prints a beautifully structured zero-dependency ASCII table, and saves a permanent log under `diagnostics/diagnostic_<section>.<chapter>.json`.

---

## AI Agent Workflow Guide

When writing or editing using Bitig, you can leverage the **AI-First Autonomous Loop** to write, verify, and summarize content without human intervention:

### 🤖 The AI-First Autonomous Loop

AI agents can execute a complete autonomous loop to draft, visually inspect, score, and summarize chapters:

1. **`bitig context <coords>`**: Retrieve the complete RAG prompt pack for the chapter you are writing. This feeds you preceding chapter text, outline constraints, injected memory logs, and tone rules so you can match vocabulary and pacing perfectly.
2. **Draft/Edit the content**: Write or update the markdown file under `assets/section-X/X.Y.md`.
3. **`bitig capture --coords <coords>`** (or `--epub-chapter <coords>`): Generate a visual screenshot of the rendered chapter (either PDF/HTML or EPUB) to verify visual layout, font scaling, or custom CSS rules programmatically.
4. **`bitig analyze:context <coords>`**: Package the chapter manuscript with custom scoring rubrics defined in `quality-guidelines.json` so you can evaluate the quality of the written chapter.
5. **Evaluate & Score**: Perform the quality diagnostic evaluation on the packed context, and output a temporary JSON file (e.g. `temp_diagnostic.json`).
6. **`bitig analyze:report <coords> --file <path>`**: Parse and format the evaluation JSON into an ASCII CLI report table, while saving a permanent log in the `diagnostics/` folder.
7. **`bitig learn <coords> --feedback "feedback"`**: Feed back any stylistic corrections or instructions to ensure subsequent generations adapt.
8. **`bitig update:metadata <coords> --synopsis "..."`**: Programmatically write a concise summary (synopsis) of what you wrote back to `book.json`. This updates the book's index so subsequent AI agents writing later chapters have an accurate summary of your chapter.

---

### General Workflow Loop

1. **Read Outlines**: Run `bitig stats` to check the manuscript layout.
2. **Retrieve Context**: Run `bitig context <coords>` for the chapter you are writing. Use the preceding chapter text to match vocabulary, character details, and pacing.
3. **Drafting / Updating**:
   - Write your markdown chapter inside its designated file under `assets/section-X/X.Y.md`.
   - Or programmatically update titles or summaries using `bitig update:metadata <coords> --title "Title" --synopsis "Synopsis"`.
4. **Keyword Check**: Use `bitig search "<keyword>"` to check consistency of terms across other sections.
5. **Diagnostics & Quality Checks**:
   - Run `bitig check` to verify formatting.
   - Run `bitig analyze:context <coords>` and evaluate, then report with `bitig analyze:report <coords> --file <path>` to verify manuscript quality.
6. **Local Preview**: Run `bitig dev` to start the live preview server, open `http://localhost:3000` in a browser, and watch changes compile and hot-reload in real-time.
7. **Visual Verification**: Run `bitig capture` to generate layout screenshots of specific pages or chapters and verify visual styling programmatically.
8. **Compile for Release**: Run `bitig build` to generate the final distribution files (including PDF compilation).
9. **Commit & Format**: Run `git commit -m "your message"`. Husky and `lint-staged` will automatically run Prettier to format your modifications before finalizing the commit.

---

## Book Configuration Reference (book.json)

`book.json` is the central configuration file of your book project. It governs both structural properties (e.g. metadata, files) and visual styling (e.g. themes, custom CSS, layout parameters).

### 1. Structural Configuration Options

- **`title`** (Required - `string`): The primary title of the book. Printed on the cover page, headers, and metadata.
- **`subtitle`** (Optional - `string`): The subtitle of the book. Printed below the title.
- **`author`** (Optional - `string`): The author's name. Printed on the cover page and metadata.
- **`description`** (Optional - `string`): A brief summary of the book. Printed on the cover page and used in metadata.
- **`assetsDir`** (Required - `string`): Path to the manuscript directory (default: `"./assets"`). Contains section directories (e.g. `section-1`) and special chapters.
- **`distDir`** (Required - `string`): Path to the output directory (default: `"./dist"`). Compiles to Markdown, HTML, PDF, and JSON.
- **`outputFilename`** (Required - `string`): Filename of the compiled book (default: `"book.md"`). Basename is used to name HTML (`book.html`) and PDF (`book.pdf`).
- **`epilogueFile`** (Optional - `string`): Name of the epilogue file under `assetsDir` (default: `"epilogue.md"`). Treated as Section 998.
- **`bibliographyFile`** (Optional - `string`): Name of the bibliography file under `assetsDir` (default: `"bibliography.md"`). Treated as Section 999.
- **`pdf`** (Optional - `boolean`): Enables/disables PDF compilation via Puppeteer (default: `true`).
- **`epub`** (Optional - `boolean`): Enables/disables EPUB 3 compilation (default: `false`, opt-in). Set to `true` to generate a `.epub` file alongside the PDF. Can also be enabled with the `--epub` CLI flag without modifying `book.json`.
- **`language`** (Optional - `string`): Locale code of the book (default: `"tr"`, supported: `"tr"`, `"en"`, `"de"`, `"es"`, `"fr"`). Determines TOC headings and template localizations.
- **`sectionTitles`** (Optional - `Record<string, string>`): Map of section folder numbers (e.g. `"1"`) to section header titles.
- **`citations`** (Optional - `Array<{ term: string, replacement: string }>`): Auto-replacement rules for inserting reference citations (e.g., term matching to HTML footnotes).
- **`synopses`** (Optional - `Record<string, string>`): Coordinate mapping of custom summaries for chapters (e.g. `"1.1": "Chapter 1.1 synopsis"`).

### 2. Styling & Layout Customization

#### Theme Configurations

- **`theme`** (Optional - `string`): Set a predefined style theme (default: `"serif"`).
  - **`serif`**: Uses **Merriweather** for body and **Montserrat** for headings. Offers a classic literary look.
  - **`sans-serif`**: Uses **Inter** for body and **Outfit** for headings. Modern, clean look.
  - **`academic`**: Uses **EB Garamond** for body and headings. Clean classical look with 3cm margins and paragraph indentation.
- **`customThemePath`** (Optional - `string`): Path to a custom CSS stylesheet file. If provided, completely overrides the predefined themes.

#### Customizing Layout and Design using CSS (customThemePath)

By pointing `customThemePath` to a local CSS file (e.g. `"./custom.css"`), you can customize every detail of the book's look and feel for HTML and PDF outputs:

- **Typography & Fonts**: Import Google Fonts or system fonts, and define font sizes:

  ```css
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');

  body {
    font-family: 'Lora', serif;
    font-size: 11.5pt;
    line-height: 1.7;
    color: #222222;
  }
  h1,
  h2,
  h3 {
    font-family: 'Playfair Display', serif;
    color: #111111;
  }
  ```

- **Page Dimensions & Margins**: Use CSS `@page` selectors to alter page sizes, margins, headers, and footers (which affect PDF printing):
  ```css
  @page {
    size: A4; /* Options: A4, A5, letter, etc. */
    margin: 2.5cm 2.5cm 2.5cm 2.5cm; /* Custom margins */
    @bottom-center {
      content: counter(page); /* Page number alignment */
      font-size: 9pt;
      font-family: sans-serif;
    }
  }
  ```
- **Selective Page Layouts**: Customize cover and TOC pages separately to suppress page numbers:

  ```css
  /* Cover layout */
  @page cover-page-layout {
    margin: 0;
    @bottom-center {
      content: none;
    } /* Hide page numbers on cover */
  }
  .cover-page {
    page: cover-page-layout;
    padding: 3cm;
  }

  /* Table of Contents layout */
  @page toc-page-layout {
    @bottom-center {
      content: none;
    } /* Hide page numbers on TOC */
  }
  .toc-page {
    page: toc-page-layout;
  }
  ```

- **Paragraph Styling**: Define alignment, line spaces, and indentation:
  ```css
  p {
    text-align: justify; /* Justified text for clean margins */
    text-indent: 1cm; /* First line paragraph indent */
    margin-bottom: 1.2em;
    orphans: 3;
    widows: 3;
  }
  p:first-of-type {
    text-indent: 0; /* Remove indent from first paragraph */
  }
  ```
- **Custom Containers**: Style elements like blockquotes, code snippets, lists, and tables:
  ```css
  blockquote {
    font-style: italic;
    background-color: #f9f9f9;
    border-left: 5px solid #d2b48c; /* Custom left border color */
    padding: 10px 20px;
    margin: 1.5em 0;
  }
  ```
