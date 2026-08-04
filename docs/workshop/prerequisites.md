<p align="right"><sub><a href="../../README.md">← README</a> · <a href="README.md">← ワークショップ</a></sub></p>

# 事前準備

> [!WARNING]
> ワークショップ当日は環境構築でつまずくと大きく時間を取られます。**参加前に必ずここまで済ませてください。**

リポジトリのcloneは当日、招待を受けてから行います。事前準備には含まれません。

## チェックリスト

- [ ] macOSが動作するノートPC（管理者権限があること）
- [ ] 安定したネットワーク接続
- [ ] GitHubアカウント
- [ ] [1. Homebrew](#1-homebrew)
- [ ] [2. Docker Desktop](#2-docker-desktop)
- [ ] [3. mise](#3-mise)
- [ ] [4. Git の認証設定](#4-git-の認証設定)
- [ ] [5. 動作確認](#5-動作確認)

## 1. Homebrew

パッケージ管理に使います。

```bash
brew --version
```

未導入の場合は [brew.sh](https://brew.sh/) の手順に従って導入してください。

## 2. Docker Desktop

ローカルのPostgreSQL（Supabase）を起動するために使います。

```bash
docker --version
```

```bash
docker ps
```

`docker ps` がエラーにならないこと（＝Docker Desktopが起動していること）まで確認してください。未導入の場合は [Docker Desktop](https://www.docker.com/products/docker-desktop/) を導入します。

> [!TIP]
> **メモリ割り当ては4GB以上**を推奨します。Docker Desktopの Settings → Resources から確認できます。

## 3. mise

言語ランタイムとCLIのバージョンを固定するために使います。このプロジェクトの日常操作はすべて `mise run <task>` に集約しています。

```bash
brew install mise
```

```bash
mise --version
```

シェルへの有効化（`mise activate`）まで済ませてください。手順は [mise の公式ドキュメント](https://mise.jdx.dev/getting-started.html) を参照してください。zshの場合は次を `~/.zshrc` へ追加します。

```bash
eval "$(mise activate zsh)"
```

追加後、新しいターミナルを開くか `source ~/.zshrc` を実行してください。

## 4. Git の認証設定

当日privateリポジトリをcloneします。HTTPSまたはSSHのどちらかで、GitHubへの認証が通る状態にしておいてください。

<details open>
<summary><b>HTTPSの場合（推奨）</b></summary>

<br>

GitHub CLIを使うのが簡単です。

```bash
brew install gh
```

```bash
gh auth login -h github.com
```

```bash
gh auth status
```

`gh auth status` でログイン済みと表示されればOKです。

</details>

<details>
<summary><b>SSHの場合</b></summary>

<br>

```bash
ssh -T git@github.com
```

`Hi <ユーザー名>!` と表示されればOKです。

</details>

## 5. 動作確認

次のコマンドがすべてエラーなく応答すれば、事前準備は完了です。

```bash
brew --version && docker ps && mise --version && gh auth status
```

## 当日行うこと（事前準備には含みません）

招待後でないと実行できないため、当日その場で行います。

| # | 手順 | コマンド |
| --- | --- | --- |
| 1 | privateリポジトリへの招待の受諾 | — |
| 2 | リポジトリのclone | `git clone …` |
| 3 | プロジェクト固有のツール導入 | `brew bundle` |
| 4 | ツールチェインの固定 | `mise install` |
| 5 | 環境検証 | `mise run doctor` |

## つまずいた場合

事前準備の段階で解決しない問題があれば、Discussionsの「**ワークショップ**」カテゴリへ投稿してください。当日の時間を環境構築で消費しないよう、事前に解消しておくことを推奨します。

## 次に読む

| 文書 | 内容 |
| --- | --- |
| [agenda.md](agenda.md) | 当日の流れ |
| [issue-walkthrough.md](issue-walkthrough.md) | 着手からマージまでの実例 |

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
