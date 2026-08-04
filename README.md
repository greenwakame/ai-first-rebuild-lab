# ai-first-rebuild-lab

> We are rebuilding, from scratch, a business system that was previously used in-house, with Next.js, Rust, and Supabase, using an AI-first development process where coding agents implement under human-authored design decisions and review. This repository holds no code — it is the public entry point for people considering joining, and for workshop participants, before they get access to the private development repository.

社内で過去に利用していた業務システムを、Next.js / Rust / Supabase を中心とした構成へゼロから作り直しています。特徴は、AIコーディングエージェントによる実装を前提にした開発プロセスそのものにあります。

## このリポジトリは何か

**開発は別のprivateリポジトリで行っています。** ここは、参加を検討している方と、ワークショップ参加者のための入口です。コードは含まれていません。

privateリポジトリは参加しないと閲覧できないため、事前にプロジェクト内容を判断する手段がありませんでした。このリポジトリは、設計判断・開発の進め方・進捗状況を公開することでその問題を解決します。

## 技術スタックと現在のフェーズ

- **Next.js**（Vercel） — 画面、SSR/BFF
- **Rust**（Render） — 業務ルール、認可、トランザクション
- **Supabase**（PostgreSQL / Auth / Storage）

現在はPhase 5「業務機能移行」が進行中です。詳しくは [roadmap.md](docs/roadmap.md) を参照してください。

## 参加を検討している方へ

[how-to-join.md](docs/how-to-join.md) を参照してください。社内メンバー、有志、自己学習目的の方、いずれも歓迎します。

## ワークショップ参加者の方へ

[workshop/](docs/workshop/README.md) を参照してください。

## 主要文書

| 文書 | 内容 |
| --- | --- |
| [project-overview.md](docs/project-overview.md) | 何を作っているか、なぜ作り直すか |
| [architecture.md](docs/architecture.md) | 技術構成とサービス境界 |
| [development-approach.md](docs/development-approach.md) | AI-first開発・ADR駆動・契約優先・検証文化 |
| [roadmap.md](docs/roadmap.md) | フェーズと現在地 |
| [how-to-join.md](docs/how-to-join.md) | 参加方法 |
| [faq.md](docs/faq.md) | よくある質問 |
| [adr/](docs/adr/) | 設計判断の記録（21件） |
| [reference/agents-md.md](docs/reference/agents-md.md) | AIエージェント向け共通指示の実物 |
| [reference/skills.md](docs/reference/skills.md) | 再利用可能な作業手順の紹介 |
| [workshop/](docs/workshop/README.md) | ワークショップ資料 |

## 質問・参加申込

このリポジトリのDiscussionsをご利用ください。

- 「参加申込」カテゴリ — 開発参加の希望
- 「質問」カテゴリ — プロジェクトや技術構成についての質問
- 「ワークショップ」カテゴリ — 開催告知、事前質問、当日Q&A

## Pull Requestについて

このリポジトリは外部からのPull Requestを受け付けていません。開発はprivateリポジトリで行っています。誤字脱字などの指摘はDiscussionsの「質問」カテゴリでお知らせください。

## ライセンス

このリポジトリの文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。帰属表示があれば、コピー、共有、改変が可能です。

## 行動規範

[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) を参照してください。
