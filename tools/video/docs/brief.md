# 制作ブリーフ

参加検討者に、機能単位の再構築、設計先行、AI実装と人の検証、設計判断を学べる場であることを伝える。無音で理解できる30秒のローカル初版。

画面内コピー・6場面の順序・拍数・素材・配色・案内は `data/film.json` を唯一の正とする。`pnpm run docs` が `docs/storyboard.md` を派生生成する。動画は同じJSONをRemotion propsで受け取る。

四つの枠を全編の共通モチーフとする。業務機能からサービス境界、工程、要求のつながりへ変形し、最後は四つの印へ収束。冒頭のみ意味のある機能名と粒子を併用。SVG/CSSで奥行きを作り、Three.jsとGPUシミュレーションは不要と判断した。文字へのブラー・点滅は使用しない。長文の自動縮小・省略なし。

128 BPMの64拍を60fpsへ絶対時刻で変換する。図解は早めに全要素を表示し、読む時間を確保。終盤は2行の大きなタイポグラフィと静止時間を優先する。

## 事実と出典

- `README.md`, `docs/project-overview.md`: 機能単位で段階的に旧業務システムを再構築。実データは使用しない。
- `docs/architecture.md`: Browser → Next.js → Rust API → PostgreSQLは代表的な更新経路。Auth/Storageを含む完全図ではない。
- `docs/development-approach.md`: 設計と完了条件を合意し、AIが実装、人が差分を読み検証。要求チェックは共変更規約の違反を検出し、意味の正しさまでは保証しない。検出後は停止・報告し、人が判断する。
- `docs/workshop/README.md`: 設計判断と検証の過程を学ぶ。参加申込とアクセス付与は別手順。
- `index.html`: canonical URL、設計図リンク、参加案内の #join を確認。URLはこの既存公開情報に基づく。新規公開はしない。
- `assets/css/landing.css`, `assets/js/hero.js`, `.github/banner.svg`: ネイビー、ミント、青、紫と四つの境界の世界観を継承。
- `assets/js/trace.js`: デモの意図を確認。ただしcommit trailerを必須として動画に描かない。検出結果はすべて説明用デモであり、実行ログ・証拠ではない。

元資料: ai-first-rebuild-lab / greenwakame、文書 CC BY 4.0。上記文書を動画用に要約・再構成。https://github.com/greenwakame/ai-first-rebuild-lab / https://creativecommons.org/licenses/by/4.0/

## 技術判断と参考

Remotionの公式導入、parameterized rendering、renderMedia/renderStill APIを参照。自動skill導入を含む雛形コマンドは実行せず、必要なパッケージだけを固定導入。

- https://www.remotion.dev/docs
- https://www.remotion.dev/docs/parameterized-rendering
- https://www.remotion.dev/docs/renderer/render-media
- https://www.remotion.dev/docs/renderer/render-still
- https://www.remotion.dev/showcase

Xの2投稿はユーザー提供の説明を演出参考にした。今回、投稿動画の再生・ソース検証はしていない。ロゴ、素材、音楽、固有構図は使用していない。

制作ソース・依存関係・フォント・出力はtools/videoに独立配置。静的サイトのコード・実行時依存・ビルド工程は変更しない。外部への資料アップロード、GitHub書き込み、公開、デプロイは行わない。
