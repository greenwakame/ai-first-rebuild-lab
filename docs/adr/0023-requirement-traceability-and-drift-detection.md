# ADR 0023: 要求IDのトレーサビリティとドリフト検出

- Status: Accepted
- Date: 2026-08-17
- Tracking: GitHub Issue #155
- Supersedes: なし
- Relates to: ADR 0002（OpenAPI契約先行）、ADR 0019（依存supply-chain評価）、ADR 0020（design tokenの機械的強制）、ADR 0021（agentによる自己検証）、ADR 0022（shared stagingのtrust boundary）

## Context

このリポジトリは、人がロードマップとADRを事前に決定し、生成AIが調査・設計・
Issue化・実装・テストを行い、人の関与を設計変更の承認とPull Requestの受け入れへ
絞る開発フローを前提にしている。

2026-08-17時点の実測では、この前提を支える機械的な接続が4点欠けている。

- 要求がIDを持たず、Issue・コード・テストと機械的に接続できない。テスト名に
  要求IDまたはチケット番号を含むものは、Rust 30件・vitest 35ファイル・pgTAP
  9ファイル・script 10ファイルのいずれも0%である。`@impl` `@spec` 相当の
  マーカーは0件である。
- 仕様にあってIssue化も実装もされていない要求を検出できない。
  `docs/features/onboarding-guide.md` の受け入れ条件8件はすべて未達で、対応する
  open Issueが存在しないが、この状態は自動では表面化しない。
- 仕様とコードの片側だけが変更された状態を検出できない。直近5 Pull Requestの
  調査では仕様の同時更新はよく守られていたが、それを保証する仕組みは無い。
- 設計変更を承認する時点で、波及先の文書・コード・テストが分からない。ADR間、
  およびADRと仕様の間のMarkdownリンクは0件で、参照はすべて平文である。

一方で、既に機能している資産が3つある。

- `mise run tokens:generate:check` は `docs/design/*.json` と生成CSSの一致を
  終了コードで強制しており、文書とコードのドリフト検出が1件稼働している。
- `mise run api:generate:check` はOpenAPIと生成clientの一致を強制している。
- ADR 0020 / 0021 / 0022 の `D<n>` 決定IDは、コード・設定・スクリプトから43箇所
  参照されている。事実上の要求IDとして既に機能している。

依存追加には `minimumReleaseAge: 10080` とsupply-chainレビューの制約があり、
プロジェクトhooksは `mise run ai:check` が拒否する。したがって外部のSDDツールや
フックによる強制は選択肢にならず、`mise run` タスクとCIだけが強制点である。

## Decision

### D1: 二系列のID体系

要求IDを2系列に分ける。

| 系列 | 形式 | 対象 | 性質 |
| --- | --- | --- | --- |
| Requirement ID | `REQ-<AREA>-<NNN>` | 仕様の受け入れ条件 | living。ドリフト検出の対象 |
| Decision ID | `ADR-<NNNN>-D<n>` / `ADR-<NNNN>` | ADRの決定 | Amended型。ドリフト検出の対象外 |

`<AREA>` は台帳が宣言する閉じた語彙とし、仕様のファイル名ではなくcapability名に
する。`<NNN>` はAREA内の連番、ゼロ埋め3桁、欠番は再利用せず、一度払い出した
IDは不変とする。

Requirement IDとGitHub Issue番号は分離する。Issue番号は台帳の `issues` で
関連付けるだけで、判定には使わない。ブランチ命名 `<agent>/<issue-number>-<slug>`
とコミットタイトルの `(#NN)` は変更しない。

既存の `ADR 0020 D4` という空白区切りの記法は書き換えない。検出スクリプトが
`ADR[- ]?(\d{4})([- ]?D(\d+))?` を受理して正規化する。

### D2: 台帳と仕様の役割分担

`docs/requirements/registry.yaml` を台帳とし、次を保持する。

- `areas`: AREA名、対応する仕様のパス、受け入れ条件節の見出し名
- `requirements`: `id`、`status`、`decisions`、`issues`、`note`、`kind`

要求の**文言は仕様を正**とし、台帳へ複製しない。実装・テストとの対応は参照の
走査で導出し、台帳へ列挙しない。台帳が保持するのは、機械的に導出できない情報
（状態、意図、関連ADR、関連Issue）だけである。

台帳と仕様のID集合が一致することを機械検証する。

