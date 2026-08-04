# ADR 0009: local Supabase Authとmember API runtime

- Status: Accepted
- Date: 2026-07-25
- Tracking: GitHub Issue #25

## Context

ADR 0006から0008で、短時間database login、Supabase JWT検証、認証済みmember searchのHTTP境界を個別に実装した。ただしlocal Supabase Authが発行したtokenを使い、JWKS取得、Rust認証、database認可、HTTP responseまでを同じ実行経路で確認するcompositionは存在しなかった。

Supabase CLI 2.109.1のlocal stackは、設定を追加しない場合もCLIに組み込まれたES256開発鍵でtokenを署名し、公開JWKSにはpublic componentだけを返す。この鍵はrepository secretではない一方、同じCLI versionを使うlocal project間で共有される既知の開発鍵である。Worksのlocal認証境界ではworktreeごとに異なる鍵を使い、private JWKを追跡ファイル、command argument、logへ出さずに再現可能な起動手順が必要である。

shared environmentのdatabase identity、secret injection、business timezone、key rotationと緊急cache purgeは未決定である。local compositionを既存のRender binaryへ流用すると、未reviewの設定でmember routeを公開できてしまう。

## Decision

### Local Auth signing key

- `supabase/config.toml`の`auth.signing_keys_path`を、gitignoreした`supabase/.local/auth-signing-keys.json`へ固定する。
- `mise run supabase:auth:key`は対象が未作成の場合だけ、project-pinned Supabase CLIの`gen signing-key --algorithm ES256`で1鍵を生成する。生成中のCLI出力は表示しない。
- 既存directory / fileは自動修正・上書きしない。symlink、regular file以外、directoryが`0700`以外、fileが`0600`以外、JSON不正、複数鍵、ES256 / P-256 / signing用途以外、private component欠落、別方式のprivate field混入をfail closedにする。
- Supabase lifecycle用のmise taskは設定を読む前に同じ検証を行う。private JWK、service-role key、passwordを`.env`、Issue、PR、CI artifactへ転記しない。

### Local-only Rust composition

- 既定の`works-api` binaryと`mise run dev:api`は、引き続きdependency-freeな`/healthz`だけを提供する。Render設定も変更しない。
- `works-api-local-member`を別binaryとして追加し、`127.0.0.1`へだけbindする。callerがhost address、issuer、effective dateを上書きする設定は持たせない。
- issuerはrepositoryのlocal Supabase URL `http://127.0.0.1:54321/auth/v1`へ固定する。databaseはADR 0006のwrapperが子processだけへ渡す`DATABASE_URL`を必須とし、接続後に`works_api_local`から`works_api_member_reader`へ切り替わったことを再検証する。Issue #56の自己紹介更新transactionだけはADR 0016のwriter roleを局所的に使う。
- effective dateはlocal合成fixtureを決定的に評価できるようUTC+09:00のcalendar dateをserver側で作る。これはproductionの業務timezone決定ではなく、shared runtimeへ再利用しない。
- startup errorとtraceは固定の非機密メッセージだけを出す。SQLx、HTTP client、database URL、issuerの内部errorを連鎖表示しない。

### End-to-end smoke test

- `mise run smoke:api:member`は起動済みlocal Supabaseだけを対象とし、API URL、Docker project label、database port、公開JWKSのES256 public-only形状を検証する。
- 実行ごとにrandomな合成Authユーザーとpasswordをmemory上で作り、password sign-inで得たtokenのenvelopeを検査する。tokenの署名・issuer・audience・claimsはRust verifierがHTTP request中に検証する。
- seed済み合成actorのAuth対応付けを一時的に合成ユーザーへ差し替え、Authorizationなしの401、正規tokenの認可済み参照、自己紹介の更新・競合・拒否・元の合成本文への復元を確認する。response body、UUID、氏名、本文、tokenを出力しない。
- 終了時とSIGINT / SIGTERM時は、local API、短時間database role、actor対応付け、合成Authユーザーを清掃する。対応付けが期待状態から変化していた場合は自動上書きせず停止する。
- このsmoke testはDocker時間とlocal secretを扱うため通常CIへ追加しない。localで明示実行し、GitHub Actionsの利用時間を増やさない。

## Consequences

- clean worktreeでもprivate signing keyをrepository外のsecret managerなしで安全に初期化し、同じkeyをlocal data volumeとともに再利用できる。
- local AuthからRust member APIまでの最小縦断経路を1 commandで検証できる一方、Supabase stackの起動とmigration / seed適用は明示的な前提として残る。
- custom signing keyを削除・再生成すると既存local sessionは無効になる。local dataだけを使う前提のため許容するが、stack稼働中には回転しない。
- production / stagingのissuer、secret store、database login、timezone、監視、rollbackは未決定のままであり、このbinaryとkey fileをdeployしない。

## Verification and recovery

- key bootstrapをfresh / reuseの両方で実行し、gitignore、`0700/0600`、private ES256 JWK validationを確認する。
- Rust unit testでloopback address、port validation、startup errorの非機密性を確認する。
- local Supabaseをreset後、pgTAP、Rust DB integration、`smoke:api:member`を実行する。smoke後に一時roleが0件、合成actor mappingがseed値、作成したAuth userが削除済みであることを値を表示せず確認する。
- 通常終了できなかった場合はAPI / wrapper processがないことを確認する。mappingまたはroleの状態を断定できなければ手動更新せず、local stackを停止して`mise run supabase:reset`で合成databaseを再構築する。Auth userが残った疑いがある場合はlocal volumeを破棄して再作成する。
- signing keyを回転する場合はlocal stackを停止し、`supabase/.local/auth-signing-keys.json`だけを削除してから`mise run supabase:start`を実行する。remote / linked projectへこの手順を使わない。

## References

- [Supabase: JWT signing keys](https://supabase.com/docs/guides/auth/signing-keys)
- [Supabase: managing local configuration](https://supabase.com/docs/guides/local-development/managing-config)
- [Supabase: JSON Web Tokens](https://supabase.com/docs/guides/auth/jwts)
- [Supabase CLI 2.109.1: signing key generation](https://github.com/supabase/cli/blob/v2.109.1/apps/cli-go/internal/gen/signingkeys/signingkeys.go)
- [Supabase CLI 2.109.1: local configuration loading](https://github.com/supabase/cli/blob/v2.109.1/apps/cli-go/pkg/config/config.go)
- ADR 0006: local database loginと認可済みmember repository
- ADR 0007: Supabase JWT検証とRust authentication境界
- ADR 0008: 認証済みmember searchのHTTP境界

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
