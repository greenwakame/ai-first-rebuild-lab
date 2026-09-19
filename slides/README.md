# 講義スライド

GitHub Pagesで公開する、ワークショップとLTのHTMLスライドです。

- 一覧: <https://greenwakame.github.io/ai-first-rebuild-lab/slides/>
- 配置: `slides/YYYY-MM/<slug>/`
- ライセンス: [CC BY 4.0](../LICENSE)

## 追加方法

1. 開催月の下へ、英数字とハイフンだけのslugでディレクトリを作る。
2. ブラウザから開く入口を `index.html` にする。
3. 発表者ノート、秘密情報、個人情報、絶対パス、公開しない補助資料を含めない。
4. 1200×630pxのPNGプレビュー画像を `assets/images/<slug>-og.png` に追加する。
5. `index.html` にdescription、canonical、OGP、Twitter Cardのメタ情報を追加する。
6. `slides/index.html` に一覧カードを追加する。
7. ローカルHTTP配信で、リンク、操作、狭い画面、外部通信、プレビュー画像のContent-Typeを確認する。
8. Pull Requestの差分を、すべて公開物としてレビューする。

過去のURLは変更しません。内容を大きく改訂する場合は既存資料を上書きせず、新しい開催月または別slugとして追加します。

## 2026年9月

| ディレクトリ | 内容 | 外部通信 |
| --- | --- | --- |
| `ai-first-dev-lt/` | AI-first開発の進め方を紹介する13枚のLT | Google Fonts |
| `ai-development-loop-retrospective/` | AI開発ループの出口条件を振り返る8枚のLT | なし |

`ai-development-loop-retrospective/` の公開版には、発表者ノートと実装引き継ぎ資料を含めていません。
