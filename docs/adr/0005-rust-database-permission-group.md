# ADR 0005: Rust API用database loginと権限groupの分離

- Status: Accepted
- Date: 2026-07-25
- Tracking: GitHub Issue #17

## Context

ADR 0004でメンバー読取認可のprivate tableと `private.can_read_member` を追加したが、Rust APIが使うdatabase principalは未定義である。Supabase `postgres` database userや `service_role` keyを通常のapplication read経路で使うと、必要範囲を超える権限をapplication compromiseへ渡すことになる。

一方、password付きlogin roleをversion-controlled migrationへ作るとcredentialの配布、rotation、environment分離をmigrationへ混在させる。Supabase local resetではdatabase外のcluster roleが残る可能性もあり、clean databaseだけを前提とした `CREATE ROLE` は再現できない。

## Decision

- version controlでは `works_api_member_reader` という `NOLOGIN` 権限groupだけを作る。
- groupは `NOINHERIT`、`NOSUPERUSER`、`NOCREATEDB`、`NOCREATEROLE`、`NOREPLICATION`、`NOBYPASSRLS` とし、passwordを持たず、他roleのmemberにしない。
- migration適用時のgroup member allowlistはmigration managerの `postgres` だけとする。Data API roleや以前のlocal runtime loginを含む他memberは現在のgrantorでrevokeし、別grantorのmembershipが残る場合はfail closedにする。
- migration managerの `postgres` に限り、role作成時に自動付与されるADMIN optionを保持し、`SET TRUE` / `INHERIT FALSE` でgroup membershipを持つ。これによりmigrationとpgTAPは明示的に実効権限を確認できるが、通常sessionへ権限を暗黙継承しない。
- migration replay時はroleの存在を条件付きで確認し、変更可能な安全属性、親role membership、member、直接grantを毎回allowlistへ戻す。migration executorでは除去できない `SUPERUSER`、`REPLICATION`、`BYPASSRLS`、別grantorのmembershipへのdriftは検出時にfail closedとし、承認済みadministratorによる是正なしで継続しない。
- grantは次だけとする。
  - `private` schemaの `USAGE`。
  - `members`、`user_accounts`、退社、role / user-role、role / user read ruleの7 tableの `SELECT`。
  - `private.can_read_member(uuid, uuid, date)` の `EXECUTE`。
- schema `CREATE`、table write / truncate / references / trigger、sequence、他のprivate table / function、future objectへのdefault privilegeを付与しない。
- 環境ごとのruntime login role、password、membershipはmigrationとrepositoryへ保存しない。後続Issueでlocal bootstrapとdeploy先secret storeを設計し、環境identityを明示してから作る。
- runtime database URLはRust serverだけが読み、browser bundle、`NEXT_PUBLIC_*`、log、error、Issue、PR、CI artifactへ出さない。
- Rust connection pool導入時は各connectionで期待したpermission groupがactiveであることをfail closedに確認する。`postgres` や `service_role` へのfallbackを持たない。
- member repositoryはverified Auth subjectから解決したactorと、applicationが決めたeffective dateを必須入力にする。caller-supplied member ID / role / dateをそのまま認可identityとして使わず、bind parameterを使った同一query内で認可filterをpaginationとcountより前に適用する。

## Authorization boundary

このgroupのgrantはtable / function単位のleast privilegeであり、object-level authorizationの代替ではない。`SECURITY INVOKER` の認可functionを実行するためにauthorization tableのSELECTが必要であり、group自体は許可target以外のrowもSQLとして参照できる。

したがって、Rust repositoryがactorを指定せずraw member rowsを返さない設計とintegration testは後続実装の必須条件になる。将来database側だけでrow境界を強制する必要が生じた場合は、RLSまたは厳密にreviewした `SECURITY DEFINER` APIを別ADR / migrationで検討する。

## Compatibility and operations

- migrationは既存table、row、function semanticsを変更せず、cluster roleとACLだけを追加する。
- direct grantを先にrevokeしてallowlistを再付与するため、同じmigration chainをlocal resetで繰り返せる。
- future private objectは自動では読めない。member responseへtableを追加する場合は、同じmigrationで最小grantとallowed / denied testを追加する。
- local pgTAPはmigration managerの `postgres` から `SET ROLE works_api_member_reader` して実効権限を確認する。これはruntime loginやpasswordを作るものではない。
- local runtime loginを後続bootstrapで追加した後にdatabase resetする場合、migrationは残存membershipを除去するためbootstrapを再実行する。
- shared environmentへ適用する前に、同名roleの属性、親role membership、既存members、object ownership、pending grant差分を値を出さず確認する。

## Validation and recovery

信頼できるnetwork上でDocker Desktopを起動し、次を実行する。

```bash
mise run supabase:start
mise run check:db
mise run supabase:reset
mise run supabase:migrations
mise run supabase:stop
```

pgTAPはrole属性、password不在、parent / unexpected membership不在、migration managerの限定membership、object ownership不在、許可されたUSAGE / SELECT / EXECUTE、拒否されたCREATE / write / sequence / unlisted object、`SET ROLE` 下のallow / denyを確認する。

この決定時点ではremote database、runtime login、password、environment secretを変更しない。localで問題があればdatabaseをresetして修正後のmigration chainをreplayする。将来shared environmentへ適用した後はmigration fileを書き換えず、forward migrationでgrantまたはrole属性を縮小・是正する。runtime credentialが存在する段階では、grant修正とcredential rotationを別の明示的な運用手順として扱う。

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
