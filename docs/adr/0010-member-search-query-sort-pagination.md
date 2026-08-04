# ADR 0010: member searchのliteral検索と署名付きcursor pagination

- Status: Accepted
- Date: 2026-07-25
- Tracking: GitHub Issue #27

## Context

Issue #23と#25で、認証済みsubjectをdatabase認可へ渡すread-only `POST /v1/member-search` とlocal縦断runtimeを実装した。ただしendpointは認可済みrowを全件返し、検索、sort、paginationを持たなかった。

旧システムのフロントエンドは全件をbrowserへ取得し、空白区切りの各語をクライアント側の正規表現として氏名、カナ、所属表示などへ照合していた。この方式はpayload量に上限がなく、不正な正規表現や意図しないwildcard解釈を利用者入力へ持ち込む。replacementにはserver-sideのbounded inputと、認可前の件数やrowを漏らさない安定したpage境界が必要である。

一方、target databaseには氏名、カナ、入社日までしかなく、旧システムでは所属情報が複数箇所に分散して保持されており、単一の正とする情報源が確定していない。このIssueで組織schemaや検索意味を推測しない。

## Decision

### Requestとliteral検索

- request bodyは省略可能とし、`query = ""`、`sort = "name"`、`direction = "asc"`、`limit = 20`を既定値にする。
- JSONは未知fieldを拒否する。bodyは4 KiBまで、`query`は100 Unicode scalarまで、Unicode whitespaceで最大8語、`limit`は1から50、`cursor`は1から1024文字に制限する。
- control characterを拒否し、各termはcase-insensitiveなliteralとして`display_name`または`name_kana`へ照合する。全termがいずれかのfieldへ一致するAND条件とし、正規表現、SQL LIKE wildcard、Unicode正規化、カナ変換は行わない。
- `sort`は`name`と`joined_on`、`direction`は`asc`と`desc`のallowlistだけを受け付け、SQL文字列を動的に組み立てない。
- 不正JSON、入力上限違反、不正または期限切れcursor、現在条件で不適格なpage境界は、内部理由を区別しない固定400 `invalid_member_search_request`へ閉じる。

### 認可、sort、keyset page

- active actor解決と`private.can_read_member`による絞り込みを、検索、cursor境界、`limit + 1`より前の同一queryで実行する。総件数は返さない。
- name keyは`lower(coalesce(name_kana, display_name))`、joined-on keyは`joined_on NULLS LAST`とし、常に`member_id`を方向と同じ一意なtie-breakerにする。
- cursorの`member_id`は同じactor、effective date、queryで認可・検索済みの集合に存在する場合だけ境界として使う。別actorの認可外rowや、条件変更で対象外になったrowは400にする。
- repositoryは最大`limit + 1`件だけ取得し、追加rowの有無から`next_cursor`を発行する。responseは`items`とnullableな`next_cursor`だけを返す。

### Opaque cursor

- 32-byteのprocess-local random secretからHMAC-SHA-256でcursorを署名する。local runtime起動ごとにsecretを作り、file、環境変数、log、responseへ鍵を保存しない。
- payloadはversion、発行・失効時刻、境界member UUID、sort、direction、検索termのkeyed digestだけを含む。検索語、access token、actor、氏名は含めない。
- cursorは15分で失効し、最大60秒のclock skewだけを許容する。signature、version、有効期間、query digest、sort、directionを検証してからdatabaseへ渡す。
- process再起動で既存cursorが無効になることをlocal-only段階では許容する。複数instanceで共有するcursor secretとrotationはshared runtimeの設計Issueへ残し、この実装をdeployしない。

## Consequences

- 認可対象だけをboundedなserver-side pageとして返せるため、legacyの全件payloadとclient正規表現を引き継がない。
- cursorはoffsetのように認可前件数を表さず、改ざん、条件変更、期限切れ、process再起動を同じprivate 400として扱う。
- case-insensitive照合はPostgreSQLのdatabase localeに依存し、Unicode正規化やひらがな・カタカナ同一視を提供しない。期待する日本語検索規則とindexは匿名化したdata profile後に決定する。
- organization、position、unit、skill検索は未実装であり、primary organization modelを決める後続Issueなしに追加しない。
- nullable入社日と同一sort keyの挙動を検証するため、local seedに匿名のNULL日付fixtureを追加する。実データは追加しない。

## Verification and recovery

- Rust unit / HTTP testで既定値、Unicode whitespace、各入力上限、未知field、literal文字、cursor署名・期限・条件bind、固定400、private cache header、非機密logを確認する。
- local Supabaseの最小権限loginを使い、actor差、退社境界、literal AND、wildcard文字、name / joined-on方向、NULLS LAST、UUID tie-breaker、複数page、不適格な境界をdatabase integration testで確認する。
- local smoke testでSupabase Auth tokenから1件目、署名cursorによる2件目、改ざんcursorの400までを通し、token、cursor、member情報を出力しない。
- 問題がある場合はOpenAPI request / `next_cursor`、service codec、repository page queryを同時にrevertし、ADR 0009時点のlocal routeへ戻す。schema migrationはない。追加した合成seedを除き、remote dataのrollbackは発生しない。

## References

- ADR 0006: local database loginと認可済みmember repository
- ADR 0007: Supabase JWT検証とRust authentication境界
- ADR 0008: 認証済みmember searchのHTTP境界
- ADR 0009: local Supabase Authとmember API runtime

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
