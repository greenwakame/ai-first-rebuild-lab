# `AGENTS.md` の実物

このプロジェクトでAIコーディングエージェント（Claude Code、Codex）に与えている共通指示の実物です。抽象的な説明ではなく、実際に使っている指示文をそのまま掲載します。

これがこのプロジェクトの開発体制の核であり、[development-approach.md](../development-approach.md) で説明した「AI-first開発」の具体的な実装です。

## 読み方のポイント

- **ミッションと境界を先に固定**しています。何を作るか、どこまでが書き込み対象か、アーキテクチャ上の境界はどこかを、エージェントが毎回推測しなくて済むように明文化しています。
- **作業手順（Working method）をGitHub Issue駆動**にしています。Issueを計画の単位にし、ブランチ命名規則、PRの書き方、メタデータ同期まで固定することで、複数のエージェント・複数の人が同じ規律で作業できるようにしています。
- **検証基準（Validation expectations）を明文化**しています。「コードが生成されただけでは完了していない」という原則は、AIエージェントに実装を任せる以上、最も重要な歯止めです。
- **要求トレーサビリティ（Requirement traceability）を規約に組み込んでいます。** 仕様の受け入れ条件にIDを与え、実装とテストへマーカーで結び、ズレを検出したらエージェントは**整合を取らずに停止して人へ報告する**と明記しています。「AIが仕様のほうを書き換えて辻褄を合わせる」という失敗モードへの、明示的な歯止めです。運用規約の実物は [requirements-md.md](requirements-md.md)、判断の経緯は [ADR 0023](../adr/0023-requirement-traceability-and-drift-detection.md) にあります。
- **コードレビュー基準（Code review rules）**は、秘密情報の露出、認証・認可の突破、破壊的なデータ移行、API/スキーマの互換性破壊、信頼境界での検証漏れ、再現不能なビルド/テスト/デプロイなど、実害につながる観点を優先しています。

## 実物

```markdown
# Works Replacement Agent Guide

## Mission

Replace the legacy Works internal system with a secure, reproducible system built around Next.js, Rust, Supabase, Vercel, Render, GitHub Actions, Homebrew, and mise.

Optimize for correctness, traceability, and incremental migration. Do not optimize for a large one-shot rewrite.

## Start here

Before substantial work, read the documents relevant to the task:

- `docs/migration-context.md` for confirmed legacy facts and risks.
- `docs/replacement-roadmap.md` for the target boundary and migration phases.
- `docs/ai-development.md` for the AI-first working model.

Treat documentation as evidence with a date and scope. Distinguish confirmed facts, inferences, proposals, and unknowns.

## Repository boundaries

- This repository is the only write target unless the user explicitly authorizes another location.
- Treat any local legacy project checkout as read-only evidence. Do not write its absolute path into a tracked file; record it only in the gitignored `CLAUDE.local.md`.
- Never copy legacy secrets, certificates, private keys, SQL data dumps, user images, or other personal data into this repository.
- Preserve unrelated user changes. Do not clean, reset, discard, or rewrite work you did not create.

## Architecture boundaries

- `apps/web`: Next.js UI and thin server-side integration for Vercel.
- `apps/api`: Rust API for business rules, authorization, transactions, and Render deployment.
- `crates`: reusable Rust domain and migration code.
- `supabase`: PostgreSQL migrations and anonymous development seed data.
- Browser business-data writes go through the Rust API.
- Supabase provides PostgreSQL, Auth, and Storage. Keep privileged credentials server-side.
- Define API contracts explicitly and generate clients where practical.
- Record durable or difficult-to-reverse architecture decisions under `docs/adr/`.

These paths are the target layout. Do not invent placeholder applications merely to satisfy the layout; add them when the corresponding slice begins.

## Working method

Use a GitHub issue as the unit of planned repository work. Before creating a
branch, resolve the active GitHub account with `gh api user --jq .login` and
confirm the issue has exactly that account assigned, plus an appropriate
milestone and labels. Do not fall back to a repository-owner account when the
active account is missing or cannot be assigned. Confirm exactly one
`agent:codex` or `agent:claude` routing label matches the primary agent. Name branches
`<agent>/<issue-number>-<slug>`, where `<agent>` is `codex` or `claude`
according to the primary agent when the branch is created. Keep that prefix if
the work is handed off later. Write pull
requests in Japanese with `Closes #<issue-number>`, copy the Issue assignee,
labels, and milestone to the pull request, and leave the final merge to the user
unless they explicitly delegate it. A pull request is not ready for handoff
until `mise run github:pr:sync-metadata -- <issue> <pr>` succeeds and the
structured pull request metadata has been re-read.

