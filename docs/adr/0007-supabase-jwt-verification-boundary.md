# ADR 0007: Supabase JWT検証とRust authentication境界

- Status: Accepted
- Date: 2026-07-25
- Tracking: GitHub Issue #21

## Context

ADR 0006で、member repositoryは`VerifiedAuthSubject`を必須入力にしたが、その型を生成するauthentication実装は未定義だった。HTTP requestのsubject headerや未検証JWT payloadをこの型へ変換できると、database query内の認可filterが正しくてもactor identityを偽装できる。

Supabase公式仕様を2026-07-25に再確認した。Supabase Authの非対称signing keyはissuer配下の`/.well-known/jwks.json`へ公開され、rotation中は複数keyが信頼対象になる。access tokenは`iss`、`aud`、`exp`、`iat`、`sub`、`role`などを持ち、通常のuser sessionは`aud = authenticated`である。JWKS endpointは非対称keyを使っていないprojectでは公開keyを返さない。共有secretをAPIへ配布するHS256検証は公式にも非推奨である。

## Decision

### Trusted configuration and claims

- Rust APIは信頼済みserver設定からissuerとaudienceを受け取る。token内の`iss`からnetwork接続先を選ばない。
- issuerはcredential、query、fragmentのないabsolute URLに限定し、HTTPSを必須とする。local Supabase用にloopback hostだけHTTPを許可する。
- JWKS URLはnormalized issuerへ`/.well-known/jwks.json`を追加して一度だけ構築する。
- access tokenは16 KiB以下、`typ = JWT`、128 byte以下の非empty `kid`を必須とする。
- algorithm allowlistは`ES256`と`RS256`だけとし、HS256、`none`、その他のalgorithmをJWKS取得前に拒否する。
- signatureに加え、`iss`、設定audience、`exp`、存在する場合の`nbf`、UUID形式の`sub`、`iat`、`role = authenticated`、`is_anonymous = false`を検証する。clock skew allowanceは60秒とする。
- `VerifiedAuthSubject`のproduction constructorはauthentication moduleだけから利用できる。database integration test用constructorは`cfg(test)`時だけcompileする。

### JWKS retrieval and rotation

- `reqwest` 0.13.4をdefault featureなし・Rustlsで使用し、redirectを追跡しない。connect timeoutは2秒、request全体は5秒とする。
- JWKS responseは64 KiB以下、32 key以下、各keyの`kid`は一意かつ128 byte以下とする。Content-Lengthと実際のchunk累計を別々に制限する。
- 選択したkeyはJWT headerと同じalgorithmで、ES256はP-256の32 byte座標、RS256は2048〜8192 bit modulusと3以上の奇数exponentに限定する。`use`がある場合はsignature用、`key_ops`がある場合はverifyを含むことも確認する。
- 成功したJWKSは最大10分cacheする。Supabase edge側の10分cacheより長くapplicationだけで保持しない。
- 未知の`kid`ではcache期限内でも1回だけ強制refreshし、rotation中の新keyを受け入れる。refreshはmutexで直列化し、同時requestが重複取得しないようにする。
- 無効な`kid`によるfetch amplificationを避けるため、未知key refreshには30秒のcooldownを置く。取得失敗は5秒backoffする。
- 期限切れcacheのrefreshに失敗した場合、古いkeyを無期限に利用せず503相当へfail closedする。期限内の既知keyは、最大10分のrotation / revocation cache trade-offの範囲で利用する。
- 正常なJWKSを取得しても`kid`がないtokenは401相当、JWKS取得不能、空・過大・重複・不正key set、選択keyの不整合は503相当へ分離する。

### Service boundary

- `AuthenticatedMemberSearchService`はproductionで`SupabaseJwtVerifier`と`MemberRepository`の具体型だけを受け取る。差し替えtraitはmodule privateとし、test doubleからproduction境界を迂回できないようにする。
- invalid tokenは`Unauthenticated`、inactive / unmapped accountは`Forbidden`、JWKS・database・invalid row failureは`Unavailable`へ変換する。
- public errorの`Debug` / `Display`はstableな分類だけを返し、token、claim、subject、key material、HTTP body、database detailを含めない。
- Authorization header parser、HTTP status / body、OpenAPI endpointは後続Issueでこのservice errorを401 / 403 / 503へ変換する。

## Dependency and fixture policy

- JWT/JWK処理は`jsonwebtoken` 11.0.0の`rust_crypto` backendへ委譲し、署名algorithmを独自実装しない。
- unit testはP-256とRSAのprivate keyをprocess内で毎回生成し、test終了時に破棄する。PEM、private JWK、固定secret、実tokenをtracked fileへ保存しない。
- testはES256 / RS256、署名不一致、issuer / audience / expiry / subject / role / anonymous、HS256拒否、rotation、並行refresh、取得失敗、期限切れcache、redirect status、response上限、service error分類を合成値だけで確認する。

## Failure handling and recovery

この変更はRust code、dependency lock、文書だけで、database migration、remote Supabase、Render、Vercelの設定を変更しない。JWKSが利用不能ならmember endpointは503相当で閉じ、未検証payloadへfallbackしない。

本番の緊急key revocationではapplication cacheを明示purgeできる運用が必要になる。remote deploy topology、cache purge、alert、secret / environment injectionは後続ADRで決め、決まるまでmember HTTP endpointをproduction公開しない。不具合時はこの変更をrevertし、既存のhealth endpointだけを維持する。

## References

- [Supabase: JSON Web Token](https://supabase.com/docs/guides/auth/jwts)
- [Supabase: JWT Signing Keys](https://supabase.com/docs/guides/auth/signing-keys)
- [Supabase: Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook)
- [jsonwebtoken 11.0.0](https://docs.rs/jsonwebtoken/11.0.0)
- ADR 0006: local database loginと認可済みmember repository

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
