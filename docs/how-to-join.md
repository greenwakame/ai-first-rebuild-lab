# 参加方法

## 対象

社内メンバー、有志の方、自己学習目的の方、いずれも歓迎します。区別はしません。

## 参加の流れ

参加はDiscussionsの「参加申込」カテゴリへの投稿から始まります。私たちは**段階的に**アクセスをお渡しする方針を採っています。

1. **申込**: Discussionsの「参加申込」カテゴリへ、動機・使える時間・関心領域を書いて投稿してください
2. **ワークショップ参加（該当する場合）**: [workshop/](workshop/README.md) を参照してください。ワークショップ参加者には、当日限定の一時アクセスをお渡しします
3. **実績の確認**: ワークショップでのIssue着手・PR提出、またはDiscussionsでのやり取りを通じて、継続的な参加意思を確認します
4. **private リポジトリへの招待**: 実績を踏まえてcollaborator権限をお渡しします。開発は非公開リポジトリで行っています

公開リポジトリは誰でも見られますが、privateへの招待は選別を伴います。この非対称は、業務データを扱うシステムである以上の制約です。すぐに招待をお約束できない場合がある点をご了承ください。

## 事前に準備できること

このリポジトリのcloneは不要です。招待後に行います。事前に準備できるのは次の環境です。

- macOS
- [Homebrew](https://brew.sh/)
- Docker Desktop
- [mise](https://mise.jdx.dev/)
- GitHubアカウント

## 招待後の流れ

1. collaborator招待を受け、privateリポジトリをclone
2. `brew bundle` で必要なツールを導入
3. `mise install` でツールチェインを固定
4. `mise run doctor` で環境を検証
5. 担当するIssueについて合意
6. 実装
7. Pull Requestを提出

## 求める姿勢

- AIコーディングエージェントが生成した差分を、自分で検証すること。「生成されたから正しい」とは考えません
- 最終的には `greenwakame` のレビューを経ること
- 開発の進め方（[development-approach.md](development-approach.md)）に沿って作業すること

## 質問がある場合

Discussionsの「質問」カテゴリへ投稿してください。[faq.md](faq.md) によくある質問をまとめています。

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
