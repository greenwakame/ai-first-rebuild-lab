# ADR 0006: local database loginと認可済みmember repository

- Status: Accepted
- Date: 2026-07-25
- Tracking: GitHub Issue #19

## Context

ADR 0005で`works_api_member_reader`をpasswordなしの`NOLOGIN`権限groupとして定義した。Rust APIからlocal Supabaseを実際に検証するには環境固有のloginが必要だが、固定passwordやdatabase URLをmigration、repository、`.env`、CI artifactへ保存するとcredential lifecycleとschema lifecycleが混在する。

また、権限groupは必要tableをSELECTできるため、grantだけではmember単位の認可にならない。repositoryがverified Auth subjectを受けずにraw memberを取得できると、HTTP handlerや後続実装の誤りが認可漏れになる。

## Decision

- local専用wrapperが固定名`works_api_local`のloginをprocess開始時に作り、子process終了時にsessionを切断して削除する。
- loginは`NOINHERIT`、`NOSUPERUSER`、`NOCREATEDB`、`NOCREATEROLE`、`NOREPLICATION`、`NOBYPASSRLS`、connection limit 5とする。通常参照用`works_api_member_reader`に加え、Issue #56以降はtable権限を持たない`works_api_member_introduction_writer`を`INHERIT FALSE` / `SET TRUE`でだけ付与する。後者の適用範囲はADR 0016に従う。
- 32 byteのrandom passwordはproject-pinned Node.jsで生成し、PostgreSQL公式の`createuser --pwprompt`へ標準入力だけで渡す。client側でSCRAM verifierへ変換するため、平文passwordを`CREATE ROLE` statementやserver DDL logへ送らない。passwordとdatabase URLをcommand引数、tracked file、標準出力へ渡さない。
- wrapperはcontainer名、Supabase project label、host portをrepository設定と照合する。process-localなatomic lockで並行起動を拒否する。
- SQLx 0.9.0をdefault featureなしで固定し、PostgreSQL、Tokio、Rustls、UUID、`date`変換に必要なfeatureだけを有効にする。runtime query APIを使い、通常build時に`DATABASE_URL`や起動中DBを要求しない。
- connection poolは新しいconnectionごとに`SET ROLE works_api_member_reader`を実行し、`session_user = works_api_local`かつ`current_user = works_api_member_reader`を確認する。不一致、空URL、role切替失敗ではpoolを利用可能にしない。
- 自己紹介更新transactionだけは`SET LOCAL ROLE works_api_member_introduction_writer`へ切り替え、review済みmutation関数を呼ぶ。commit / rollback後はpoolのreader identityへ戻り、writer roleへtable権限を与えない。
- 初期化済みpoolはopaqueな`MemberReaderPool`として返し、raw `PgPool`をpersistence module外へ公開しない。repository constructorもこの型だけを受け付ける。
- `MemberRepository::list_authorized`は`VerifiedAuthSubject`と`EffectiveDate`を必須入力にする。active accountのactor解決と`private.can_read_member`によるfilterを1つのbind parameter query内で行い、認可前のmember rowや件数を返さない。
- inactive / unmapped subjectは`ActorUnavailable`として、active actorの0件と区別する。HTTP実装はこのerrorを詳細を漏らさない403へ変換する。
- repositoryが返すfieldはtarget UUID、表示名、カナ、入社日だけとする。legacy ID、mail、role、ruleを含めない。

## Credential lifecycle

wrapperは正常終了、子process失敗、INT、TERMでcleanupを実行する。一時passwordは子processの`DATABASE_URL`環境変数にだけ渡し、起動直後にwrapper側の変数をunsetする。SIGKILL、Docker daemon停止、machine停止ではtrapが動かない可能性があるため、次回起動は既存roleやlockを上書きせずfail closedにする。

この方式はlocal synthetic data用であり、Render、Supabase staging / production、Vercelへ適用しない。shared環境のlogin identity、secret store、rotation、失効、network TLS設定はdeploy topologyを確認する別Issue / ADRで決める。

## Repository boundary

`VerifiedAuthSubject::from_verified`は、後続のauthentication moduleが署名、issuer、audience、expiry、algorithmを検証したsubjectだけから作る。HTTP requestのmember ID、role header、subject header、effective dateをそのまま渡してはならない。

repository queryはactive accountが存在しない場合にもmember IDや許可件数を返さない。active actorの許可対象が0件の場合は空の`Vec`を返す。database errorとinvalid rowは安全なrepository errorに分類し、上位層がSQL、credential、個人データをresponseやlogへ出さない前提とする。

## Validation and recovery

信頼できるnetwork上でDocker Desktopを起動し、次を実行する。

```bash
mise run supabase:start
mise run check:db
mise run test:db:api
mise run supabase:stop
```

統合テストは実効database identity、2 actorの分離、role allow、user allow、user deny、ruleなし、inactive / unmapped、退社日境界に加え、自己紹介更新のrole切替、成功、競合、拒否、fixture復元を確認する。通常の`mise run test`ではDB testをignoreし、secretとDockerなしでunit / buildを再現できる。

異常終了後に一時roleまたはlockが残った場合は、実行中wrapperがないことを確認してから`docs/runbooks/supabase-cli.md`の回復手順を使う。local DBの整合性が不明なら一時loginを除去後、`mise run supabase:reset`でversion管理されたmigrationとseedへ戻す。remote databaseはこの手順の対象外とする。

## References

- [SQLx 0.9.0 `PoolOptions::after_connect`](https://docs.rs/sqlx/0.9.0/sqlx/pool/struct.PoolOptions.html#method.after_connect)
- [PostgreSQL 17 `CREATE ROLE` password safety](https://www.postgresql.org/docs/17/sql-createrole.html)
- ADR 0004: default denyのメンバー読取policy
- ADR 0005: Rust API用database loginと権限groupの分離
- ADR 0016: 自己紹介更新を専用database関数へ閉じ込める

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