利用者向け機能の仕様は `docs/features/` へ、CI・セキュリティ・開発運用などの
横断要求は `docs/requirements/` へ置く。

### D3: IDを貫通させる箇所

| 箇所 | 形式 |
| --- | --- |
| 仕様 | ``- [ ] `REQ-XXX-001` 条件文`` |
| 台帳 | 1エントリ |
| Issue本文 | `## 対象要求` 節にIDを列挙 |
| コミット | trailer `Requirement: REQ-XXX-001`（任意） |
| 実装 | `// @req REQ-XXX-001`（SQLは `--`、CSSは `/* */`） |
| テスト | 同じ `@req` マーカー。テスト名の文字列に含めてもよい |
| Pull Request本文 | `## 対象要求` と `## 影響範囲` 節 |

抽出規則は全言語で1つにする。テストらしいパスにあるID、およびRustの
`#[cfg(test)]` より後ろにあるIDをテスト参照として数える。言語ごとに別の抽出
規則を持つと、規則そのものが誤検出の原因になる。既存テストの名前を要求ID入り
へ変更することは求めない。

### D4: 状態モデル

`planned` から `tracked`、`implemented` を基本の遷移とし、任意の状態から
`deferred` へ移せる。

| status | 台帳の必須項目 | 参照の要件 | G2 | G3 |
| --- | --- | --- | --- | --- |
| `planned` | なし | ゼロを推奨 | 一覧出力のみ | 対象外 |
| `tracked` | `issues` 1件以上 | 任意 | 対象外 | 仕様側のみ |
| `implemented` | なし | 実装1件以上かつテスト1件以上 | 対象外 | 全規則 |
| `deferred` | `note` | 任意 | 対象外 | 対象外 |

`planned` は正常状態である。仕様を先に固定し実装を後続Issueへ分ける運用を、
異常として報告しない。

受け入れ条件節の項目は原則すべて採番する。実装siteが定義できないという理由で
未採番のまま残さない。採番できない性質は `kind` で表現する。

| kind | 意味 | 実装マーカー | テストマーカー | 追加の必須項目 | ドリフト検出 |
| --- | --- | --- | --- | --- | --- |
| `requirement` | 既定。システムの性質を述べた要求 | `implemented` なら必須 | `implemented` なら必須 | — | 対象 |
| `verification` | 検証手段そのものを述べた条件 | 不要 | `implemented` なら必須 | `note` | 対象 |
| `documentation` | 成果物がchecked-in文書そのものである条件 | 不要 | 不要 | `note` と `decisions` 1件以上 | 限定的 |
| `descriptive` | 既存コードから逆生成した実装の言い換え | 不要 | 不要 | `note` | 対象外 |

`descriptive` は導入時点では1件も使わない。強いkindから弱いkindへ移す操作は
マーカーの要求を外して finding を消せるため、`D-REGRESS` の対象にする。

`documentation` はコード上のマーカーを持たないため、`decisions` に成果物のADRを
列挙させ、既存の `UNKNOWN-DECISION` で参照先の実在を検証する。走査対象へ
`docs/adr/**` を加える案は採らない。ADRはAmendedで頻繁に変更されるため
`D-CODE` の恒常的なノイズ源になり、D10「ADRの変更は `D-SPEC` を発火させない」
とも整合しないためである。

`documentation` が検証するのは文書への構造的なトレースだけである。参照先ADRの
実在とDecision IDの実在を確認するが、**ADR本文が要求を実際に満たしているかと
いう意味的な整合性は機械検証しない。** その判断は人のレビューに残る。

### D5: 検出規則

| 規則 | 条件 | 既定の重大度 |
| --- | --- | --- |
| `INVALID-ENTRY` | ID・AREA・status・kindの形式違反、ID重複、未宣言AREA | error |
| `UNREGISTERED` | 差分で追加・変更された受け入れ条件行にIDが無い | error |
| `LEDGER-MISMATCH` | 台帳と仕様のID集合が一致しない | error |
| `UNKNOWN-DECISION` | `decisions` の参照先が実在しない | error |
| `MISSING-FIELD` | statusが要求する必須項目が無い | error |
| `D-STATE` | `implemented` なのに実装またはテストの参照がゼロ | error |
| `D-SPEC` | 仕様行が変更され、その要求の参照ファイルが1つも変更されていない | error |
| `D-REGRESS` | statusが `implemented` から後退した、またはkindが弱い側へ後退した | error |
| `D-CODE` | 実装ファイルが変更され、テストも仕様も変更されていない | warning |
| `D-BOX` | `- [x]` なのにstatusが `implemented` / `deferred` でない | warning |
| `SPEC-HEADING` | `criteria_heading` が仕様に見つからない | warning |
| `UNTRACKED-PLANNED` | `planned` の要求一覧 | info |

