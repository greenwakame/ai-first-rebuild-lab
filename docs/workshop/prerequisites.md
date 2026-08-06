<p align="right"><sub><a href="../../README.md">← README</a> · <a href="README.md">← ワークショップ</a></sub></p>

# 事前準備

> [!WARNING]
> ワークショップ当日は環境構築でつまずくと大きく時間を取られます。**参加前に必ずここまで済ませてください。**

リポジトリのcloneは当日、招待を受けてから行います。事前準備には含まれません。

## 対象環境

次のいずれかを対象とします。

- macOS
- Windows 11 + WSL2（Ubuntu 24.04）

Windowsでは、**WSL2（Ubuntu）内で開発コマンドを実行します。**
ネイティブWindows（PowerShell）での開発手順は対象外です。

## チェックリスト

- [ ] 対象環境を満たすノートPC（管理者権限があること）
  - macOS
  - Windows 11 + WSL2（Ubuntu 24.04）
- [ ] 安定したネットワーク接続
- [ ] GitHubアカウント
- [ ] [**AIコーディングエージェントのアカウント**](#0-aiコーディングエージェントのアカウント)（有料。**最も見落とされやすい項目です**）
- [ ] [1. OS別の基本ツール](#1-os別の基本ツール)
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
| macOSでの導入 | `brew install --cask claude-code` | 公式の導入手順を参照 |
| Windows 11 + WSL2での導入 | WSL2内へClaude Code CLIを導入 | WSL2内へCodex CLIを導入 |

導入後、それぞれのツールでサインインまで済ませておいてください。

<details>
<summary><b>補足: 無料プランや他の方法について</b></summary>

<br>

**無料プランについて。** Claude の Free プランに Claude Code は含まれません。Codex の Free プランは公式に「quick coding tasks」向けと説明されており、より安価な Go プラン（$8/月）もあります。

ただし、**無料枠や下位プランでワークショップ1件分の作業を完遂できるかは検証していません。** 確実に参加したい場合は上記の有料プランを推奨します。

**Claude Code はAPI課金でも利用できます。** 公式ドキュメントには「Most surfaces require a Claude subscription or Anthropic Console account」とあり、[Anthropic Console](https://console.anthropic.com/) のアカウントでも使えます。既にAPIを使っている方はそちらでも構いません。

**より上位のプラン**（Claude Max、ChatGPT Pro、いずれも$100/月〜）もありますが、ワークショップには不要です。

</details>

## 1. OS別の基本ツール

### macOS

Homebrewをパッケージ管理に使います。

```bash
brew --version
```

未導入の場合は [brew.sh](https://brew.sh/) の手順に従って導入してください。

### Windows 11 + WSL2

Windows 11へWSL2とUbuntu 24.04を導入します。

管理者権限でWindows TerminalまたはPowerShellを開き、次を実行します。

```powershell
wsl --install -d Ubuntu-24.04
```

インストール後、Ubuntuを起動してLinuxユーザーを作成します。

WSL2として起動していることをWindows側で確認します。

```powershell
wsl --list --verbose
```

`Ubuntu-24.04` の `VERSION` が `2` であることを確認してください。

Ubuntu内で基本ツールを導入します。

```bash
sudo apt update
sudo apt install -y \
  build-essential \
  curl \
  git \
  unzip \
  zip \
  ca-certificates \
  gnupg \
  jq \
  sed \
  ripgrep \
  gh
```

導入後に確認します。

```bash
git --version
curl --version | head -n 1
jq --version
sed --version | head -n 1
rg --version
gh --version
```

リポジトリは `/mnt/c/Users/...` 配下ではなく、`~/src` などWSL2側のLinuxファイルシステムへcloneしてください。

```bash
mkdir -p ~/src
cd ~/src
```

## 2. Docker Desktop

ローカルのPostgreSQL（Supabase）を起動するために使います。

Docker DesktopはWindowsまたはmacOS側へインストールします。WSL2のUbuntu内へDocker Engineを別途インストールする構成は使用しません。

### macOS

Docker Desktopを起動し、次がエラーにならないことを確認します。

```bash
docker --version
docker ps
```

### Windows 11 + WSL2

Docker Desktopで以下を有効にします。

1. Settings → General → **Use the WSL 2 based engine**
2. Settings → Resources → WSL Integration
3. **Ubuntu-24.04** のIntegrationを有効化
4. Apply & restart

設定後、必要に応じてWindows側でWSLを再起動します。

```powershell
wsl --shutdown
wsl -d Ubuntu-24.04
```

Ubuntu内で次を実行します。

```bash
docker version
docker info
docker run --rm hello-world
docker compose version
```

`docker version` に `Client` と `Server` の両方が表示され、`hello-world` が成功すれば準備完了です。

> [!TIP]
> **メモリ割り当ては4GB以上**を推奨します。Docker Desktopの Settings → Resources から確認できます。

## 3. mise

言語ランタイムとCLIのバージョンを固定するために使います。このプロジェクトの日常操作はすべて `mise run <task>` に集約しています。

### macOS

Homebrewから導入します。

```bash
brew install mise
```

zshへの有効化例です。

```bash
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc
source ~/.zshrc
```

### Windows 11 + WSL2

Ubuntu内でLinux版miseを導入します。

```bash
curl https://mise.run/bash | sh
source ~/.bashrc
```

導入後に確認します。

```bash
mise --version
mise doctor
```

`mise doctor` が `No problems found` で終了することを確認してください。

## 4. Git の認証設定

当日privateリポジトリをcloneします。HTTPSまたはSSHのどちらかで、GitHubへの認証が通る状態にしておいてください。

<details open>
<summary><b>HTTPSの場合（推奨）</b></summary>

<br>

GitHub CLIを使います。

macOSではHomebrewから導入します。

```bash
brew install gh
```

WSL2では、前述のUbuntu基本ツール導入時に `gh` をインストールします。

GitHubへログインします。

```bash
gh auth login
```

選択内容は次を推奨します。

```text
GitHub.com
HTTPS
Authenticate Git with your GitHub credentials: Yes
Login with a web browser
```

WSL2からWindows側ブラウザを自動起動できない場合は、ターミナルに表示された次のURLをWindows側ブラウザで手動で開きます。

```text
https://github.com/login/device
```

表示されたワンタイムコードを入力し、認証を完了します。

```bash
gh auth status
```

Git operations protocolが `https` で、利用するGitHubアカウントへログイン済みと表示されればOKです。

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

### macOS

次がすべてエラーなく応答することを確認します。

```bash
brew --version
docker ps
mise --version
gh auth status
```

### Windows 11 + WSL2

Ubuntu内で次がすべてエラーなく応答することを確認します。

```bash
docker ps
mise --version
gh auth status
git --version
rg --version
```

あわせて、導入したAIコーディングエージェントが起動し、サインイン済みであることを確認してください。

Claude Codeを選んだ場合：

```bash
claude --version
```

Codexを選んだ場合：

```bash
codex --version
```

> [!NOTE]
> `mise run doctor:claude-desktop` はClaude Desktopの確認タスクです。
> WSL2/Linuxでは対象外として扱い、Windows側のClaude Desktopアプリとは別に確認します。

## 当日行うこと（事前準備には含みません）

招待後でないと実行できないため、当日その場で行います。

| # | 手順 | コマンド |
| --- | --- | --- |
| 1 | privateリポジトリへの招待の受諾 | — |
| 2 | WSL2の場合はLinux側の作業ディレクトリへ移動 | `mkdir -p ~/src && cd ~/src` |
| 3 | リポジトリのclone | `git clone …` |
| 4 | macOSの共通CLI導入 | macOSのみ: `brew bundle` |
| 5 | macOS専用アプリの導入 | macOSのみ: `brew bundle --file Brewfile.macos` |
| 6 | ツールチェインの固定 | `mise install` |
| 7 | プロジェクト依存の導入 | `mise run install` |
| 8 | ツール確認 | `mise run doctor` |
| 9 | 外部接続確認 | `mise run doctor:external` |
| 10 | リポジトリ全体の検証 | `mise run check` |

ローカルdatabaseを使う作業では、信頼できるnetwork上でのみSupabaseを起動します。

```bash
mise run supabase:start
mise run check:db
mise run supabase:status

# 作業終了後
mise run supabase:stop
```

## つまずいた場合

事前準備の段階で解決しない問題があれば、Discussionsの「**ワークショップ**」カテゴリへ投稿してください。当日の時間を環境構築で消費しないよう、事前に解消しておくことを推奨します。

投稿時には、credentialやtokenを含めず、次を記載してください。

- Windows / macOSのバージョン
- WSL2の場合は `wsl --version` と `cat /etc/os-release`
- 実行したコマンド
- エラーメッセージ
- `docker version`
- `mise --version`

## 次に読む

| 文書 | 内容 |
| --- | --- |
| [agenda.md](agenda.md) | 当日の流れ |
| [issue-walkthrough.md](issue-walkthrough.md) | 着手からマージまでの実例 |

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
