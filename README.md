# Bitig - OOP Book Compiler and Writing Workflow CLI

Bitig is a structured, type-safe TypeScript command-line tool designed for authors and AI agents to outline, write, analyze, lint, and compile manuscripts into high-quality publications (Markdown, HTML, PDF, and AI-readable metadata).

---

## 🚀 Getting Started

To initialize a template book structure in your current working directory, run:

```bash
bitig init
```

This creates:

- `book.json`: Configuration for titles, authors, styling, sections, and automated citations.
- `assets/`: Folders for chapters and sections (e.g. `section-0/0.1.md`, `section-1/1.1.md`).
- `assets/epilogue.md` and `assets/bibliography.md`: Placeholder markdown files.

---

## 🛠 Command Reference

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

## 🤖 AI Agent Workflow Guide

When writing or editing using Bitig, follow this recommended workflow loop:

1. **Read Outlines**: Run `bitig stats` to check the manuscript layout.
2. **Retrieve Context**: Run `bitig context <coords>` for the chapter you are writing. Use the preceding chapter text to match vocabulary, character details, and pacing.
3. **Drafting**: Write your markdown chapter inside its designated file under `assets/section-X/X.Y.md`.
4. **Keyword Check**: Use `bitig search "<keyword>"` to check consistency of terms across other sections.
5. **Static Diagnostics**: Run `bitig check` to verify formatting.
6. **Compile**: Run `bitig build` to generate the final distribution files.
