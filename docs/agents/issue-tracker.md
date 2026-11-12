# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues on `MiaShopgal/tailo_practice` (or the active fork). Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --json number,title,body,labels,comments`.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Make an issue a sub-issue of a parent**: `gh issue create --parent <parent> ...`, or `gh issue edit <parent> --add-sub-issue <child>` afterwards (`gh` 2.94+). Without sub-issues, put `Part of #<parent>` at the top of the child body.
- **Blocking**: Native issue dependencies or a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Count open blockers**: `gh api repos/<owner>/<repo>/issues/<n> --jq .issue_dependencies_summary.blocked_by` (or parse `Blocked by: #<n>` lines from the issue body).
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close an issue**: post the summary/explanation with `gh issue comment <number> --body "..."`, then `gh issue close <number>`.

## Fork vs Upstream Targeting

- In a fork, file development issues into your fork's GitHub repository. Confirm with `gh repo view --json nameWithOwner`.
- If `gh` defaults to upstream `luke871016/tailo_practice`, set your fork as default: `gh repo set-default MiaShopgal/tailo_practice`.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## When a skill says "publish to the issue tracker"

Create a GitHub issue via `gh issue create`.

## When a skill says "fetch the relevant ticket"

Read it via `gh issue view <number>`.
