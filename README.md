# Bitig - OOP Book Compiler and Writing Workflow CLI

Bitig is a structured, type-safe TypeScript command-line tool designed for authors and AI agents to outline, write, analyze, lint, and compile manuscripts into high-quality publications (Markdown, HTML, PDF, and AI-readable metadata).

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
bitig context <sectionNum>.<chapterNum>
```

Produces a focused context window prompt pack for LLM/RAG writers to edit or continue the target chapter. Contains:

- Outlines and synopses of all chapters.
- Complete text of the preceding chapter to maintain tone and narrative flow.
- Visual theme guidelines and citation constraints.

### 7. Workflow Guide

```bash
bitig guide
```

Outputs this writing workflow guide directly to the terminal for easy reading by AI agents.

---

## AI Agent Workflow Guide

When writing or editing using Bitig, follow this recommended workflow loop:

1. **Read Outlines**: Run `bitig stats` to check the manuscript layout.
2. **Retrieve Context**: Run `bitig context <coords>` for the chapter you are writing. Use the preceding chapter text to match vocabulary, character details, and pacing.
3. **Drafting / Updating**:
   - Write your markdown chapter inside its designated file under `assets/section-X/X.Y.md`.
   - Or programmatically update titles or summaries using `bitig update:metadata <coords> --title "Title" --synopsis "Synopsis"`.
4. **Keyword Check**: Use `bitig search "<keyword>"` to check consistency of terms across other sections.
5. **Static Diagnostics**: Run `bitig check` to verify formatting.
6. **Local Preview**: Run `bitig dev` to start the live preview server, open `http://localhost:3000` in a browser, and watch changes compile and hot-reload in real-time.
7. **Compile for Release**: Run `bitig build` to generate the final distribution files (including PDF compilation).
8. **Commit & Format**: Run `git commit -m "your message"`. Husky and `lint-staged` will automatically run Prettier to format your modifications before finalizing the commit.

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
- **`language`** (Optional - `string`): Locale code of the book (default: `"tr"`, supported: `"tr"`, `"en"`). Determines TOC headings and template localizations.
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
