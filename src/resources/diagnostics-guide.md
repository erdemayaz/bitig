# BITIG - SEMANTIC DIAGNOSTICS & QUALITY SCORING GUIDE

This guide explains how to use `bitig`'s semantic diagnostics and quality scoring infrastructure. It is designed to help both human editors and AI writing agents assess manuscript quality, score chapters, log evaluations, and run an autonomous quality-improvement loop.

---

## 🛠️ The Architecture: Facilitator Pattern

`bitig` is strictly a **local CPU/memory tool**. It does **not** connect to external LLM APIs itself. Instead, it acts as a **facilitator**:

1. **`bitig`** packages the chapter manuscript and the quality guidelines into a single prompt context.
2. **The AI Agent** reads this context, performs the LLM evaluation, and outputs raw scores to a temporary JSON file.
3. **`bitig`** reads the temporary JSON, calculates weighted/normalized scores, formats a zero-dependency ASCII report table, and saves the final diagnostic record.

---

## 🔄 Step-by-Step Workflow

### 1. Initialize Quality Guidelines (`bitig analyze:init`)

Before starting evaluations, you must set up the project's quality guidelines. Run:

```bash
bitig analyze:init [--file <custom_template.json>]
```

- **Without Options**: Scaffolds a default `quality-guidelines.json` file in the project root containing standard literary criteria (Accuracy, Progression, Transitions, Readability, Completeness, Consistency, Intelligibility) with default weights.
- **With `--file`**: Reads and validates a custom template JSON file defined by the AI agent or editor. This allows tailoring criteria and weights to the book's specific genre (e.g., higher weight for Plot Consistency in novels, higher weight for Technical Accuracy in textbooks).

### 2. Package Evaluation Context (`bitig analyze:context`)

To evaluate a specific chapter (e.g., Section 1, Chapter 2), run:

```bash
bitig analyze:context 1.2
```

This packages the manuscript content of `1.2.md` and the `quality-guidelines.json` parameters into a single structured prompt payload and prints it to stdout.

### 3. AI Agent Quality Evaluation

The AI Agent takes the packaged context from Step 2, feeds it into its LLM, and scores each criterion on a scale of `0-100`. The LLM also generates constructive qualitative feedback.
The AI Agent then writes this evaluation into a temporary JSON file (e.g., `temp_diagnostic.json`).

### 4. Process and Log Report (`bitig analyze:report`)

The AI Agent feeds the temporary JSON file back to `bitig`:

```bash
bitig analyze:report 1.2 --file temp_diagnostic.json
```

`bitig` parses the scores, computes the weighted average based on the active criteria weights, prints an ASCII grid table directly to the console, and writes a permanent timestamped report under `diagnostics/diagnostic_1.2.json`.

---

## 📋 JSON Schema Formats

### 1. Quality Guidelines (`quality-guidelines.json`)

This file defines what criteria are evaluated and how much weight each holds.

```json
{
  "projectType": "general",
  "baseScore": 100,
  "criteria": {
    "AccuracyAndVeracity": {
      "weight": 0.25,
      "description": "Bilgilerin doğruluğu ve kaynakların güvenilirliği.",
      "enabled": true
    },
    "LogicalProgression": {
      "weight": 0.15,
      "description": "Fikirlerin veya olay örgüsünün mantıksal bir sırayla ilerlemesi.",
      "enabled": true
    },
    "Transitions": {
      "weight": 0.1,
      "description": "Paragraflar ve bölümler arası geçişlerin akıcılığı.",
      "enabled": true
    }
  },
  "customRules": ["Genel kaliteyi düşürecek tekrarlardan kaçınılmalıdır."]
}
```

### 2. AI Agent Temporary Output File

This is the schema the AI Agent must write into the file passed via `--file`.

```json
{
  "scores": {
    "AccuracyAndVeracity": 90,
    "LogicalProgression": 85,
    "Transitions": 75,
    "ReadabilityAndMechanics": 92,
    "CompletenessAndScope": 88,
    "Consistency": 90,
    "Intelligibility": 95
  },
  "feedback": "The chapter has good flow, but the transition in paragraph 3 is slightly abrupt."
}
```

---

## 🤖 The AI Agent Quality Loop (Self-Correction)

AI agents can run an autonomous loop to iterate on a chapter until it meets a specific quality threshold:

```text
[1. Write/Edit Chapter]
          │
          ▼
[2. Run bitig analyze:context] ──► Package text + guidelines
          │
          ▼
[3. LLM Evaluation] ──► Score chapter & write to temp.json
          │
          ▼
[4. Run bitig analyze:report] ──► Compute weighted score & log
          │
          ▼
   [Score >= 85?]
     ├─── Yes ──► [5. Run bitig update:metadata] ──► Update synopsis & Complete!
     └─── No  ──► [5. Run bitig learn] ──► Save feedback in memory.json
                        │
                        ▼
                  [6. Re-draft Chapter using memory guidelines]
                        │
                        └─► Loop back to Step 2
```

By following this flow, AI writing agents can maintain high editorial standards without human supervision.
