# ADR 0015: 自己紹介参照をmember coreから分離する

- Status: Accepted
- Date: 2026-07-29
- Tracking: GitHub Issue #52

## Context

旧システムは自己紹介を、メンバー基本情報とは別のテーブルとフロントエンド機能で独立管理していた。一方、現在の新版APIはmember coreの一覧・詳細だけを返している。member coreの参照許可をそのまま自己紹介へ継承すると、旧来のfield-level authorizationを失い、一覧取得だけで不要な全文を配布する危険がある。

## Decision

- 自己紹介本文とread ruleを `private` schemaの専用tableで保持する。
- `private.can_read_member_introduction(uuid, uuid, date)` を追加し、member core readに加えて自己紹介専用のuser/role ruleが許可する場合だけtrueにする。
- user deny、user allow、いずれかのrole allow、default denyの順序はADR 0004と揃えるが、rule rowは共有しない。
- 一覧と詳細に新endpointは作らず、既存member search/profile responseへそれぞれnullableなsummary/full fieldを追加する。
- `null` は未登録と権限なしを兼ねる。存在flag、拒否理由、専用errorをbrowserへ返さない。
- 一覧queryは改行をspaceへ畳んだ120 Unicode scalar以内のsummaryだけを返し、全文を一覧modelへ入れない。
- 詳細queryは許可された対象だけ最大1,000 Unicode scalarのplain textを返す。
- Rust read permission groupには専用tableのSELECTと専用functionのEXECUTEだけを追加し、write権限とData API roleの権限は付与しない。
- update capabilityは本人または明示された管理権限とし、具体的なrule、normalization、楽観的排他制御はIssue #56で別途決定・実装する。

## Consequences

- member coreを参照できても自己紹介ruleがなければfieldはnullとなり、権限の自動拡大を防げる。
- 一覧payloadから全文を排除できるため、取得量と漏えい時の影響を小さくできる。
- 未登録と拒否を同じ表現へ畳むため、browserだけでは自己紹介の存在を推測できない。
- API fieldはrequired nullableとするため、server/clientを同一changeで更新する必要がある。
- permission groupはtableを直接SELECTできるため、最終的なobject-level境界は引き続きreview済みRust repository queryに依存する。

## Compatibility, validation, and recovery

- 既存endpointの成功responseにrequired fieldを追加するため、旧clientとの互換性は保証しない。現在は新版内のgenerated clientだけをconsumerとし、contractと実装を同時にdeployする。
- localではmigration replay、pgTAP、Rust repository integration、OpenAPI generated-client check、Next.js parser/UI testを実行する。
- shared環境適用前は `supabase db reset --local` で回復する。shared環境適用後はmigrationを編集せず、緊急時はAPI fieldを常時nullへ閉じ、forward migrationでgrant/function/schemaを是正する。
- 実legacy dataはこのmigrationへ含めず、別の承認済みmigration/import手順で件数と関係を照合する。

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
