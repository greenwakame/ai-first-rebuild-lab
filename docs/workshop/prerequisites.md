<p align="right"><sub><a href="../../README.md">← README</a> · <a href="README.md">← ワークショップ</a></sub></p>

# 事前準備

> [!WARNING]
> ワークショップ当日は環境構築でつまずくと大きく時間を取られます。**参加前に必ずここまで済ませてください。**

リポジトリのcloneは当日、招待を受けてから行います。事前準備には含まれません。

## チェックリスト

- [ ] macOSが動作するノートPC（管理者権限があること）
- [ ] 安定したネットワーク接続
- [ ] GitHubアカウント
- [ ] [**AIコーディングエージェントのアカウント**](#0-aiコーディングエージェントのアカウント)（有料。**最も見落とされやすい項目です**）
- [ ] [1. Homebrew](#1-homebrew)
- [ ] [2. Docker Desktop](#2-docker-desktop)
- [ ] [3. mise](#3-mise)
- [ ] [4. Git の認証設定](#4-git-の認証設定)
- [ ] [5. 動作確認](#5-動作確認)

## 0. AIコーディングエージェントのアカウント

> [!IMPORTANT]
> **このプロジェクトはAIコーディングエージェントによる実装を前提にしています。** アカウントがないと当日の作業ができません。**費用は自己負担**です。

**Claude Code と Codex のどちらか一方があれば十分です。** 両方は必要ありません。使い慣れているほう、あるいは試してみたいほうを選んでください。

| | Claude Code | Codex |
| --- | --- | --- |
| 必要なプラン | **Claude Pro** | **ChatGPT Plus** |
| 価格 | **$20/月**（月払い）<br>$17/月（年払い、$200一括） | **$20/月** |
| 申込 | [claude.com/pricing](https://claude.com/pricing) | [learn.chatgpt.com/codex/pricing](https://learn.chatgpt.com/codex/pricing) |
| 導入 | `brew install --cask claude-code` | `curl -fsSL https://chatgpt.com/codex/install.sh \| sh` |

導入後、それぞれのツールでサインインまで済ませておいてください。

<details>
<summary><b>補足: 無料プランや他の方法について</b></summary>

<br>

**無料プランについて。** Claude の Free プランに Claude Code は含まれません。Codex の Free プランは公式に「quick coding tasks」向けと説明されており、より安価な Go プラン（$8/月）もあります。

ただし、**無料枠や下位プランでワークショップ1件分の作業を完遂できるかは検証していません。** 確実に参加したい場合は上記の有料プランを推奨します。

**Claude Code はAPI課金でも利用できます。** 公式ドキュメントには「Most surfaces require a Claude subscription or Anthropic Console account」とあり、[Anthropic Console](https://console.anthropic.com/) のアカウントでも使えます。既にAPIを使っている方はそちらでも構いません。

**より上位のプラン**（Claude Max、ChatGPT Pro、いずれも$100/月〜）もありますが、ワークショップには不要です。

</details>

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

あわせて、導入したAIコーディングエージェントが起動しサインイン済みであることを確認してください。

```bash
claude --version
```

Codexを選んだ場合は、`codex` コマンドが起動しサインイン済みであることを確認します。

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
