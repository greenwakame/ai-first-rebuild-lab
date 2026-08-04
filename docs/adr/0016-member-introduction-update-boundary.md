# ADR 0016: 自己紹介更新を専用database関数へ閉じ込める

- Status: Accepted
- Date: 2026-07-29
- Tracking: GitHub Issue #56

## Context

ADR 0015で自己紹介の参照権限をmember coreから分離し、`updated_at`を将来の楽観的排他tokenとして予約した。更新では、本人または明示された管理権限、plain-text validation、同時更新、監査を同じ境界で保証する必要がある。Rust runtimeへtableの直接`INSERT` / `UPDATE`を付与すると、applicationの誤りや侵害時に対象・認可・監査を迂回できる。

旧システムは本文を必須とし、更新日時による楽観的排他制御で競合を拒否していた。空文字を削除と解釈する根拠と、全管理者へ一律に権限を広げる根拠は確認できていない。

## Decision

- 更新可能なのは、自己紹介を参照できる本人、または自己紹介専用のuser / role ruleで明示的に許可されたactorだけとする。user deny、user allow、role allow、default denyの順で評価する。
- Rust APIは`POST /v1/member-introduction`でtarget、本文、直前の`expected_updated_at`をrequest bodyから受ける。targetと本文をURL、error、access logへ含めない。
- CRLFとCRはLFへ正規化する。正規化後1〜1,000 Unicode文字、空白のみ不可、LF以外の制御文字不可とし、HTML / Markdownとして解釈しない。空文字による削除は実装しない。
- `expected_updated_at = null`は、許可された参照時点で自己紹介が未登録だった場合のcreateだけに使う。既存rowには完全一致するtokenを要求し、不一致は409として拒否する。競合後の強制上書きendpointは設けず、最新profileを再読込してから再編集する。
- profile responseは更新可能な場合だけ`introduction_edit`を返す。object内の`expected_updated_at`は未登録時だけnullとし、更新不可ではobject自体をnullにする。
- `works_api_member_introduction_writer`はpasswordなしの`NOLOGIN` roleとし、table権限を持たず、固定SQLの`private.mutate_member_introduction`だけを実行できる。
- mutation関数は`SECURITY DEFINER`とする。ownerはruntimeへ付与しない`works_member_introduction_mutator`とし、必要tableのSELECT、自己紹介のINSERT / UPDATE、auditのINSERTだけを持つ。関数はdynamic SQLを使わず、`search_path`を固定する。
- auditはactor member ID、target member ID、`updated` / `conflict` / `denied` / `invalid`、時刻だけを保存する。本文、request payload、氏名、tokenは保存しない。active accountへ解決できない試行は帰属不能のためaudit rowを作らない。
- local runtime loginはreader roleとwriter roleを`INHERIT FALSE` / `SET TRUE`で受ける。connectionはreaderを既定とし、repositoryの更新transaction内だけ`SET LOCAL ROLE works_api_member_introduction_writer`へ切り替える。

## Consequences

- 更新の認可、validation、競合判定、本文なし監査が一つのdatabase transactionから外れず、Rust runtimeは任意の自己紹介rowを直接変更できない。
- 本人更新にもmember coreと自己紹介の参照権限が必要なため、参照不能なfieldをblind updateできない。
- 409後は利用者が最新内容を確認してから再入力する。自動mergeやlast-write-winsは行わない。
- auditは個人識別子を含む。保持期間、閲覧者、export / deletion手順はshared環境適用前にdata ownerとsecurity ownerが決める。決定まではlocal synthetic dataだけを対象とする。
- shared環境のruntime role作成、secret injection、audit運用はこのlocal実装だけでは確定しない。

## Compatibility, validation, and recovery

- profile success responseへrequired nullable fieldを追加し、新規update endpointを追加する。現在のconsumerはversion管理されたgenerated clientだけとし、contract、Rust、Next.jsを同時にdeployする。
- localではmigration replay、Data API deny、writerのtable権限なし、本人 / allow / deny、validation、create / update / conflict、audit列、Rust role切替、HTTP / Web routeを合成fixtureで検証する。
- shared環境適用前は`mise run supabase:reset`で回復する。適用後に問題が判明した場合はendpointと編集UIを無効化し、既存migrationを書き換えずforward migrationでfunction、grant、ruleを是正する。本文rowをrollbackで削除・復元しない。
- smoke testの一時更新は同じendpointと新しいtokenを使って元の合成本文へ復元する。復元を確認できない場合は別testを重ねず、local stackを停止してresetする。

## References

- ADR 0004: default denyのメンバー読取policy
- ADR 0006: local database loginと認可済みmember repository
- ADR 0015: 自己紹介参照をmember coreから分離する
- `docs/features/member-introduction.md`

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
