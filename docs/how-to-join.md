<p align="right"><sub><a href="../README.md">← README へ戻る</a></sub></p>

# 参加方法

社内メンバー、有志の方、自己学習目的の方、**いずれも歓迎します。区別はしません。**

> [!NOTE]
> **開発で使うのは合成データだけです。** 実在する人物の情報や、実際に運用されていたデータをローカル環境やCIへ持ち込まない方針を、プロジェクトの非交渉事項として定めています。参加にあたって機密情報の取り扱いを心配する必要はありません。

## 参加の流れ

参加はDiscussionsの「参加申込」カテゴリへの投稿から始まります。私たちは**段階的に**アクセスをお渡しする方針を採っています。

| 段階 | 内容 | 得られるもの |
| --- | --- | --- |
| **1. 申込** | Discussionsの「参加申込」カテゴリへ、動機・使える時間・関心領域を書いて投稿 | — |
| **2. ワークショップ参加**<br>（該当する場合） | [ワークショップ](workshop/README.md) に参加 | 当日限定の一時アクセス |
| **3. 実績の確認** | ワークショップでのIssue着手・PR提出、またはDiscussionsでのやり取り | — |
| **4. 招待** | 実績を踏まえてご案内 | privateリポジトリのcollaborator権限 |

> [!IMPORTANT]
> 公開リポジトリは誰でも見られますが、**privateへの招待は段階的です。** 開発用のリポジトリは実際に動いている作業場所であり、参加者が増えるとレビューや進行の調整に相応の手間がかかるためです。すぐに招待をお約束できない場合がある点をご了承ください。

## 事前に準備できること

このリポジトリのcloneは不要です。招待後に行います。事前に準備できるのは次の環境です。

- [ ] macOS、またはWindows 11 + WSL2（Ubuntu 24.04）
- [ ] macOSの場合は [Homebrew](https://brew.sh/)
- [ ] Windows 11の場合はWSL2とUbuntu 24.04
- [ ] Docker Desktop
- [ ] [mise](https://mise.jdx.dev/)
- [ ] GitHubアカウント
- [ ] **AIコーディングエージェントのアカウント**（下記参照）

> [!NOTE]
> WindowsはWSL2（Ubuntu 24.04）経由のみを対象とします。
> ネイティブWindows／PowerShellでの開発手順は、このプロジェクトでは保証していません。

### AIコーディングエージェントのアカウントが必要です

> [!IMPORTANT]
> このプロジェクトはAIコーディングエージェントによる実装を前提にしています。**アカウントの費用は自己負担**です。参加を検討される際にご確認ください。

**Claude Code と Codex のどちらか一方があれば十分です。** 両方は必要ありません。

| | 必要なプラン | 価格 | 申込 |
| --- | --- | --- | --- |
| **Claude Code** | Claude Pro | **$20/月**（年払いなら $17/月） | [claude.com/pricing](https://claude.com/pricing) |
| **Codex** | ChatGPT Plus | **$20/月** | [learn.chatgpt.com/codex/pricing](https://learn.chatgpt.com/codex/pricing) |

Claude Code は [Anthropic Console](https://console.anthropic.com/) のアカウント（API課金）でも利用できます。より安価なプランや無料枠も存在しますが、それらで作業を完遂できるかは検証していません。

導入手順を含む詳しい説明は [prerequisites.md](workshop/prerequisites.md) にあります。

## 招待後の流れ

| # | 手順 | コマンド |
| --- | --- | --- |
| 1 | collaborator招待を受け、privateリポジトリをclone | `git clone …` |
| 2 | OS別の依存を導入 | macOS: `brew bundle` / WSL2: Ubuntu用事前準備 |
| 3 | macOS専用アプリを導入 | macOSのみ: `brew bundle --file Brewfile.macos` |
| 4 | ツールチェインを固定 | `mise install` |
| 5 | プロジェクト依存を導入 | `mise run install` |
| 6 | 環境を検証 | `mise run doctor` と `mise run doctor:external` |
| 7 | 担当するIssueについて合意 | — |
| 8 | 実装 | — |
| 9 | Pull Requestを提出 | — |

## 求める姿勢

- **AIコーディングエージェントが生成した差分を、自分で検証すること。** 「生成されたから正しい」とは考えません
- 最終的には `greenwakame` のレビューを経ること
- [開発の進め方](development-approach.md) に沿って作業すること

## 質問がある場合

Discussionsの「質問」カテゴリへ投稿してください。[faq.md](faq.md) によくある質問をまとめています。

## 次に読む

| 文書 | 内容 |
| --- | --- |
| [workshop/README.md](workshop/README.md) | ワークショップ開催概要 |
| [faq.md](faq.md) | よくある質問 |
| [development-approach.md](development-approach.md) | 開発の進め方 |

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
