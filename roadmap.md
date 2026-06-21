# Bitig CLI - Project Roadmap

This document outlines the planned feature roadmap for the **Bitig** book compiler and writing ecosystem. These features aim to expand output formats, enhance visual layout control, improve AI agent collaboration, and provide tools for narrative and content diagnostics.

---

## 🗺️ Feature Roadmap

### [COMPLETED] 1. EPUB Compilation & Visual Testing Support

- **Objective**: Add EPUB as a primary export target format alongside Markdown, HTML, and PDF.
- **Details**:
  - Implement a new compiler target to bundle and export to standard **EPUB 3** format.
  - Ensure all layout customization capabilities (themes, typography, metadata) align between EPUB and PDF.
  - Extend the `bitig capture` layout screenshot testing framework to emulate and verify EPUB viewer dimensions.

### [COMPLETED] 2. Legal & Publishing Metadata Standards

- **Objective**: Integrate industry-standard metadata into the book configuration and output headers.
- **Details**:
  - Support configuration keys in `book.json` for publishing parameters:
    - **`isbn`**: International Standard Book Number.
    - **`publisher`**: Publishing house or entity.
    - **`publishDate`**: Standard date format.
    - **`copyright`**: Rights statement and license (e.g., Creative Commons, All Rights Reserved).
  - Automatically render legal copyright pages and insert metadata tags into HTML header blocks and EPUB packages.

### 3. Asset & Image Management

- **Objective**: Introduce structured support for media files inside the book assets, ensuring reliable local paths and correct rendering across HTML and PDF outputs.
- **Details**:
  - Standardize a media assets directory (e.g., `assets/images/`) within the workspace.
  - Automatically copy, bundle, and resolve image assets during compilation (`bitig build`).
  - Support responsive visual container styles in predefined stylesheets.
  - _Prerequisite for advanced cover layout designs._

### [COMPLETED] 4. Semantic Diagnostics & Quality Scoring Guide

- **Objective**: Introduce a framework to analyze manuscript quality (e.g. style consistency, narrative flow, interdisciplinarity, rationality) using AI evaluations.
- **Details**:
  - Add a scoring guideline schema (`quality-guidelines.json`) where editors can define rubrics and style guides (implemented via `bitig analyze:init`).
  - Implement CLI helper utilities to package evaluations context (`bitig analyze:context`) and report diagnostic evaluations (`bitig analyze:report --file <file>`) back to the CLI.
  - Reports are formatted in a clean zero-dependency ASCII table directly in stdout and logged to local files under `diagnostics/`.

### [COMPLETED] 5. AI Agent Thought Logging & Learning History

- **Objective**: Create a persistent history and memory mechanism for AI writing assistants to log internal rationale, feedback, and key style configurations.
- **Details**:
  - Introduce an agent memory file (`memory.json`) in the book workspace root.
  - Allow writing assistants to programmatically append "lessons learned", user preferences, or characters' tone details.
  - Enrich the `bitig context <coords>` command to automatically inject past notes, feedback history, and context-specific rules into the RAG prompt package.

### 6. Fiction & Narrative Planning Tools

- **Objective**: Provide structured database models for managing plot structures and character arcs, targeted at creative writing and novels.
- **Details**:
  - Support defining character profiles (e.g., attributes, relationships, descriptions) inside a structured database file (`assets/characters.json`).
  - Support plot outlines, timelines, and narrative constraints inside `assets/plot.json`.
  - Include character details and event outlines inside the AI agent prompt package (`bitig context`) to help writing agents avoid narrative contradictions and maintain character consistency.

### 7. Advanced Cover Design System (Research & Implementation)

- **Objective**: Research and design customizable cover templates and graphics, building on top of the core Asset Management module.
- **Details**:
  - Implement customizable cover designs supporting full-page background images, title alignments, and geometric color blocks.
  - Provide easy configuration overrides in `book.json` to load background graphics and set front cover layouts.

### 8. CSS & Bibliography Validation

- **Objective**: Add static validation checks to ensure all CSS classes used in manuscript files exist in the stylesheet, and all bibliography citations are correctly referenced.
- **Details**:
  - Extend the `bitig check` / `bitig lint` command to scan markdown content for undeclared CSS classes.
  - Cross-check met citation numbers with entries in the bibliography source files to detect broken or missing references.

### 9. Compact Configuration & Predefined Layout Profiles

- **Objective**: Make the configuration structure compact and introduce predefined layout profiles matching different book genres (e.g., novels, scientific papers, textbooks) while keeping the core schema flexible and generic.
- **Details**:
  - Allow defining a `profile` key in `book.json` (e.g., `"profile": "novel"` or `"profile": "academic-article"`) that automatically configures visual templates, styling rules, page dimensions, and page numbering conventions.
  - Maintain a clean, minimal root configuration schema where custom parameters can still override profile defaults.
