# ADR 0020: フロントエンドCSS基盤とdesign tokenの機械的強制

- Status: Accepted
- Date: 2026-08-01
- Tracking: GitHub Issue #74
- Supersedes: なし
- Amends: Phase 4B設計文書 `docs/features/phase-4b-member-experience.md` 8章「Design system baseline」の未決事項
- Amended: 2026-08-01 (GitHub Issue #77), 2026-08-02 (GitHub Issue #79), 2026-08-02 (GitHub Issue #81), 2026-08-02 (GitHub Issue #83), 2026-08-02 (GitHub Issue #87), 2026-08-03 (GitHub Issue #90)

## Context

### 経緯

Phase 4B（Issue #45 / PR #58）で認証後UIの情報設計、responsive方針、design token案、component一覧、accessibility受け入れ基準を承認した。設計文書は `Approved as implementation baseline; visual finish deferred` と明記し、component libraryとicon packageの採否を実装Issueへ委ねている。その後 #59 から #66 でAppShell、メンバー一覧、プロフィール詳細、自己紹介、プロフィール写真へ設計を適用したが、CSS基盤そのものの決定は行われないまま画面数が増え続けている。

### 現状の実測

`apps/web/app/styles.css` を origin/main（d4f154a）時点で計測した結果は次のとおりである。

| 指標                         | 実測値                                                          | Phase 4B設計文書の想定                        |
| ---------------------------- | --------------------------------------------------------------- | --------------------------------------------- |
| 行数 / class数               | 1,704行 / 227 class                                             | 単一ファイルを前提としていない                |
| 変更履歴                     | 11 commitで +1,779 / -75                                        | 統合を伴う更新を想定                          |
| custom property定義数        | 14                                                              | `--color-*` 10種 + `--space-*` + `--radius-*` |
| 設計文書の `--color-*` token | **未移植**                                                      | production CSSへ移す前提                      |
| 生の色リテラル出現数         | **83箇所**                                                      | tokenを経由する                               |
| `border-radius` の値の種類   | **10種**（`10px 3px 10px 3px`、`50% 50% 20% 20%` を含む）       | 8px / 12px / 18px の3種                       |
| class名のprefix方言          | member / app / auth / foundation / authenticated / section ほか | 命名規約なし                                  |

Phase 4A由来の `--ink` `--paper` `--surface` `--accent` と、#59で追加された `--app-*` と、設計文書が定めた `--color-*` の三系統が並存し、そのうち production CSSへ実装されているのは前二者だけである。

### 原因の同定

これは実装者の注意不足ではなく、**AI駆動開発の構造的な帰結**である。

- Issueごとに別branch・別worktreeで、別のagent（Codex系 #59 / #61 / #62、Claude系 claude/71）が同一の `styles.css` へ追記した。
- 各agentは1,704行の既存CSSから該当tokenを発見できないまま、その場で新しい値を定義した。差分が +1,779 / -75 と純増に偏っているのはその痕跡である。
- 設計文書のtoken表は `docs/` にあり、実装時に必ず読まれる保証がない。

`AGENTS.md` と `docs/ai-development.md` は「Security, formatting, generated-file checks, and test requirements belong in executable checks when possible. Agent instructions are guidance, not a hard security boundary」と定め、`mise run ai:check` でAI設定そのものを機械検証している。**デザインだけがこの原則の適用外に置かれている**ことが、83箇所の色リテラルと10種のradiusを生んだ。

## 判断軸

本ADRは、人間が長期保守することを前提とした一般的なフロントエンド選定基準を採用しない。このプロジェクトの実装主体はagentであり、`docs/ai-development.md` の並行所有モデルとhuman review checkpointが前提である。

### 棄却する論拠（人間保守前提）

| 一般的な論拠                                   | 棄却理由                                                        |
| ---------------------------------------------- | --------------------------------------------------------------- |
| 学習コスト、チームの習熟度                     | 学習主体としての開発チームが存在しない                          |
| copy-paste方式は更新が来ないので保守負担が重い | vendorされたコードの追随・書き換えはagentにとって低コストである |
| 依存は少ないほど良い                           | 判断基準は数ではなくレビュー可能性と供給網リスクである          |
| utility classは可読性が低い                    | 主たる読み手がagentであり、人間の可読性基準をそのまま適用しない |
| 一度決めると乗り換えが困難なので慎重に決める   | 全画面移行が現実的な工数で可能なため、決定の可逆性は高い        |
| 既存1,704行の資産を捨てるのは惜しい            | 書き直しコストが低い以上、sunk costとして扱う                   |

### 採用する評価軸（AI駆動開発固有）

1. **事前知識密度** — agentがリポジトリを読まずに正しく書ける確率。独自CSS方言はプロジェクト固有言語であり、UIタスクのたびに `styles.css` の読み込みと既存classの推測を要求する。公開コーパスが厚い記法ほど初回正答率が高い。
2. **機械的強制可能性** — 設計文書に書かれた規約は守られない（83箇所の色リテラルが実証）。CIで落ちる規約だけが守られる。`ai:check` と同じ思想を適用できるか。
3. **並行agentのファイル競合** — `docs/ai-development.md` は「Do not edit the same file concurrently from two agents」と定める。単一の巨大 `styles.css` は並行開発の構造的ボトルネックである。component近接配置は並行度を上げる。
4. **context予算** — UIタスクごとに1,704行を読む固定コストが発生する。画面が増えるほど線形に悪化する。
5. **可逆性** — 高い。したがって本決定を過度に重くせず、決められる範囲を早く決める方が得である。逆に未決定のまま画面を増やすコストは線形に増える。
6. **供給網リスクは人間開発より高い** — agentは依存追加の敷居が低い。したがって「依存の総数は少なく、個々は十分に主流で、追加は必ずIssueとhuman reviewを通す」が最適解になる。
7. **agent自身による視覚検証の可否** — 人間レビューが品質の律速になる。agentがscreenshotを取得して自己修正できる体制の価値は、library選定より大きい可能性がある。

## Decision

### D1: Tailwind CSS v4 と shadcn/ui を CSS 基盤として採用する

採用理由は視覚的な優位ではなく、評価軸1・2・3・4である。

- shadcn/uiは2026年7月からBase UIを既定の下層primitiveとしており、Radix構成も継続サポートされる。
- copy-paste registry方式のため、npm依存を増やさずにコードをリポジトリ所有物として取り込める。取り込んだコードは通常のdiff reviewの対象になり、供給網リスクを評価軸6の方針で扱える。
- utility中心の記法により、agentは既存CSSファイルを読まずに大半のUIを記述できる。評価軸4のcontext固定費が下がる。
- styleがcomponentファイルへ近接するため、別Issueの別agentが同一ファイルを編集する確率が下がる。評価軸3。

### D2: accessibility要求componentはshadcn/ui自身のRadixベースcomponentで満たし、Untitled UI Reactは併用しない（Amended 2026-08-01, Issue #77）

Phase 4B設計文書は WCAG 2.2 AA、focus trap、Escape復帰、44×44 CSS pxターゲット、`prefers-reduced-motion` を受け入れ条件としている。drawer、dialog、menu、combobox、tooltipのfocus管理を自前実装しない方針は変更しない。

**Untitled UI React の併用は撤回する。** 撤回理由:

- D1で採用したshadcn/uiは2026年7月からBase UIを既定の下層primitiveとし、Radix構成も継続サポートしている。drawer、dialog、menu、combobox、tooltipのfocus管理はshadcn/ui自身のcomponentで満たせるため、accessibility要求を理由に第二のcomponentライブラリを追加する必要がない。
- 依存を1系統に絞ることで、評価軸6（供給網リスク）とD4の機械的強制対象を単純化できる。
- Issue #77で採用したデザイン方針（`docs/design/frontend-design-policy.md`）は「基本UIには既存のshadcn/uiコンポーネントを再利用する」「モーダル、メニュー、TooltipなどはRadixベースのコンポーネントを使う」と定めており、Untitled UI Reactへの言及がない。

置き換え後の構成:

- **アイコン**: Lucide React を使用する。独自SVGアイコンを安易に作らない。意味が明確でないアイコンにはTooltipを付ける。
- **一覧表示**: 列比較と表操作が主役のdata tableにはTanStack Tableを使用する。人物や文章が主役の一覧はsemanticなlistを使用する（D3参照）。
- **モーダル・メニュー・Tooltip等の対話型component**: shadcn/ui（Radixベース）のcomponentを使う。
- Origin UI、Kibo UI、Tremorは採用も排除もせず、必要が生じた時点で個別Issueで評価する。

### D3: design token を単一の source of truth にする（Amended 2026-08-01, Issue #77; 2026-08-02, Issue #79）

- Phase 4B設計文書のtoken表を Tailwind v4 の `@theme` へ移植し、そこを唯一の定義箇所とする。
- Phase 4A由来の `--ink` `--paper` `--surface` `--accent` `--accent-soft` は廃止する。
- `--app-*` は `@theme` のtokenへ統合する。
- 色は `@theme` のtoken経由でのみ参照する。
- 色tokenの確定値は `docs/design/color-tokens.json` を機械可読な正とし、`scripts/check-design-token-contrast.mjs`（`mise run check:tokens`）がこれを参照してコントラスト比を検証する。以下の表はその値を人間可読な形で複製し、コントラスト実測値と根拠を併記する（Amended 2026-08-02, Issue #79）。

#### token確定値と出典（Issue #77 時点の導出規則）

Issue #77で、`docs/design/frontend-design-policy.md`（デザイン方針）と `docs/design/reference-measurements.md`（Miro / esa実測記録）から、以下の導出規則に従って確定した。

1. デザイン方針が明示している項目は方針の値を優先する。
2. 方針が沈黙している項目だけ実測値から導出する。
3. Miroとesaが一致している項目（アクセント色1色、影3種類まで、見出しは行間を詰め本文は空ける）は確度が高いものとして扱う。
4. 両者が対立している項目は面の役割分担で決める。静的な面（一覧・詳細・フォーム）はesa、浮遊要素（モーダル・ポップオーバー・ツールチップ）はMiro。角丸は業務データの密度を優先しMiro側を基準にする。
5. esaの透過によるテキスト階調は採用しない。確定値で3段階を持つ。

Issue #83の利用者レビューは、この同程度の折衷を上書きする。視覚表現はesaを7〜8割の
主要参照、Miroを操作要素の2〜3割の補助参照とする。esaの小さいメタ文字とブランド色を
そのまま複製せず、「小さい文字を避ける」「親しみやすくする」という利用者評価を
文字スケール、温かい中立色、ティール系accent、アバター付き1列listへ翻訳する。

角丸・影・モーション・余白のcontrol刻みは、この導出規則で確定した値のままとし、Issue #79では変更していない（後掲「余白・角丸・影・モーション」参照）。

#### Issue #79: 色・タイポグラフィ・余白の確定値を差し替える（Amended 2026-08-02）

Issue #77で確定した色は、計算で検証可能な欠陥を含んでいた。

| 問題                                                        | 実測   | 必要                      |
| ----------------------------------------------------------- | ------ | ------------------------- |
| テキスト本文 `#1a1b1e` と副次 `#222428` の分離              | 1.11:1 | 区別可能であること        |
| アクセント `#0a9b94`（esaのブランド色）の白背景コントラスト | 3.43:1 | 4.5:1                     |
| 罫線 `#d7d5c9`                                              | 1.47:1 | 入力欄の境界に使うなら3:1 |
| バッジ枠 `#aeb2c0`                                          | 2.12:1 | 3:1                       |

原因は、Phase 4B設計文書（`docs/features/phase-4b-member-experience.md` 8章）に既に human review 済みのパレット（`--color-ink` `--color-muted` `--color-brand` ほか、および `--space-*` の4/8/12/16/24/32/48px）があったにもかかわらず、Issue #77の導出規則がこれを起点にせず、MiroとEsaの実測値だけから色を再構成したことにある。Issue #77の指示には「Phase 4Bの既存tokenを起点にする」が欠けていた。

加えて、esaのブランド色 `#0a9b94` をそのまま採用した判断は、`docs/design/reference-measurements.md` 自身が定めた「数値は自分たちのtokenへ翻訳して使う。参照実装の見た目を再現することは目的ではない」に反していた。

Issue #79では、Phase 4Bのパレットを土台に、目標コントラストから逆算した値へ差し替えた。Issue #83では計算手法と閾値を維持したまま、利用者が選んだesa寄りの色相と文字スケールを入力として再計算した。

##### 色（Amended 2026-08-02, Issue #79・#83）

確定値は `docs/design/color-tokens.json` を正とする。「canvas上のコントラスト」列は各tokenを `--canvas`（`#f7f6f0`）上に置いた場合のWCAG相対輝度によるコントラスト比であり、`scripts/check-design-token-contrast.mjs` が独立に再計算し検証する。

| token              | 値        | canvas上のコントラスト | 根拠                                                    |
| ------------------ | --------- | ---------------------- | ------------------------------------------------------- |
| `--surface`        | `#fffefa` | —                      | esaの温かい白をWorks向けに翻訳                          |
| `--canvas`         | `#f7f6f0` | —                      | surfaceと分離する温かい中立背景                         |
| `--text-primary`   | `#304357` | 9.39:1                 | esaの青みのある濃紺グレーを再計算                       |
| `--text-secondary` | `#45596e` | 6.67:1                 | primary / tertiaryとの1.4:1分離を両立                   |
| `--text-tertiary`  | `#647282` | 4.54:1                 | 通常文字4.5:1を下回らない最も薄い段                     |
| `--accent`         | `#087b75` | 4.73:1                 | esaのティールを複製せず、白文字5.12:1も満たす値へ再計算 |
| `--accent-strong`  | `#075f5b` | 6.93:1                 | hover / アクティブ文字                                  |
| `--accent-soft`    | `#e9f5f2` | —                      | アクティブ背景、strongとの6.72:1                        |
| `--control-border` | `#75847f` | 3.62:1                 | 温かい背景に合わせ3.0:1+余裕から逆算                    |
| `--line`           | `#d8ddd7` | 1.27:1                 | 装飾区切り。識別不要のため3:1適用外                     |
| `--danger`         | `#9f2f2f` | 6.64:1                 | Phase 4B                                                |
| `--warning`        | `#8a4f00` | 6.06:1                 | Phase 4B                                                |
| `--focus-ring`     | `#9a5200` | 5.42:1                 | Phase 4B。accentと補色関係で見分けやすい                |

`--focus-ring` は `outline-offset` を併用し、リングを要素の外側（canvasまたはsurface上）へ描く前提である。accent塗りの上に直接重ねない。

badge枠線とテーブル・入力欄の境界には `--control-border` を使う。旧token相当の `#aeb2c0`（2.12:1で3:1未達）は廃止する。装飾用の区切り線（`--line`、識別性を要求しない）と、識別性が要求される境界（`--control-border`、3:1以上）を役割で分離する。

##### タイポグラフィ（Amended 2026-08-02, Issue #79・#83）

| 用途                             | サイズ / 行間 | 根拠                                                         |
| -------------------------------- | ------------- | ------------------------------------------------------------ |
| モーダル見出し                   | 32px / 1.2    | Miro実測（浮遊要素はMiro基準）                               |
| 画面見出し                       | 30px / 1.3    | esa h1実測27pxを、利用者の「小さい文字を避ける」に合わせ拡大 |
| list見出し・メンバー名           | 22px / 1.35   | esa一覧24pxとMiro見出し24pxから情報密度を調整                |
| 長文本文                         | 16px / 1.8    | esa実測15pxを通常本文の下限として1px拡大                     |
| UI標準（list補助情報、ナビ項目） | 15px / 1.55   | esa実測1.54を維持し、14pxから拡大                            |
| ボタン・ラベル・数値             | 15px / 1.3    | 操作文字を14pxから拡大                                       |
| メタ情報・かな・バッジ           | 14px / 1.5    | 通常画面で14px未満を使わない                                 |

行間比はesaの全数調査で上位4値（1.80 / 1.54 / 1.30 / 1.20）に対応する。

和文フォントは **Noto Sans JP** とする。Issue #77のヒラギノ角ゴ Pro W3採用を撤回する。理由は利用者のOSがWindows混在であり、ヒラギノはmacOS / iOS限定でメイリオへフォールバックすると行間1.8の前提が崩れるためである。Noto Sans JPはNext.js内蔵の `next/font/google` でself-hostできるため、新規パッケージは不要である。

##### 余白・角丸・影・モーション

- **余白**: 2 / 4 / 6 / 8 / 12 / 16 / 24 / 32 / 48px（Phase 4Bの `--space-*` + Miroのcontrol刻み）。Issue #77が「未確定」としたsection / layout刻みはPhase 4Bに既に存在したため確定とする（Amended 2026-08-02, Issue #79）。
- **角丸**: card 8px / input 6px / button 6px / table row 0 / modal 8〜12px / popover 12px / tooltip 8px / avatar 50% / badge pill（方針 + Miro）。Issue #77の値から変更なし。
- **影**: 弱 `0 2px 4px rgba(0,0,0,.08)` / 中 `0 2px 8px rgba(0,0,0,.12)` / 強 `0 4px 12px rgba(0,0,0,.15)` の3種のみ。Issue #77から変更なし。
- **モーション**: ホバー150〜200ms、モーダル200〜250ms、動かす対象は色のみ。Issue #77から変更なし。

**方針と実測が食い違い、方針を優先した箇所**: 角丸（card 8 / input 6 / button 6 / modal 8-12px。Miro実測はボタン4px・モーダル16pxなど異なる値）、モーション継続時間（Miro実測120ms。方針の150-250msを採用）。

**本Issueで決定しなかったもの**: dark theme時の実際の色値（本ADRのConsequences参照）。Issue #77が残していたsection / layoutレベルの余白刻みと、アクティブ状態の具体的な配色値は、いずれもIssue #79で確定した（`--space-*` の統一スケールと `--accent-strong` / `--accent-soft`）。

#### Issue #90: 色の面積配分をtoken値を変えずに確定する（Amended 2026-08-03）

Issue #87でAppShell（sidebar・header・mobile drawer）を新token基盤へ移行した後の手動レビューで、warm neutral surfaceとteal系accentが画面全体へ薄く分散し、画面がほぼ無彩色に見えるという指摘があった。計算検証済みのcontrast値そのものに欠陥はなく、accentを置く面積と意味の階層が未定義だったことが原因であるため、本Issueでは`docs/design/color-tokens.json`の確定値を変更せず、既存token（`--accent` `--accent-strong` `--accent-soft`）の配分規則だけを`docs/design/frontend-design-policy.md`「AppShellの色彩配分」節へ追加した。

- neutral 80〜85% / accent-soft 10〜15% / solid accent・accent-strong 5%以内を視覚判断基準とする
- desktop sidebarとheader上端、mobile header・drawerに4pxのaccent railを連続させ、brand（W mark: accent、Works文字: accent-strong）と現在位置を示す
- active navigationの左rail幅を2pxから4pxへ変更し、sidebar下部のPhase 4Bをaccent-soft背景・accent-strong文字のpillへ変更した。値は既存token・既存radius allowlist（`999px`）の範囲内であり、D4のallowlistへの追加変更は発生しない

詳細な配分規則と適用箇所は`docs/design/frontend-design-policy.md`を正とする。本ADRのallowlist確定値（color/radius/shadow/duration）は変更しない。

#### TanStack Tableとsemantic listの役割を限定する

列比較や表操作が主役のdata tableではTanStack Tableを表示層に限定して使用する。検索・並び替え・ページングはRust APIのcursor契約（ADR 0010 / ADR 0013）が担い、client-sideのsorting / filtering / paginationは使わない。メンバー一覧は写真、氏名、自己紹介をまとまりとして読むため、Issue #83でsemanticな`ul` / `li`の1列listを採用し、TanStack Tableを使わない。

### D4: 規約を executable check として強制する

本ADRの中核はD1ではなくD4である。D1からD3を文書に書くだけでは、`styles.css` で起きたことが繰り返される。

`mise run check:ui` を追加し、`mise run check` の集約へ含める（Amended 2026-08-02, Issue #81）。色のコントラスト検証（`check:tokens`）はIssue #79で、Tailwind導入・token生成・stylelint/eslintによる残りの検査（`check:ui` / `tokens:generate:check`）はIssue #81で実装済みである。

| 検査                  | 手段                                                                                                                                                                                                                                              | 実装                                                                                           | 防ぐ再発                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 色コントラスト不足    | `scripts/check-design-token-contrast.mjs`（`mise run check:tokens`）                                                                                                                                                                              | 実装済み（Issue #79）                                                                          | テキスト分離1.11:1、アクセント3.43:1、罫線1.47:1、バッジ枠2.12:1という計算可能な欠陥 |
| token生成の陳腐化     | `scripts/generate-design-tokens.mjs`（`mise run tokens:generate:check`）が `docs/design/color-tokens.json` と `docs/design/ui-tokens.json` から `apps/web/app/generated/design-tokens.css` の `@theme` を再生成し、既存ファイルと厳密一致比較する | 実装済み（Issue #81）                                                                          | tokenをCSSへ手書きし、定義ファイルと乖離する                                         |
| 色リテラル禁止        | `apps/web/stylelint.config.mjs` の `declaration-property-value-allowed-list` で `color` / `background` / `background-color` / `border-color` にcustom property以外を禁止（`mise run check:ui` → `ui:stylelint`）                                  | 実装済み（Issue #81）                                                                          | 生の色リテラル83箇所                                                                 |
| radius allowlist      | 同上で `border-radius` の許可値を列挙                                                                                                                                                                                                             | 実装済み（Issue #81）                                                                          | radius 10種への発散                                                                  |
| 影 allowlist          | 同上で `box-shadow` を生成された3種のcustom propertyに限定                                                                                                                                                                                        | 実装済み（Issue #81）                                                                          | 任意の影値の混入                                                                     |
| duration allowlist    | 同上で `transition-duration` を150〜250msへ、`transition-property` を `background-color` / `border-color` / `color` へ限定し `transform` との併用を禁止                                                                                           | 実装済み（Issue #81）                                                                          | transformを伴う重いhover                                                             |
| arbitrary value禁止   | `apps/web/eslint.config.mjs` の `no-restricted-syntax` でTailwindの `w-[13px]` `text-[#123456]` 形式を`.tsx`のclassNameから禁止（`mise run check:ui` → `ui:eslint`）                                                                              | 実装済み（Issue #81）。専用eslintプラグインではなく組み込みルールで実装し、依存追加を避けた    | tokenを迂回する任意値                                                                |
| 旧CSSへの追記禁止     | `scripts/check-styles-css-line-count.mjs`（`mise run check:ui` → `ui:styles-size`）が `apps/web/app/styles.css` の行数上限（導入時点で1757行）を検査し、超過したら失敗する                                                                        | 実装済み（Issue #81）                                                                          | 新旧2系統の並存の固定化                                                              |
| 未使用tokenと重複定義 | `@theme` の定義箇所が1つであることの検査                                                                                                                                                                                                          | **未実装**。`apps/web/app/tailwind.css` が唯一の `@theme` 読み込み経路である間は手動で担保する | token三系統の再発                                                                    |

これは `ai:check` が `.claude/settings.json` を厳密検証しているのと同じ位置づけであり、agent instructionではなく実行可能な検査としてルールを表現する。

`styles.css` はD5の移行が完了するまで `stylelint.config.mjs` の `ignoreFiles` で検査対象から除外する（既存の色リテラルとradius逸脱をそのままでは検査が通らないため）。新規に追加するCSSと `.tsx` は最初から検査対象である。

#### allowlist確定値（Amended 2026-08-01, Issue #77; 2026-08-02, Issue #79; 2026-08-02, Issue #81）

D3のtoken確定値に基づき、stylelintとeslintで許可する値を次のとおり確定する。Issue #81でTailwind v4の `@theme` へ実装し、`apps/web/stylelint.config.mjs` の許可値を一致させた。

| 検査対象                                                                                                                                              | 許可値                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `border-radius`（stylelint allowlist）                                                                                                                | `6px`（input, button）、`8px`（card, tooltip）、`12px`（modal上限, popover）、`50%`（avatar）、`999px`（badge, pill）、`0`（table row）。table row以外での`border-radius`宣言自体は禁止しない                                                                                                                                                                                                                                                                                                                                                                                                       |
| `color` / `background` / `background-color` / `border-color`（stylelint allowlist、custom property経由のみ。Amended 2026-08-02, Issue #79・#81・#83） | 背景2値（`--surface: #fffefa`、`--canvas: #f7f6f0`）、テキスト色3段階（`--text-primary: #304357`、`--text-secondary: #45596e`、`--text-tertiary: #647282`）、アクセント3値（`--accent: #087b75`、`--accent-strong: #075f5b`、`--accent-soft: #e9f5f2`）、境界色2値（`--control-border: #75847f`、`--line: #d8ddd7`）、状態色2値（`--danger: #9f2f2f`、`--warning: #8a4f00`）、`--focus-ring: #9a5200`。加えて `transparent` / `currentColor` / `inherit` / `initial` / `unset` / `revert` の汎用キーワードを許可する。生の16進・rgb・hsl値は禁止。値は `docs/design/color-tokens.json` と一致させる |
| `box-shadow`（stylelint allowlist）                                                                                                                   | 弱`--shadow-sm: 0 2px 4px rgba(0,0,0,.08)`、中`--shadow-md: 0 2px 8px rgba(0,0,0,.12)`、強`--shadow-lg: 0 4px 12px rgba(0,0,0,.15)`の3種と`none`のみ                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `transition-duration`（stylelint allowlist）                                                                                                          | `150ms`〜`250ms`の範囲（正規表現 `/^(1[5-9]\d\|2[0-4]\d\|250)ms$/`）。hover 150〜200ms、modal / panel 200〜250msの両方をこの1範囲で表す                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `transition-property`（stylelint allowlist）                                                                                                          | `background-color` / `border-color` / `color`、またはこの3値のみからなるカンマ区切りの組み合わせ。`transform`との併用を禁止                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Tailwind arbitrary value（eslint禁止）                                                                                                                | `w-[13px]` `text-[#123456]` 等の任意値記法全般。角丸・色・影・durationはすべて上記allowlistのtoken経由で指定する                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

余白（spacing）のallowlistは 2 / 4 / 6 / 8 / 12 / 16 / 24 / 32 / 48px の統一スケールとする（Amended 2026-08-02, Issue #79）。旧来のcontrol単位限定（2/4/6/8/10/12px）とsection/layout刻み未確定という区別は、Issue #79でPhase 4Bの `--space-*` を根拠に解消された。Issue #81では `--spacing: 2px`（Tailwindの数値scale基底）として `@theme` へ実装した。標準の数値utility（`p-1`〜`p-96`等）は基底の整数倍で機械的に生じるため、確定した9値以外の間隔（例: `p-5` = 10px）も利用可能になる。`check:ui` はspacingのallowlistを検査しない（未確定のまま）。

### D5: 移行方式は「画面単位の順次移行 + 新規画面は新基盤必須」とする

| 方式                                        | 並行agentとの競合                                                                  | 一貫性                    | 中断時の状態             | 評価     |
| ------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------- | ------------------------ | -------- |
| A. 全面一括移行                             | 進行中branchと衝突する。`claude/71` は `styles.css` を53行追記しており直接競合する | 最良                      | 中断すると全画面が不整合 | 不採用   |
| B. 新旧CSS並走（期限なし）                  | 低い                                                                               | 最悪。方言が3系統目になる | 恒常的に不整合           | 不採用   |
| C. 画面単位で順次移行、新規画面は新基盤必須 | 低い。1画面 = 1 Issue = 1 worktree                                                 | 段階的に改善              | 各段階で完結             | **採用** |

Cを採用する。BとCの差はD4のcheckにある。旧 `styles.css` への追記をCIが禁止するため、移行期間中に方言が増えない。

移行順序は依存関係と影響範囲から次のとおりとする。

1. ログイン画面（他画面への依存が最も少ない。パイロットとして視覚とa11yを人間レビューする）
2. AppShell / Sidebar / AppHeader（以降の全画面の土台）
3. メンバー一覧
4. プロフィール詳細（自己紹介・写真を含む）

Issue #83では利用者がメンバー一覧のesa寄り実画面確認を優先したため、上記の順序に
対する明示的な例外としてメンバー一覧を先に移行する。AppShellは既存CSSのまま残し、
一覧page body、検索、結果、状態だけを新tokenとTailwind utilityへ移す。共通shellの
一括変更を同じIssueへ含めないことで、利用者が一覧の視覚方向だけを評価してrevertできる。

Issue #87では上記2のAppShell / Sidebar / AppHeaderを移行する。認証後全routeで共有する
shell、desktop navigation、utility links、header、account menu、mobile drawer、skip linkを
生成tokenとTailwind utilityへ置き換え、対応する旧`styles.css` selectorを削除する。drawerの
focus trap、Escape、backdrop、focus return、body scroll lockとlogout actionは変更しない。
login本文とprofile本文の旧CSSはそれぞれの画面移行Issueまで維持する。

進行中branchは現行CSSのままマージしてよい。`claude/71`（資格read）は `styles.css` へ53行追記しており、上記4の移行対象に含める。`#68`（スキル・資格の移行境界）はCSSを変更しないため影響を受けない。

**全画面の移行が完了した時点で行う作業（Amended 2026-08-02, Issue #81）**: Issue #81は `apps/web/app/tailwind.css` で `tailwindcss/theme` と `tailwindcss/utilities` のみを読み込み、preflight（`@import "tailwindcss"` に含まれるブラウザ既定値のリセット）を有効化していない。`styles.css` がブラウザ既定値に依存したまま残っているため、preflightを今有効化すると全画面が即座に崩れる。以下は上記1〜4の移行が完了し `styles.css` が削除された時点で別Issueとして行う。

- `apps/web/app/tailwind.css` を `@import "tailwindcss"`（preflight込み）へ切り替える。
- `apps/web/stylelint.config.mjs` の `ignoreFiles` から `app/styles.css` を外し、CSSの新規追加と同じ検査対象にする（`styles.css` 自体は削除済みのため、実質的には除外設定を削除するだけになる）。
- `scripts/check-styles-css-line-count.mjs` と `ui:styles-size` taskを削除する（検査対象のファイルが存在しなくなるため）。

### D6: Aceternity UI は方針の限定用途で採用する（Amended 2026-08-01, Issue #77）

前回検討時の棄却理由のうち、**「copy-paste方式は更新が来ないため保守負担が重い」は撤回する**。AI駆動開発では成立しない論拠である。この判断はIssue #74レビュー時点でも既に撤回済みだった。

**Issue #77で採用したデザイン方針（`docs/design/frontend-design-policy.md`）により、「採用しない」という結論を反転する。** 方針はAceternity UIの用途をログイン画面の背景、ダッシュボード上部の薄いGrid Background、ページヘッダーの控えめなSpotlight、横断検索の初回画面、空状態、重要な1セクション、控えめな画面遷移に限定し、一覧・フォーム・設定・データテーブル・日常的な編集画面では使用しないと明記している。以前の棄却理由（一覧・詳細・フォームの品質に寄与しない、accessibility基準を自前で満たす必要がある、常時動作するアニメーションは業務画面の常用に適さない）は、この限定用途と両立する形で解消されたと判断する。

**現時点で実在する適用先は次の2つに限られる。**

| 適用先             | 状態                                                                           |
| ------------------ | ------------------------------------------------------------------------------ |
| ログイン画面の背景 | 画面は存在する（Phase 4A実装済み）。Tailwind移行のパイロット対象（D5）でもある |
| 空状態             | メンバー一覧など既存画面に存在する                                             |

ダッシュボード、横断検索、その他の適用先は該当する画面自体が現時点で存在しないため対象外とする。画面が実装された時点で、その画面固有のIssueで個別に評価する。

**導入時期はログイン画面のTailwind移行（D5パイロット）と同時に行う。** Aceternity UIの依存追加はhuman review checkpointの対象であり、reduced-motion時の代替表示とコントラスト測定を評価に含める。本Issue（#77）自体はAceternity UIの依存を追加せず、決定のみを行う（非対象）。他の画面では使用しない。

### D7: agent による視覚的自己検証を本ADRに先行させる

評価軸7に該当する視覚とaccessibilityの自己検証基盤は、**ADR 0021 として分離し、本ADRより先に実施する**。

理由は次のとおりである。

- 本ADRのD1からD5は「agentが正しく書ける確率」を上げるが、書いた結果を確認する経路を増やさない。人間の手動レビューが唯一の視覚的検証経路である状態は変わらない。
- D5のCSS移行そのものを、移行前後のscreenshotで確認できる状態にしてから着手する方が安全である。
- ADR 0021はCSS基盤の採否に依存しないため、本ADRの承認を待つ必要がない。

詳細と決定事項は ADR 0021 を参照する。本ADRのD5パイロット（ログイン画面）は、ADR 0021の基盤が動作してから着手する。

## Consequences

### 得られるもの

- agentがリポジトリ固有のCSS方言を学習せずにUIを記述でき、初回正答率とcontext効率が上がる。
- token逸脱がCIで停止するため、設計文書とproduction CSSの乖離が再発しない。
- styleがcomponentへ近接するため、Codex と Claude の並行Issueで同一ファイルを編集する頻度が下がる。
- 移行が画面単位で完結するため、任意の時点で中断しても不整合が残らない。

### 受け入れるコスト

- Tailwind v4 と PostCSS のbuild依存が増える。`apps/web` のbuild時間とCI時間が増加する。
- 移行に4〜5 Issueを要する。その間 `styles.css` と新基盤が並存する。
- `#68` と `claude/71` は移行前の状態でマージされ、後続Issueで移行対象になる。
- shadcn/uiから取り込むコードは、npm依存ではないためリポジトリのdiff量が増える。レビュー負荷はhuman review checkpointの対象である。Lucide React、TanStack Table、Aceternity UI（D6の限定用途分）はnpm依存として追加され、追加時に個別のhuman reviewを要する。

### 本ADRで決めないこと

- dark themeの具体的な配色。D3でtoken構造（テキスト色3段階、アクセント色1色など）が両テーマに対応できることまでは確定したが、dark theme時の実際の色値は決めない。
- 有料ライブラリ（Tailwind Plus Catalyst、Untitled UI PRO）の採否。本ADRは無料・OSSの範囲で決定する。移行完了後に、視覚品質が要求水準に達しない場合の再評価項目とする。
- Aceternity UIの具体的なcomponent実装。D6は適用先と導入時期の方針のみを決定し、実装はログイン画面のTailwind移行Issueで行う。

日本語フォント（Amended 2026-08-01, Issue #77でD3にてヒラギノ角ゴ Pro W3へ確定）とicon package（同Issueで D2にてLucide Reactへ確定）は、本Issueの改訂によりこのADRの決定事項へ移った。

### human review が必要な事項

`AGENTS.md` の human review checkpoint により、外部依存の追加は人間の承認を要する。本ADRの承認はD1の依存追加（Tailwind v4、shadcn/ui）の承認を兼ねる。D2で追加するLucide ReactとTanStack Table、D6で将来追加するAceternity UIは、それぞれの実装Issueで個別にhuman reviewを受ける（本Issue #77は決定のみで依存を追加しない）。個別componentの取り込みは通常のPRレビューで扱う。

## Verification and recovery

- D4のcheckを実装した直後に現行 `styles.css` へ適用し、**意図的にredになること**を確認する。redにならない検査は規約を強制できていない。
- `check:tokens` 実装直後に、1つのtokenを規格外の値へ一時的に書き換え、`mise run check:tokens` が失敗することを確認する（Amended 2026-08-02, Issue #79）。確認後は必ず元の確定値へ戻す。
- `tokens:generate:check` 実装直後に `docs/design/color-tokens.json` を1箇所書き換え、`mise run tokens:generate:check` が失敗することを確認する（Amended 2026-08-02, Issue #81）。確認後は必ず元の確定値へ戻す。
- `check:ui` 実装直後に、色リテラルと規格外radiusを含む一時ファイルを追加し、`mise run check:ui` が失敗することを確認する（Amended 2026-08-02, Issue #81）。確認後は必ずファイルを削除する。
- allowlistは現行の逸脱を追認せず、Phase 4B設計文書のtoken表を基準に確定する。
- D5のパイロット（ログイン画面）完了時に、1280 / 1440 / 1920 / 360 px、keyboard操作、focus可視性、コントラスト比、reduced-motionを人間レビューする。Phase 4B設計文書が deferred とした visual finish の再レビューをここで行う。
- rollback: 画面単位移行のため部分revertが可能である。Tailwind導入commitをrevertすれば `styles.css` の状態へ戻る。Rust API、OpenAPI、Supabase schema、seedは変更しないため、データとauthに対するrollbackは発生しない。
- 移行完了後、`styles.css` の削除をもってD5の完了とする。

## References

- `docs/features/phase-4b-member-experience.md` — Phase 4B設計基準、token表、accessibility受け入れ条件
- `docs/design/frontend-design-policy.md` — Issue #77で採用したデザイン方針。D2・D3・D6の改訂根拠
- `docs/design/reference-measurements.md` — Miro / esa実測記録。D3のtoken確定値の出典
- `docs/design/color-tokens.json` — 色tokenの機械可読な確定値（Issue #79）
- `scripts/check-design-token-contrast.mjs` — 色tokenのコントラスト比を検証する `check:tokens` の実装（Issue #79）
- `docs/design/ui-tokens.json` — タイポグラフィ・余白・角丸・影・モーション・fontの機械可読な確定値（Issue #81）
- `scripts/generate-design-tokens.mjs` — `color-tokens.json` / `ui-tokens.json` から `@theme` を生成する `tokens:generate` / `tokens:generate:check` の実装（Issue #81）
- `apps/web/app/tailwind.css` — preflightなしのTailwind v4 entry point（Issue #81）
- `apps/web/stylelint.config.mjs` — D4のcolor/radius/shadow/duration allowlistの実装（Issue #81）
- `apps/web/eslint.config.mjs` — Tailwind arbitrary value禁止ルールの実装（Issue #81）
- `apps/web/components.json` / `apps/web/lib/utils.ts` — shadcn/ui初期化（componentは未追加、Issue #81）
- `docs/ai-development.md` — 並行所有モデル、executable checkの原則、human review checkpoint
- `AGENTS.md` — 依存を供給網面として扱う方針、validation expectations
- ADR 0013 — 現行UIの状態表示とnative HTML control方針
- ADR 0021 — agentによる視覚とaccessibilityの自己検証基盤（本ADRに先行して実施する）
- [shadcn/ui: Base UI as the Default (2026-07)](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