Use the acting contributor's own GitHub-associated commit identity. Never
impersonate the active account or another collaborator. The Issue and pull
request assignee records the account currently responsible for GitHub writes;
it does not authorize commit impersonation or replace the human merge owner.

For each task:

1. State the outcome and inspect the smallest relevant source set.
2. Plan first when the change crosses services, affects data/auth/security, or has multiple viable designs.
3. Implement the smallest complete vertical slice.
4. Add or update tests and documentation with the behavior change.
5. Run the relevant format, lint, type, test, build, migration, and security checks.
6. Review the final diff for regressions, security exposure, generated artifacts, and unrelated changes.
7. Report what changed, what passed, and what remains unverified.

Use `mise run <task>` as the canonical command surface once tasks exist. Until bootstrap is complete, do not invent passing commands; document missing automation instead.

## Requirement traceability

Requirements are the acceptance criteria of a specification, not roadmap
bullets. `docs/features/` holds user-facing feature specifications;
`docs/requirements/` holds cross-cutting ones. Each criterion carries a
`REQ-<AREA>-<NNN>` identifier and one entry in
`docs/requirements/registry.yaml`. ADR decisions use the separate
`ADR-<NNNN>-D<n>` series. The full convention is
[`docs/requirements/README.md`](docs/requirements/README.md); the decision is
ADR 0023.

- Every acceptance criterion in a registered specification carries an
  identifier. Do not add an unnumbered one.
- Link implementation and tests with a `// @req REQ-...` marker.
- Run `mise run req:check` before opening a pull request, and
  `mise run req:impact -- <ID>` before asking for approval of a design change.
- Code that is not yet numbered stays out of scope. **When you change such code
  and the change corresponds to a requirement, write the requirement and number
  it before implementing.**
- Do not number a requirement reverse-generated from existing code. A restated
  implementation always matches the code and can never reveal drift, and later
  sessions read it as a human decision.
- Do not edit an applied migration to place a marker, and do not put one inside
  a SQL string literal. Mark the calling code instead.

**When the check reports drift, stop and report it to the user.** Do not resolve
a finding by rewriting the specification, by lowering `status`, or by moving a
requirement to a weaker `kind`. Those are the failure modes this exists to
catch; the judgement belongs to the user.

## Data and security

- Never log, paste, commit, or expose secret values or personal data.
- Use synthetic or irreversibly anonymized fixtures only.
- Authentication and authorization are separate concerns; verify both.
- Preserve legacy authorization semantics until a reviewed replacement matrix exists.
- Every schema change needs forward migration, compatibility impact, validation query, and rollback or recovery notes.
- Prefer database constraints and transactional invariants over prompt-only or application-only guarantees.
- Treat skills, hooks, MCP servers, CI workflows, and dependency scripts as executable supply-chain surfaces. Review before enabling.

## Validation expectations

- A task is not complete because code was generated.
- Do not claim a check passed unless it was run successfully in the current worktree.
- Test at the lowest useful layer and add cross-service/E2E coverage for user-visible flows.
- For migrations, compare schema, row counts, key relationships, and representative checksums without exposing row values.
- For UI work, verify loading, empty, error, permission-denied, and narrow-screen states.
- If a required check cannot run, explain the concrete blocker and leave a reproducible next command.

## Documentation maintenance

- Update existing documents instead of creating competing sources of truth.
- Keep this file concise and universally applicable.
- Move repeatable procedures into focused skills under `.agents/skills/`.
- Move service-specific rules into a nested `AGENTS.md` only after that service exists.
- When the same agent correction occurs twice, propose a narrow update to this file, a skill, or an enforceable check.

## Code review rules

Prioritize findings that can cause:

- secret or personal-data exposure;
- authentication or authorization bypass;
- destructive or irreversible data migration;
- broken API/schema compatibility;
- missing validation at a trust boundary;
- non-reproducible build, test, deploy, or rollback behavior.

Formatting preferences belong in formatters and CI, not review prose.
```

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
