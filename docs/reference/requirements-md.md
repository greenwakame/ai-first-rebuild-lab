<p align="right"><sub><a href="../../README.md">← README へ戻る</a></sub></p>

# 要求IDとドリフト検出の規約の実物

仕様の受け入れ条件に機械可読なIDを与え、仕様・コード・テストのズレを決定的なコマンドで検出するための運用規約です。開発リポジトリの `docs/requirements/README.md` の実物をそのまま掲載します。

判断の経緯と却下した選択肢は [ADR 0023](../adr/0023-requirement-traceability-and-drift-detection.md) を、この仕組みの位置づけは [development-approach.md](../development-approach.md#要求トレーサビリティ) を参照してください。

## 読み方のポイント

- **要求は「仕様の受け入れ条件」だけを指します。** ロードマップの項目やADRの決定は要求として扱いません。ADRの決定は `ADR-<NNNN>-D<n>` という別系列のIDを持ちます。境界を先に固定しないと、あらゆる文書が「要求」になって台帳が機能しなくなるためです。
- **台帳（`registry.yaml`）は要求文を持ちません。** 状態・関連ADR・関連Issueなど、機械的に導出できない情報だけを持ちます。要求文の正は仕様側にあり、複製しません。
- **検出したら止めて人へ報告する**（7節）が、この規約の中心です。検出スクリプトは `--fix` に相当する機能を持ちません。仕様を書き換えてコードへ合わせる、`status` を下げる、弱い `kind` へ移す — いずれも finding を消す手段になるため、規約で禁じたうえで `D-SPEC` と `D-REGRESS` が機械的に裏付けます。
- **既存コードから要求を逆生成しません**（8節）。実装の言い換えは定義上コードと一致するためドリフトを検出できず、さらに一度IDを得ると、次以降のセッションがそれを人の決定事項として読んでしまうためです。
- **限界を規約の中に書いています。** 仕様とコードを同一Pull Requestで同時に書き換えれば共変更条件を満たして通過します。検出できるのは共変更規約の違反であって、意味の一致ではありません。

> [!NOTE]
> 台帳 `registry.yaml` の実物はこのリポジトリへ同期していません。要求文を含まず、要求が増えるたびに更新が必要になるためです。スキーマは下記2節・4節から読み取れます。

## 実物

````markdown
# 要求IDとドリフト検出の規約

- Status: Accepted
- Date: 2026-08-17
- Tracking: GitHub Issue #155
- Decision: [ADR 0023](../adr/0023-requirement-traceability-and-drift-detection.md)

この文書は、要求に機械可読なIDを与え、仕様・コード・テストのズレを決定的な
コマンドで検出するための規約である。決定の根拠と却下した選択肢はADR 0023を
正とし、ここでは日々の運用手順だけを扱う。

## 1. 何を要求として扱うか

要求は **feature specまたは横断仕様の受け入れ条件** である。

| 置き場所 | 対象 | 例 |
| --- | --- | --- |
| `docs/features/` | 利用者向け機能の縦切り仕様 | メンバー一覧、自己紹介、プロフィール写真 |
| `docs/requirements/` | CI、セキュリティ、開発運用などの横断要求 | CI検証境界、合成fixtureの安全境界 |

次は要求として扱わない。

- `docs/replacement-roadmap.md` の項目。feature specまたは横断仕様へ展開された
  時点から要求として扱う。
- ADR。ADRは決定であり、`ADR-xxxx-Dn` という別系列のIDを持つ。
- `docs/runbooks/`、`docs/design/`、`docs/migration-context.md`、
  `docs/public-repository-plan.md`、`.agents/skills/`。
- クローズ済みIssue、マージ済みPull Request、既存のコミット履歴。

## 2. ID体系

```text
REQ-<AREA>-<NNN>       要求。例: REQ-MEMBER-INTRO-004
ADR-<NNNN>-D<n>        D番号を持つADRの決定。例: ADR-0020-D4
ADR-<NNNN>             D番号を持たないADR全体。例: ADR-0008
```

- `<AREA>` は台帳 `registry.yaml` の `areas` が宣言した語彙だけを使う。
  `[A-Z][A-Z0-9]*(-[A-Z0-9]+)*` の形とする。
- `<NNN>` はAREA内の連番、ゼロ埋め3桁。**欠番を再利用しない。一度払い出したID
  は不変とする。** 仕様ファイルをリネームした場合はIDではなく台帳の `spec` を
  更新する。
- Requirement IDとGitHub Issue番号は別系列である。関連は台帳の `issues` で
  記録するだけで、検出の判定には使わない。
- 既存の `ADR 0020 D4` という空白区切りの記法は書き換えない。検出スクリプトが
  正規化して受理する。台帳の `decisions` にはハイフン区切りの正式形を書く。

Issueは公開される可能性がある。要求文、台帳、IDには、実氏名、実メール、
本番のホスト名、認証情報、旧システムの内部識別子など、公開できない情報を
書かない。

## 3. IDを貫通させる箇所

| 箇所 | 形式 | 必須性 |
| --- | --- | --- |
| 仕様 | ``- [ ] `REQ-XXX-001` 条件文`` | 必須 |
| 台帳 | `registry.yaml` の1エントリ | 必須 |
| Issue本文 | `## 対象要求` 節にIDを列挙 | 規約 |
| ブランチ | 変更しない（`<agent>/<issue-number>-<slug>` のまま） | — |
| コミット | 本文末尾の trailer `Requirement: REQ-XXX-001` | 任意 |
| 実装 | `// @req REQ-XXX-001`（SQLは `--`、CSSは `/* */`） | `implemented` なら必須 |
| テスト | 同じ `@req` マーカー。テスト名の文字列にIDを含めてもよい | `implemented` なら必須 |
| Pull Request | `## 対象要求` と `## 影響範囲` 節 | 規約 |

仕様側のID位置は、チェックボックス直後の最初のバッククォート付きトークンに
固定する。

```markdown
- [x] `REQ-MEMBER-INTRO-001` 一覧responseは許可されたsummaryだけを含み、自己紹介全文を含まない
```

受け入れ条件節に、要求ではない補足を書く場合は `(note)` を前置する。

```markdown
- [ ] (note) 以下は shared 環境の実権限matrix確定後に再評価する
```

実装側は、その要求を成立させている箇所へ1行だけ置く。

```rust
// @req REQ-MEMBER-INTRO-005
pub fn validate_introduction(input: &str) -> Result<Introduction, IntroductionError> {
```

テスト側も同じマーカーを使う。

```rust
#[cfg(test)]
mod tests {
    // @req REQ-MEMBER-INTRO-005
    #[test]
    fn introduction_validation_allows_only_bounded_plain_text() {
```

```typescript
// @req REQ-MEMBER-INTRO-004
it("未登録と権限なしを同じ表示へ畳む", () => {
```

抽出規則は全言語で1つにする。「テストらしいパスにあるID」と「Rustの
`#[cfg(test)]` より後ろにあるID」をテスト参照として数える。テスト名の文字列へ
IDを書いても同じように数えるが、**既存テストの名前を変えてまで埋め込む必要は
ない。** 言語ごとに別の抽出規則を持つと、規則そのものが誤検出の原因になる。

## 4. 状態

```text
planned ──→ tracked ──→ implemented
   └──────────┴───────────→ deferred
```

| status | 意味 | 台帳の必須項目 | マーカーの要件 |
| --- | --- | --- | --- |
| `planned` | 仕様は確定、Issue化も実装もされていない | なし | ゼロを推奨 |
| `tracked` | Issueで着手中 | `issues` 1件以上 | 任意 |
| `implemented` | 実装・テスト済み | なし | 実装1件以上かつテスト1件以上 |
| `deferred` | 意図的に見送り | `note` | 任意 |

**`planned` は正常状態である。** 仕様を先に固定し、実装を後続Issueへ分ける運用
を異常として扱わない。

## 4-1. kind

**受け入れ条件節の項目は原則すべて採番する。** 実装siteが定義できないという
理由で未採番のまま残さない。採番できない性質のものは `kind` で表現する。

| kind | 意味 | 実装マーカー | テストマーカー | 追加の必須項目 | ドリフト検出 |
| --- | --- | --- | --- | --- | --- |
| `requirement` | 既定。システムの性質を述べた要求 | `implemented` なら必須 | `implemented` なら必須 | — | 対象 |
| `verification` | 検証手段そのものを述べた条件 | **不要** | `implemented` なら必須 | `note` | 対象 |
| `documentation` | 成果物がchecked-in文書そのものである条件 | **不要** | **不要** | `note` と `decisions` 1件以上 | 限定的 |
| `descriptive` | 既存コードから逆生成した実装の言い換え | 不要 | 不要 | `note` | **対象外** |

`verification` は「local migration、pgTAP、Rust integration、contract、Web test
が通る」のように、対応する実装siteが定義できず、テストの存在そのものが条件で
あるものに使う。`note` に理由を書く。

`documentation` は「cache、失効、recovery手順をADRへ記録する」のように、
成果物が checked-in 文書そのものである条件に使う。コード上のマーカーを持たない
ため、`decisions` に成果物のADRを列挙し、`UNKNOWN-DECISION` が参照先の実在を
検証する。

> **`documentation` の検証範囲**: これは**文書への構造的なトレース**であり、
> 参照先のADRが存在し、指定したDecision IDが実在することだけを確認する。
> **ADR本文が要求を実際に満たしているかという意味的な整合性は機械検証しない。**
> その判断は人のレビューに残る。

`descriptive` は、やむを得ず既存コードから逆生成した「実装の言い換え」にだけ
付け、ドリフト検出の対象から恒久的に外す。**新しい要求へ付けてはならない。**

強い kind から弱い kind へ移す操作は、実装やテストのマーカーの要求を外して
finding を消せてしまう。この kind の後退は `D-REGRESS` で検出する。強さの順は
`requirement` > `verification` > `documentation` > `descriptive` とする。

## 5. 検出規則

`mise run req:check` が次を判定する。

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
へ落とす操作も、`requirement` から `verification` / `descriptive` へ移して実装
マーカーの要求を外す操作も、finding を黙らせる手段になるためである。

`D-CODE` は、意味を変えないリファクタでも発火する。機械的に除外する信頼できる
方法が無いため、**恒久的に warning に留める。ブロックへ昇格させない。**

## 6. 判定の範囲

全件を走査する規則は、台帳に載った要求だけを対象にする。したがって採番して
いない既存資産では失敗しない。

差分だけを見る規則（`UNREGISTERED`、`D-SPEC`、`D-CODE`）は、`origin/main` との
merge-baseからの変更に現れたファイルと仕様行だけを対象にする。**新しく持ち込ま
れたズレだけを見る。** 台帳が空でも `mise run req:check` は終了コード0で通る。

採番していないコードが対象外になる穴は、次で埋める。

- 登録済み仕様に残る未採番の受け入れ条件は、その行に触れたときにだけ採番を
  強制する。触れば必ず埋まる。
- 文書が無く変更頻度も低いコードは採番しない。**そのコードを変更するとき、その
  変更が要求に対応するなら、先に要求を書いて採番してから実装する。**
- 受け入れ条件節の外に要求が書かれた場合は、`areas` の `criteria_heading` 宣言と
  実ファイルの節構成の食い違いとして警告する。

## 7. 検出されたときにすること

**ズレを検出したら停止して人へ報告する。エージェントが整合を取ってはならない。**

- **仕様文書を書き換えてコードに合わせない。** 仕様が誤っている場合も、修正では
  なく報告を行い、人の判断を待つ。
- **台帳の `status` を後退させて finding を消さない。**
- **`deferred` や、より弱い `kind` を、finding を黙らせる目的で使わない。**

検出スクリプトはファイルを書き換える機能を持たない。`--fix` 相当のオプション
は実装しない。

この規約には2つの機械的な裏付けがある。仕様を書き換えてコードへ合わせる操作は
コードが変わらないため `D-SPEC` を踏む。statusを下げる操作は `D-REGRESS` を
踏む。ただし仕様とコードを同一Pull Requestで同時に書き換えれば共変更条件を
満たして通過する。これは規約とレビューでしか防げない限界である。

## 8. 既存資産の採番

- マージ済みPull Requestとクローズ済みIssueは採番の対象外とする。
- **既存コードから要求を逆生成しない。** コードの挙動を要求文へ書き換えたものは
  実装の言い換えであり、定義上コードと一致するためドリフトを検出できない。
  さらに一度IDを得ると、次以降のセッションが人の決定事項として読む。
- 採番対象は、設計文書または仕様が既に存在する箇所に限る。
- 文書が無い箇所は候補として提示するに留め、要求文はAIが生成した案をそのまま
  使わず人が書く。
- 採番は一括で行わない。対象一覧を提示して人が選別し、diffの承認を得てから
  書き込む。

## 9. コマンド

```bash
mise run req:check
```

差分スコープを含む全規則を実行する。既定は警告モードで、finding があっても
終了コード0を返す。

```bash
mise run req:check:all
```

`UNREGISTERED` を登録済み仕様の全受け入れ条件へ広げ、台帳の全件検証と合わせて
実行する。基準となる差分が無いため `D-SPEC` と `D-CODE` は評価しない。
現状測定に使う。

```bash
mise run req:impact -- REQ-MEMBER-INTRO-004
```

要求またはDecision IDの波及先（仕様の該当行、台帳、実装、テスト、関連ADR、
同じファイルを共有する他要求）を出力する。設計変更の承認材料にする。

終了コードは `0` = finding なし、`1` = finding あり（ブロックモード）、
`2` = 使用法または内部エラーとする。外部ネットワーク、GitHub API、LLMを
使わない。同じworktreeと同じbase refなら結果は常に同一である。
````

## 次に読む

| 文書 | 内容 |
| --- | --- |
| [ADR 0023](../adr/0023-requirement-traceability-and-drift-detection.md) | この仕組みを採用した判断と、却下した4案 |
| [agents-md.md](agents-md.md) | `AGENTS.md` の実物 |
| [development-approach.md](../development-approach.md) | 開発の進め方 |

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