`D-REGRESS` は現在のstatusとkindより先に判定する。`implemented` から `deferred`
へ落とす操作も、`requirement` から弱いkindへ移して実装マーカーの要求を外す操作
も、finding を黙らせる手段になるためである。

`D-CODE` を恒久的に warning に留めるのは、意味を変えないリファクタ（変数名の
変更など）を機械的に除外する信頼できる方法が無いためである。ブロックへ昇格
させない。

### D6: 差分スコープと未採番の扱い

`LEDGER-MISMATCH`、`UNKNOWN-DECISION`、`MISSING-FIELD`、`D-STATE`、`D-REGRESS`
は台帳に載った要求だけを対象とするため、全件走査しても既存の未採番資産では
失敗しない。`UNREGISTERED`、`D-SPEC`、`D-CODE` は merge-base からの差分に現れた
ファイルと仕様行だけを対象とする。台帳が空の状態でも `mise run req:check` は
終了コード0で通る。

未採番のコードがドリフト検出の対象外になる穴は3つあり、それぞれ別に扱う。

- 文書が無く変更頻度も低いコードは採番せず、「今後そのコードを変更するとき、
  その変更が要求に対応するなら先に要求を書いて採番する」を `AGENTS.md` の規約と
  する。CIでは強制しない。
- 登録済み仕様に残る未採番の受け入れ条件は、その行に触れたときにだけ採番を
  強制する。漸進的に収束させる。
- 受け入れ条件節の外に書かれた要求は、`areas` の `criteria_heading` 宣言と実
  ファイルの節構成が食い違ったときに警告する。

### D7: 検出時の挙動

検出スクリプトはfindingを表示して終了コードを返すだけとし、ファイルを書き換え
る機能を持たない。`--fix` 相当のオプションを実装しない。

ズレのfindingを、仕様文書を書き換えることで解消してはならない。仕様が誤って
いる場合はfindingを報告し、人の判断を待つ。台帳の `status` を後退させて
findingを消してはならない。

この規約には2つの機械的な裏付けがある。仕様を書き換えてコードに合わせる行為は
コードが変わらないため `D-SPEC` を踏む。statusを下げて黙らせる行為は
`D-REGRESS` を踏む。

一方で、仕様とコードを同一Pull Requestで同時に書き換えれば共変更条件を満たして
通過する。これは規約とレビューでしか防げない。`docs/ai-development.md` の
provenance記録がCIで強制できないことを設計上の限界として受け入れているのと
同種の限界である。

### D8: 実行面と段階導入

検証は決定的なコマンドの終了コードで行う。LLMの判断を検証に使わない。

- 終了コードは `0` = findingなし、`1` = findingあり（blockモード）、`2` = 使用法
  または内部エラーとする。warnモードはfindingがあっても `0` を返す。
- 外部ネットワークアクセス、GitHub API呼び出し、LLM呼び出しを行わない。
- `mise run req:check` はローカルとCIで同じ入力・同じ結果を返す。

`.github/workflows/requirements.yml` を専用workflowとして追加し、既存
`.github/workflows/ci.yml` のpaths設計を変更しない。`req:check` を
`mise run check` へ組み込まない。検出スクリプト自身の単体テストだけを
`mise run test` へ加える。

導入は警告から始め、観測後にブロックへ切り替える。切替は `--mode` の既定値と
workflowの `continue-on-error` の2箇所で制御し、コードを変更せずに戻せる。

### D9: 既存資産の採番方針

- マージ済みPull Requestとクローズ済みIssueは採番の対象外とする。
- 既存コードから要求を逆生成しない。コードの挙動を要求文に書き換えたものは
  実装の言い換えであり、定義上コードと一致するためドリフトを検出できない。
  さらに一度IDを得ると、次以降のセッションが人の決定事項として読む。
