# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root.
- **`docs/adr/`**: read Architecture Decision Records touching the area you are about to modify.

If either doesn't exist yet, proceed silently without prompting. They will be created lazily when terms or decisions are locked down via `/domain-modeling` or `/grill-with-docs`.

## File structure

Single-context repo:

```
/
├── GLOSSARY.md
├── docs/adr/
│   └── 0001-example-decision.md
├── docs/agents/
│   ├── issue-tracker.md
│   ├── triage-labels.md
│   └── domain.md
├── data/
├── scripts/
└── website/
```

## Use the glossary's vocabulary

When naming domain concepts (in issue titles, test descriptions, code variables, or commit messages), use the terms defined in `GLOSSARY.md`.
