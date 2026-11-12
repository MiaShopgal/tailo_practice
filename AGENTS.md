# Project Guidelines & Agent Workflow

Welcome to **練台羅 (tailo_practice)**, a web application for practicing Taiwanese Romanization (Tâi-lô) phonetics, tones, tone sandhi, and typing.

## Agent Skills

### Skills Setup (for Contributors / Forkers)

If your coding agent doesn't have Matt Pocock's skills yet, install them in one step:
- **Claude Code**: `claude plugin install mattpocock-skills@claude-plugins-official`
- **Cursor / Codex / Other**: `npx skills@latest add mattpocock/skills`
- **Gemini CLI / Antigravity**: see global config in `~/.gemini/config/skills/`

### Issue Tracker

GitHub Issues on `MiaShopgal/tailo_practice` (or your active fork) managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage Labels

Canonical five-role triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`, and `spec`). See `docs/agents/triage-labels.md`.

### Domain Docs

Single-context repository layout (`GLOSSARY.md` and `docs/adr/`). See `docs/agents/domain.md`.

---

## The Workflow: Idea → GitHub Issue → Ship

Every task or feature follows Matt Pocock's disciplined Idea-to-Ship flow backed by GitHub Issues:

```
[Idea / Request]
       │
       ▼
1. Clarify & Grill (/grill-with-docs)
   - Relentlessly resolve decisions and edge cases.
   - Record ubiquitous terms in GLOSSARY.md and design choices in docs/adr/.
       │
       ▼
2. Write Spec (/to-spec)
   - Formalize requirements into a specification.
   - Publish as a GitHub Issue labeled `spec`.
       │
       ▼
3. Slice into Tickets (/to-tickets)
   - Break down the spec into atomic, tracer-bullet GitHub Issues.
   - Mark dependencies using `Blocked by: #<id>` and parent link `Part of #<spec>`.
   - Apply `ready-for-agent` label to unblocked tickets.
       │
       ▼
4. Implement (/implement & /tdd)
   - Select the next unblocked ticket from the frontier.
   - Develop test-first: Red → Green → Refactor.
       │
       ▼
5. Review & Pull Request (/code-review & /pr)
   - Run dual-axis review: Standards (clean code) + Spec Conformance.
   - Create PR referencing the issue (`Closes #<id>`).
       │
       ▼
6. Close & Retrospective (/retro)
   - Close resolved issue with a summary comment.
   - Run /retro to turn agent mistakes into automated checks or updated rules here.
```

---

## Contributing Upstream (`luke871016/tailo_practice`)

To keep pull requests sent to upstream clean, atomic, and free of fork-specific configuration:
1. Always base upstream PR branches directly on `upstream/main`:
   ```bash
   git fetch upstream
   git checkout -b feature/my-change upstream/main
   ```
2. Commit only code changes relevant to the upstream feature or bug fix.
3. Submit the pull request from `feature/my-change` → `upstream/main`.

---

## Project Structure Quick Reference

- `website/`: Frontend web application (HTML, CSS, JavaScript, data).
- `data/`: Source vocabularies, dictionaries, and word frequencies.
- `scripts/`: Data build scripts (e.g., `build_tone_data.py`).
- `docs/agents/`: Configuration docs for agent workflows and issue tracking.