- 採番対象は、設計文書または仕様が既に存在する箇所に限る。
- 文書が無いが変更頻度が高い箇所は候補として提示するに留め、要求文はAIが生成
  した案をそのまま使わず人が書く。
- 採番は一括で行わず、対象一覧を提示して人が選別し、diffの承認を得てから
  書き込む。

### D10: 適用範囲外

次はこの仕組みの対象外とする。

- ADR本文とそのAmended運用。ADRの変更は `D-SPEC` を発火させない。
- `docs/replacement-roadmap.md` の項目。要求は仕様へ展開された時点から扱う。
- `docs/runbooks/`、`docs/design/`、`docs/migration-context.md`、
  `docs/public-repository-plan.md`、`.agents/skills/`。
- クローズ済みIssue、マージ済みPull Request、既存のコミット履歴。

## Consequences

- 仕様に新しい受け入れ条件を書くたびに、ID採番と台帳への1行追加が必要になる。
  lockファイルと同種の運用負荷が増える。
- 仕様だけを書き換えて整合を取る操作が機械的に表面化する。生成AIが仕様を実装へ
  合わせる失敗モードに対して、規約以外の抑止が1つ増える。
- `D-CODE` は意味を変えないリファクタで発火する。警告に留めるため作業は止まら
  ないが、恒常的なノイズを受け入れることになる。
- 未採番のコードは対象外のままであり、この仕組みは「新しく持ち込まれたズレ」
  だけを見る。既存の全ドリフトを洗い出すものではない。
- 既存のCI設計とpaths許可リストを変更しないため、検証対象外の文書変更でCIを
  起動しないという決定と共存する。代わりにworkflowが2本になる。
- 依存を追加しないため、supply-chainの審査対象は増えない。

## Follow-up slices and dependencies

| Order | Slice | Dependency | Primary routing |
| --- | --- | --- | --- |
| A | 規約・台帳・検出スクリプト（CI未接続） | 本ADRのみ | `agent:claude` |
| B | 層Aのパイロット採番（ONBOARDING、MEMBER-INTRO） | A。人による対象選別 | `agent:claude` |
| C | 層Aの残り採番（MEMBER-LIST、PROFILE-PHOTO） | B。diffの人の承認 | `agent:claude` |
| D | 専用workflowの警告接続と現状測定 | C | `agent:claude` |
| E | テンプレート類と `AGENTS.md` 追記 | D | `agent:claude` |
| F | 警告からブロックへの切替 | Dの観測結果。人の承認 | 人のcheckpoint |
| G | 横断要求（CI検証境界、合成fixture安全境界）の起草と採番 | 人が要求文を書く | 人のcheckpoint |
| H | GitHub PR metadata運用のsource of truth決定と統合 | 7文書のどれを正とするかの決定 | 人のcheckpoint |

## Compatibility, validation, and recovery

本ADRは文書、スクリプト、専用workflow、テンプレートだけを追加し、application
code、schema、secret、external resource、既存のCI paths設計を変更しない。
ADR 0002のOpenAPI契約、ADR 0019のsupply-chain評価、ADR 0020 / 0021のUI検証、
ADR 0022のtrust boundaryとは交差しない。

検証は次で行う。

- `mise run req:check` がblockモードで終了コード0を返す（整合状態）。
- 仕様だけを変更した合成diffで `D-SPEC` が終了コード1を返す。
- 実装だけを変更した合成diffで `D-CODE` が警告を出す。
- 要求を1件追加してIssue化・実装をしない状態で `UNTRACKED-PLANNED` に現れる。
- `scripts/check-requirements.test.mjs` が検出漏れと誤検出の両方を含む。

撤回する場合は、`docs/requirements/`、`scripts/*requirement*`、
`.github/workflows/requirements.yml`、テンプレート、`.mise.toml` のタスク、
`AGENTS.md` の追記をrevertする。仕様へ書き込んだ要求IDは、要求文そのものを
変更していないため、残しても削除してもどちらでも整合する。台帳を削除した時点
で検出は完全に停止する。

## References

- 既存の文書とコードの整合強制: `mise run tokens:generate:check`、`mise run api:generate:check`
- 既存の規約検証の前例: `scripts/validate-ci-paths.test.mjs`
- 生成AIのprovenance記録とその限界: `docs/ai-development.md`
- 要求IDとドリフト検出の運用規約: [`docs/requirements/README.md`](../reference/requirements-md.md)

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
