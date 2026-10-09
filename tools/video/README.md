# 紹介動画のローカル制作環境

静的サイトとは独立したRemotion制作ディレクトリ。公開サイトのビルドや実行に依存を追加しない。

## 再現

Node.js 24、pnpm 11.25.0を使用。macOS 15以降がRemotionの要件。今回の実測環境はmacOS Darwin 27 arm64 / Node 24.19.0。各Remotionパッケージは4.0.529に完全固定。

このディレクトリで実行:

今回の環境ではシェルのPATHにNodeがなかったため、Codex desktop同梱ランタイムを使用した。`./video` は通常のPATHを優先し、見つからない場合だけ同梱ランタイムを検出する。ユーザー固有の絶対パスやグローバル設定は不要。

```sh
./video check
./video render
./video verify
./video studio
```

新規チェックアウトでは最初に `./video install`。通常のNode/pnpmがPATHにある環境では、次のコマンドも同じ動作になる。

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm studio
```

StudioのローカルURLは起動ログに表示される。閉じるときはCtrl+C。

```sh
pnpm prototype  # 日本語・書き出しの3秒試作
pnpm render     # 30秒MP4、ポスター、6場面一覧、転換チェック画像
pnpm verify     # 実ファイルのメタデータ・全フレームのデコードなど
```

初回レンダリング時のみRemotionがChrome Headless Shellを取得する。今回のバージョンは149.0.7790.0。インストールスクリプトは無効のまま、同梱されるOS別バイナリで検証済み。必要なら `REMOTION_BROWSER_EXECUTABLE` 環境変数にブラウザを指定できる（ソースへマシン固有パスを記入しない）。ネットワーク・ローカルサーバー・ブラウザ起動の権限が必要になる環境では通常の許可経路で実行する。

## 文言・配色の変更

`data/film.json` の見出し・本文・補足・要素・theme・ctaを編集し、`pnpm check && pnpm render`。描画コードの変更は不要。

```sh
pnpm variant
pnpm render --input out/variant.json --name my-variant
```

variantコマンドは元データを変更せず、別JSONの文言・配色を変えた3秒の試作を生成する。上の2行目は別JSONを30秒に書き出す例。任意propsは `{ "film": <場面データ> }` の形でRemotionにも渡せる。CLIから渡した場合もcalculateMetadataでスキーマを検証する。

`src/schema.ts` のZodスキーマは必須項目・対応種類・ID重複・尺・合計64拍・文字量・素材参照を実行時検証する。長文はエラーとし、切り捨てや自動縮小はしない。素材は同梱フォントだけを許可し、書き出しスクリプトでファイル存在とSHA-256も照合。HTMLやコードを実行する入力欄はない。URLは文字として表示し、レンダラーがリモート素材を取得する機能はない。新しい文言は書き出した画像でも確認する。

場面は配列順、各場面の`beats`で表示時間を管理する。総尺は固定30秒。`Math.round(累計拍 × 60 × 60 / 128)`で境界を計算し、1拍の丸め誤差を累積しない。すべての動きはフレームから決まり、実時間や非固定乱数に依存しない。

## 資料と成果物

- `data/film.json`: 制作データの唯一の正
- `src/schema.ts`: 検証スキーマ
- `docs/brief.md`: 制作ブリーフ・事実の出典
- `docs/storyboard.md`: データから生成した6場面の絵コンテ・コピー
- `docs/verification.md`: 実施した検証と未確認事項
- `public/fonts/`: 固定フォント・OFL・出典・ハッシュ
- `out/ai-first-rebuild-lab-v1.mp4`: 正式初版、H.264/yuv420p、無音
- `out/poster.png`: 最終画面、1920×1080
- `out/scenes.png`: 6場面を幅640pxずつ配置した一覧
- `out/review.html`: MP4・画像をまとめたローカルレビュー画面
- `out/*-render.json`: 書き出し実測値
- `out/media-verification.json`: ffprobeとデコード等の結果

`node_modules/`, `out/`, `.cache/`, `build/`はGit対象外。依存関係はlockfileで固定。公開時に使うMP4・ポスター等の選択とサイト統合は別工程。

元の公開文書（greenwakame / ai-first-rebuild-lab、CC BY 4.0）を要約・再構成している。帰属と参照元は制作ブリーフに記録。フォントは同梱OFL、Remotionは同梱パッケージのLICENSE.mdを参照。
