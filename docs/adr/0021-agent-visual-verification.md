# ADR 0021: agentによる視覚とaccessibilityの自己検証基盤

- Status: Accepted
- Date: 2026-08-01
- Tracking: GitHub Issue #73
- Relates to: ADR 0020（フロントエンドCSS基盤とdesign tokenの機械的強制）
- Amended: 2026-08-01 (GitHub Issue #77), 2026-08-02 (GitHub Issue #79), 2026-08-02 (GitHub Issue #83), 2026-08-02 (GitHub Issue #85)

## Context

### なぜCSS基盤より先に決めるか

ADR 0020はCSS基盤とtoken強制を扱うが、そこで扱えない問題が残る。**agentは自分が書いたUIを見ていない**。

現在のUI検証は次の3層で構成されている。

| 層    | 手段                         | 検出できるもの                         | 検出できないもの                     |
| ----- | ---------------------------- | -------------------------------------- | ------------------------------------ |
| unit  | vitest + Testing Library     | DOM構造、role、テキスト、状態遷移      | 見た目、レイアウト崩れ、コントラスト |
| smoke | `mise run smoke:web:member`  | HTTP境界、認可、header、response shape | 同上                                 |
| 手動  | `mise run review:web:member` | すべて                                 | 人間が起動して見るまで検出されない   |

Phase 4B設計文書（`docs/features/phase-4b-member-experience.md` 9章）は、320 CSS pxでの情報欠落なし、コントラスト4.5:1、focus indicatorの明瞭さ、pointer target寸法、`prefers-reduced-motion` 対応を受け入れ条件としている。**これらはいずれも現在のunit testとsmoke testで検出できない**。したがって唯一の検出経路が人間の手動レビューであり、agentは1回の実装につき人間のレビューを1回待つ。

`docs/ai-development.md` の並行所有モデルでは Codex と Claude が別Issueを同時に進める。人間レビューが唯一の視覚的検証経路である限り、**人間が並行度の上限を決める**。これはAI駆動開発における品質の律速である。

ADR 0020のD1からD5は「agentが正しく書ける確率」を上げるが、書いた結果を確認する経路は増やさない。先に自己検証を作れば、CSS基盤移行そのものの品質検証にも使える。順序として本ADRを先行させる。

### 既存資産

`scripts/smoke-local-web-auth.mjs`（1,317行）は、合成Auth userの作成、actor mappingの差し替え、Rust APIとNext.jsの固定ポート起動、検証、確実なcleanup（`SIGINT` / `SIGTERM` handlerを含む）までを既に実装している。`--manual-review` はその上で人間の確認を待つmodeである。

視覚検証のために起動系を二重に実装しない。既存scriptのlifecycleへ相乗りする。

## Decision

### D1: 目的は回帰検出ではなく agent の自己修正である

本基盤の成功条件は「UIの変更をCIが止めること」ではなく、**agentが人間のレビューを待たずに自分の出力を見て修正できること**である。

この区別は設計に影響する。

- screenshotをbaselineとしてコミットせず、差分比較も行わない。デザイン確定前の現段階ではbaseline更新が常態化し、CIがノイズになる。
- 出力はagentが読む前提の成果物とし、リポジトリの永続資産にしない。
- 一方でaccessibility検査は判定が機械的に定まるため、違反を失敗として扱う。

### D2: `mise run review:web:visual` を追加する

task名は既存の `review:web:member`（self-cleaningなlocal手動レビュー）と同じ系列に置く。新しい接頭辞を作らないことで、agentがtask名を推測できる状態を保つ。

`scripts/smoke-local-web-auth.mjs` に `--visual` modeを追加し、`--manual-review` と同じlifecycleで次を実行する。

1. 合成Auth userを作成し、生成したrandom passwordでログインする。passwordは標準出力、log、成果物へ出力しない。
2. Playwrightでログイン済みsessionを取得し、対象画面を巡回する。
3. 各画面・各条件でscreenshotを保存する。
4. 各画面でaxe-coreを実行し、違反をJSONで出力する。
5. 既存の `cleanup()` で合成user、runtime role、子プロセスを確実に破棄する。

Playwrightのbrowser binaryは明示的なtask（`mise run install:browsers`）でのみ取得する。`docs/ai-development.md` の「agents must not install or authenticate a global tool merely by opening the repository」に従い、`mise run install` へ暗黙に含めない。

### D3: 撮影条件を限定する（Amended 2026-08-01, Issue #77; 2026-08-02, Issue #79）

**screenshotの枚数はagentのcontext予算そのものである**。1枚のPNGはagentが読むたびにtokenを消費する。網羅より、判断に必要な最小集合を選ぶ。

通常画面は次の3画面 × 5条件 = 15枚を基準とする（Amended 2026-08-02, Issue #79）。Issue #83では、メンバー一覧をcard gridからlistへ改訂する際に状態表示も同じ視覚言語へそろえる必要があるため、desktopのsearch pending、empty、permission denied、service errorを4枚追加し、合計19枚を上限とする。

| 画面                     | 根拠                                                  |
| ------------------------ | ----------------------------------------------------- |
| ログイン                 | 未認証時の唯一の画面。ADR 0020のCSS移行パイロット対象 |
| メンバー一覧（結果あり） | 情報密度と一覧レイアウトの基準画面                    |
| プロフィール詳細         | 2列レイアウトと section 構造の基準画面                |

| 条件           | 値                                         | 根拠                                                                                                                                                                                                                                  |
| -------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| narrow         | 360 px                                     | Phase 4B設計文書の下限                                                                                                                                                                                                                |
| desktop        | 1280 px                                    | 常用幅                                                                                                                                                                                                                                |
| midsize        | 1440 px                                    | Issue #77で採用したデザイン方針の実装後確認項目「1280px、1440px、1920pxでレイアウトが成立する」に1440pxが明示されたため追加。1280と1920の間で追加情報が少ないという従来の除外理由は、方針が1440pxを個別の確認項目としたことで失効した |
| wide           | 1920 px                                    | 情報が横に間延びしないことの確認                                                                                                                                                                                                      |
| reduced motion | 1280 px + `prefers-reduced-motion: reduce` | 方針の確認項目「アニメーションを無効にしても操作できる」                                                                                                                                                                              |

**増枚の理由**: 12枚から18枚（+6枚、+50%）へ増える。方針の実装後確認チェックリストが1440pxとdark themeを個別の確認項目として明示したため、それぞれに対応する条件を1つずつ追加した。viewport幅とcolor-schemeとmotionの全組み合わせ（総当たりでは3画面×最大8条件超）は取らず、新要求ごとに最小限の1条件を追加するにとどめ、「網羅ではなく判断に必要な最小集合を選ぶ」という本D3の原則を維持する。

**dark条件の取り下げ（Amended 2026-08-02, Issue #79）**: Issue #77で追加した `dark` 条件（1280 px + `color-scheme: dark`）を取り下げる。18枚から15枚（-3枚）へ戻る。`midsize`（1440px）条件は方針の確認項目のままのため維持する。

取り下げ理由: Issue #79はdark themeの提供自体を保留し、ADR 0020 D3の色tokenをlightテーマのみで確定した。現行CSSも今後もdark配色を持たない前提のため、`dark`条件のscreenshotを撮影しても比較対象となる配色が存在せず、撮影パイプラインの疎通確認以上の情報を持たない。Issue #77時点の想定（「実質的なコントラスト検証はdark theme配色を実装する別Issueで行う」）は、そのdark theme自体の実装が決定していない現時点では前倒しの条件追加だったと判断する。

再開条件: dark themeの提供を決定し、ADR 0020 D3へdark配色のtokenが確定した時点で、`dark`条件を別Issueとして再度追加する。

Issue #83は空状態、permission denied、service errorに加え、結果を保持したまま更新中を示すsearch pendingをdesktopで追加した。初期loadingのlist row skeletonはcomponent testと通常のmembers遷移で確認し、瞬間的なstreaming fallbackを固定screenshotにしてflakyにしない。結果ありの5条件でresponsiveとmotionを確認済みのため、各状態を全viewportへ総当たりせず1条件ずつに限定する。追加理由はIssue #83に記録し、19枚より増やす場合も別Issueに理由を記録する。

### D4: 成果物はagentが読む前提で設計する

- 出力先は `apps/web/.visual/` とし、`.gitignore` へ追加する。コミットしない。あわせて `apps/web/.prettierignore` へも追加する。現在の `.prettierignore` は `.next` と `next-env.d.ts` のみのため、これを行わないと `accessibility.json` が `mise run format:check` の対象になりCIが失敗する。
- ファイル名は `<screen>-<condition>.png` の固定命名にする。状態証跡は`members-<state>-desktop.png`とする。agentがディレクトリを列挙せずにパスを組み立てられることを優先する。
- axe-coreの結果は `apps/web/.visual/accessibility.json` へ機械可読形式で出力し、同時に違反件数の要約を標準出力へ出す。agentに散文をparseさせない。
- 実行のたびに出力先を消してから書き直す。前回実行の残骸をagentが誤読しない。
- 表示されるデータは既存の合成fixtureのみであり、実在の社員情報、実画像、実メールアドレスを含まない。この前提が崩れる変更は本ADRの範囲外とする。

### D5: axe-core の検査範囲と、検査できないものを明示する

`@axe-core/playwright` を使い、`wcag2a` `wcag2aa` `wcag21aa` `wcag22aa` のタグで検査する。違反が1件でもあれば task を失敗させる。

**axeが検出できるもの**（機械判定が定まるため失敗扱いにする）

- テキストのコントラスト比不足
- form controlのlabel欠落、button名の欠落
- landmark、heading順序、重複ID
- 画像のalt属性の欠落
- pointer targetの最小寸法（WCAG 2.2 2.5.8相当）

**axeが検出できないもの**（agentがscreenshotで判断する。自動検査の合格を根拠にしない）

- レイアウト崩れ、要素の重なり、意図しない折り返し
- 視覚順とDOM順の不一致
- focus indicatorの視認性（存在は検出できるが、背景に対する明瞭さは判断できない）
- `prefers-reduced-motion` 適用時に実際にアニメーションが止まっているか
- 情報の過不足、余白のリズム、typographyの品質
- Phase 4B設計文書がproject基準とした44×44 CSS pxの目標値（axeは24×24の下限しか判定しない）

この区別をtaskの出力へ明記する。**AI駆動開発では「自動検査が通った」を「accessibleである」と解釈する誤りが起きやすく、それを防ぐのは文書ではなく出力そのものである。**

### D6: 適用範囲は local に限定する

本ADRではCI必須化を決めない。

- 実行にはSupabase local stack、Rust API build、Next.js build、browser binaryが必要であり、CI時間への影響が大きい。
- 現段階はデザイン変更が頻繁で、失敗の切り分けコストが高い。

したがって新しいtaskを `[tasks.check]` の集約へ追加しない。`check` はCIが実行する集約であり、ここへ加えることはD6の決定に反する。

次の条件を満たした時点で、CI導入を別Issueで判断する。

1. ADR 0020のCSS移行が完了し、UIの変更頻度が下がっている。
2. `verify:web:visual` がローカルで10回連続して同じ結果を返す（flakyでない）。
3. axe違反が恒常的に0件である。

それまでは、agentが実装Issueの中で自主的に実行する運用とする。実行したか否かはPRの検証記録に残す。

### D7: agent の利用手順を `verify-web-slice` skill へ切り出す（Amended 2026-08-02, Issue #85）

初回導入時は本ADRとtask descriptionで十分だったため、skillを作らなかった。Issue #83で一覧の通常表示に加えてsearch pending、empty、permission denied、service errorを実画面確認し、画面操作、screenshot読解、狭幅、axe-core、cleanupを組み合わせる手順が2回以上反復した。Issue #85で`.agents/skills/verify-web-slice/`へ切り出す。

当初の候補名`verify-web-visual`ではscreenshot取得だけを想起しやすい。実際の手順はkeyboard操作、focus、overflow、状態遷移、synthetic authのcleanup、手動review準備までを含むため、1つのuser-visibleなWeb変更を検証する意味で`verify-web-slice`とする。

skillは本ADR、frontend design policy、対象feature文書、tokenの値を複製しない。正となる文書を読む順序、local taskの選択、状態matrix、実画面での判断、安全境界、報告項目だけを手順化する。Codexは`.agents/skills/`から読み、Claude Codeは`.claude/skills/verify-web-slice`の相対symlinkを通して同じcanonical skillを読む。

## Consequences

### 得られるもの

- agentが実装 → screenshot取得 → 自己判断 → 修正のループを、人間のレビューを挟まずに回せる。
- 人間のレビューが、agentが直せない判断（情報設計、visual finish、業務上の妥当性）に集中する。
- ADR 0020のCSS移行そのものを、移行前後のscreenshotで確認できる。
- Phase 4B設計文書の受け入れ条件のうち、機械判定できる部分が実行可能な検査になる。

### 受け入れるコスト

- Playwrightと `@axe-core/playwright` の依存が増える。browser binaryはローカルに数百MB必要になる。
- `smoke-local-web-auth.mjs` が1,317行からさらに増える。分割が必要になった場合は別Issueで扱う。
- ローカル実行のみのため、実行を怠ったPRを機械的に止められない。D6の条件を満たすまでは運用で担保する。

### 本ADRで決めないこと

- CI必須化の是非と実行頻度（D6の条件成立後に別Issue）。
- visual regression baselineの採否（デザイン確定後に再評価）。
- dark themeの実際の配色実装とその実質的なコントラスト検証。D3改訂（Issue #77）で撮影条件へ`dark`条件を追加したが、dark theme自体の提供が保留されたためIssue #79で当該条件を取り下げた。dark themeの提供を決定し配色tokenが確定した時点で、撮影条件への追加を別Issueで再検討する。
- 空状態、permission denied、service errorの撮影（必要時に追加）。
- Playwrightをunit / smokeに続く第3のtest層として一般化するか。現時点では視覚検証専用とする。

## Verification and recovery

- 導入直後に、**既知の違反を意図的に作って失敗することを確認する**。具体的には、コントラスト不足の色を一時的に適用してaxeがredになることを確かめる。redにならない検査は何も保証しない。
- 生成されたscreenshotをagentが実際にReadし、Phase 4B設計文書の受け入れ条件に対して判断できることを1画面で確認する。読めない、または判断に足りない場合は撮影条件を見直す。
- `--visual` mode実行後に、合成Auth user、短命DB role、子プロセスが残っていないことを既存cleanupの検証と同じ方法で確認する。
- `apps/web/.visual/` がgit statusへ現れないこと、および `mise run format:check` と `mise run lint` が成果物の存在下で成功することを確認する。
- `mise run check` の実行時間が変化していないことを確認する。変化していれば新しいtaskが誤って集約へ追加されている。
- rollback: `--visual` mode、mise task、devDependency、`.gitignore` と `.prettierignore` のエントリを同一changeとしてrevertすれば元に戻る。Rust API、OpenAPI、Supabase schema、seed、既存smoke pathは変更しないため、データとauthに対するrollbackは発生しない。
- D3改訂（Issue #83）後、`mise run review:web:visual` を実行し、通常3画面×5条件=15枚（`midsize`条件を含み`dark`条件は含まない）とメンバー状態4枚の合計19枚が固定命名で生成されることを確認する。

## References

- `docs/features/phase-4b-member-experience.md` 9章 — accessibility受け入れ条件
- `docs/design/frontend-design-policy.md` — Issue #77で採用したデザイン方針。D3改訂（1440px・dark theme条件追加）の根拠
- `docs/ai-development.md` — 並行所有モデル、human review checkpoint、skill化の判断基準
- `scripts/smoke-local-web-auth.mjs` — 再利用するlocal stack lifecycleとcleanup
- `scripts/capture-visual-evidence.mjs` — 撮影条件（`CONDITIONS`）の実装
- ADR 0013 — 現行UIの状態表示と360px要件
- ADR 0020 — CSS基盤とdesign tokenの機械的強制

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
