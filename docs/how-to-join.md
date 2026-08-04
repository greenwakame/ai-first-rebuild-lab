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

- [ ] macOS
- [ ] [Homebrew](https://brew.sh/)
- [ ] Docker Desktop
- [ ] [mise](https://mise.jdx.dev/)
- [ ] GitHubアカウント

ワークショップ参加者向けの詳しい手順は [prerequisites.md](workshop/prerequisites.md) にあります。

## 招待後の流れ

| # | 手順 | コマンド |
| --- | --- | --- |
| 1 | collaborator招待を受け、privateリポジトリをclone | `git clone …` |
| 2 | 必要なツールを導入 | `brew bundle` |
| 3 | ツールチェインを固定 | `mise install` |
| 4 | 環境を検証 | `mise run doctor` |
| 5 | 担当するIssueについて合意 | — |
| 6 | 実装 | — |
| 7 | Pull Requestを提出 | — |

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
