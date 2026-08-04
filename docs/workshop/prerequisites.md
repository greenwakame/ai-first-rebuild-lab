# 事前準備

ワークショップ当日は環境構築でつまずくと大きく時間を取られます。**参加前に必ずここまで済ませてください。**

リポジトリのcloneは当日、招待を受けてから行います。事前準備には含まれません。

## 必要なもの

- macOSが動作するノートPC（管理者権限があること）
- 安定したネットワーク接続
- GitHubアカウント

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
docker ps
```

`docker ps` がエラーにならないこと（＝Docker Desktopが起動していること）まで確認してください。未導入の場合は [Docker Desktop](https://www.docker.com/products/docker-desktop/) を導入します。

**メモリ割り当ては4GB以上**を推奨します。Docker Desktopの Settings → Resources から確認できます。

## 3. mise

言語ランタイムとCLIのバージョンを固定するために使います。このプロジェクトの日常操作はすべて `mise run <task>` に集約しています。

```bash
brew install mise
mise --version
```

シェルへの有効化（`mise activate`）まで済ませてください。手順は [mise の公式ドキュメント](https://mise.jdx.dev/getting-started.html) を参照してください。zshの場合は次を `~/.zshrc` へ追加します。

```bash
eval "$(mise activate zsh)"
```

追加後、新しいターミナルを開くか `source ~/.zshrc` を実行してください。

## 4. Git の認証設定

当日privateリポジトリをcloneします。HTTPSまたはSSHのどちらかで、GitHubへの認証が通る状態にしておいてください。

### HTTPSの場合（推奨）

GitHub CLIを使うのが簡単です。

```bash
brew install gh
gh auth login -h github.com
gh auth status
```

`gh auth status` でログイン済みと表示されればOKです。

### SSHの場合

```bash
ssh -T git@github.com
```

`Hi <ユーザー名>!` と表示されればOKです。

## 5. 動作確認

次のコマンドがすべてエラーなく応答すれば、事前準備は完了です。

```bash
brew --version && docker ps && mise --version && gh auth status
```

## 当日行うこと（事前準備には含みません）

- privateリポジトリへの招待の受諾
- リポジトリのclone
- `brew bundle`（プロジェクト固有のツール導入）
- `mise install`（ツールチェインの固定）
- `mise run doctor`（環境検証）

これらは招待後でないと実行できないため、当日その場で行います。

## つまずいた場合

事前準備の段階で解決しない問題があれば、Discussionsの「ワークショップ」カテゴリへ投稿してください。当日の時間を環境構築で消費しないよう、事前に解消しておくことを推奨します。

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
