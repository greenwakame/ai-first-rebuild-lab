# ADR 0008: 認証済みmember searchのHTTP境界

- Status: Accepted
- Date: 2026-07-25
- Tracking: GitHub Issue #23

## Context

ADR 0007でSupabase access tokenの検証と、検証済みsubjectを必須にする現在の`AuthenticatedMemberSearchService`を実装した。HTTP境界がAuthorization headerを曖昧に解釈したり、service errorの内部情報をresponseへ反射したりすると、その認証境界を維持できない。

一方、shared environmentのdatabase login、issuer / audience設定、secret store、business timezone、緊急key cache purgeは未決定である。現在のRender previewへmember routeを無条件で追加すると、reviewされていないruntime identityで保護APIを公開することになる。

## Decision

### Request and authentication

- read-only endpointを`POST /v1/member-search`とし、Supabase access token用HTTP bearer schemeをOpenAPIへ定義する。
- Authorization headerはexactly oneを必須とする。header欠落、重複、Bearer以外、空token、token内のwhitespace / commaを同じ401へ閉じる。
- scheme比較だけASCII case-insensitiveとし、token値は変更せず`AuthenticatedMemberSearchService`へ渡す。HTTP headerのsubject、member ID、role、effective dateは認証・認可identityに使わない。
- token検証後のinactive / unmapped accountは403、JWKS / database failureは503とする。401を含むerror bodyは固定codeとgeneric messageだけを返し、401のchallengeは`WWW-Authenticate: Bearer`だけにする。

### Response and cache boundary

- 成功responseは`items`と、repositoryが認可filter後に返したtarget UUID、表示名、カナ、入社日だけを含む。legacy ID、mail、role、rule、token、auth subjectを含めない。
- 200 / 401 / 403 / 503へ`Cache-Control: private, no-store`と`Vary: Authorization`を付ける。
- query / sort / cursor / pagination request bodyは後続Issueでvalidationと同時に追加する。このIssueのPOSTはrequest bodyを定義しない。
- OpenAPIを契約の正とし、generated TypeScript clientとRust route testを同じ変更で更新する。

### Composition and publication boundary

- `works_api::app()`はdependency-freeな`/healthz`だけを持つ既定compositionとして維持する。現在のRender previewへmember routeを公開しない。
- `works_api::app_with_member_search`は具体的な`AuthenticatedMemberSearchService`と、server側のtrusted effective-date providerが明示的に渡された場合だけmember routeを組み立てる。
- effective dateをHTTP requestから受け取らない。business timezoneが未決定のためlibrary側でUTCやhost local timeを暗黙選択せず、将来のruntime compositionへ明示注入を要求する。
- shared environmentのroute有効化はdatabase identity、issuer、secret injection、timezone、key cache purge、alert、rollbackを別Issue / ADRで固定してから行う。

### Observability

- ADR 0003のallowlistを維持し、member requestもmethod、matched route pattern、status、latency、server-generated request IDだけを記録する。
- Authorization header、caller-supplied identity header、query、body、token、auth subject、member UUID、氏名、response bodyをaccess logへ渡さない。

## Consequences

- HTTPの認証・error・cache contractをremote secretやdatabase接続なしでunit / contract testできる。
- OpenAPI clientはmember endpointを型として利用できるが、既定previewではrouteが有効化されていない。route availabilityは後続runtime compositionの完了まで保証しない。
- 固定のbusiness dateをlibraryが推測しないため、退社日境界の業務判断が欠けたままremote routeを有効化しにくい。
- 現段階のresponseは全認可済みmemberを返す。検索、sort、cursorとlimitを実装するまではlocal synthetic fixture以外で性能・data minimizationを評価しない。

## Verification and recovery

- route testでheader欠落 / 重複 / 不正形式、200 empty / item、401 / 403 / 503、cache header、generic challengeを確認する。
- captured JSON access logにtoken、identity header、query、body、member ID、氏名が含まれないことを確認する。
- OpenAPI lint、generated client drift、TypeScript contract test、Rust testをcanonical checkへ含める。
- 問題がある場合は`app_with_member_search`、member route、OpenAPI operationをrevertする。既定`app()`と`/healthz`は独立して維持される。
- remote database、migration、secret、deploy設定をこの変更では作成・変更しない。

## References

- ADR 0002: OpenAPI契約先行とTypeScript client生成
- ADR 0003: request ID付きprivacy-safe access log
- ADR 0006: local database loginと認可済みmember repository
- ADR 0007: Supabase JWT検証とRust authentication境界

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
