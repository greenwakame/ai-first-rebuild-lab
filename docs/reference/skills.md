# `.agents/skills/` の紹介

`AGENTS.md`（[実物はこちら](agents-md.md)）が共通指示の唯一のソースであるのに対し、`.agents/skills/` は**繰り返し行う手順**を切り出したものです。エージェントに同じ説明を毎回繰り返させないための仕組みです。現在運用しているskillは次のとおりです。

## 一覧

### `deliver-github-issue`

GitHub Issueを起点にした実装フロー全体を扱います。重複Issueの確認、Issueの起票（担当者・ラベル・マイルストーンの設定）、Issue番号を含むブランチ作成、実装、検証、日本語PRの作成、Issueメタデータの同期、人によるマージまでを1つの追跡可能な単位として進めます。

### `inspect-github-pr`

Pull Requestの状態を読み取り専用で検査します。メタデータ、diff、CIチェック、失敗したワークフローの調査を行い、マージやpush、設定変更は行いません。

### `manage-supabase-migration`

Supabaseのスキーマ変更を管理します。バージョン管理されたSQL、ローカルDockerスタックでの検証、ロールバック・復旧手順の整備までを扱い、未承認の本番操作は対象外です。

### `plan-replacement-slice`

旧システムの1機能を、Next.js / Rust / Supabaseを横断する安全な移行スライスとして計画します。旧システムの挙動を確認済み・推定・提案・未確認に分類し、受け入れ基準とデータ照合基準を明文化します。

### `review-sensitive-change`

認証・認可・秘密情報・個人データ・データベース移行・ストレージ・CI・依存関係・デプロイなど、信頼境界に関わる変更をレビューします。通常の正しさやスタイルのレビューの代替ではなく、セキュリティ観点に特化しています。

### `verify-web-slice`

実装・修正したUIをローカルの合成環境で検証します。loading・空状態・エラー・権限拒否・キーボード操作・フォーカス・reduced motion・スクリーンショット・アクセシビリティを確認し、人によるレビューの前段階として使います。

## なぜskillに切り出すか

同じ手順を毎回自然言語で説明すると、説明の粒度がぶれたり、重要な手順が抜けたりします。skillとして固定することで、どのエージェント（Claude Code / Codex）が担当しても同じ手順・同じ基準で作業できるようにしています。詳しくは [development-approach.md](../development-approach.md) を参照してください。

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
