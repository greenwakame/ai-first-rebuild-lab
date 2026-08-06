# ADR 0013: Next.jsメンバー一覧の検索・並び替え・cursor操作

- Status: Accepted
- Date: 2026-07-26
- Tracking: GitHub Issue #41
- Amended: 2026-07-26 (GitHub Issue #43)、2026-07-28 (GitHub Issue #54)

## Context

Issue #27でRust APIのliteral AND検索、allowlist済みsort、署名付きopaque cursorを実装し、Issue #39でNext.js server boundaryから認可済み初期pageを表示できるようにした。一方、画面から検索条件を変更したり、cursorで次pageを取得したりする経路はなく、検索語をURLへ出さずにbrowserから認証済みserver boundaryへ渡す方法も未決定だった。

member検索は氏名を含む個人データを扱う。検索語、token、不要なmember UUIDをURL、browser history、Referrer、log、React payloadへ出さず、CSRF、過大body、競合request、upstream errorをfail-closedに扱う必要がある。Issue #55で認可済み詳細へ移動するopaque UUIDの相対URLだけを例外として追加する。

## Decision

### BrowserからNext.jsへの境界

- browserはsame-originの`POST /members/search`だけを呼び、Rust API、Supabase Data API、access tokenへ直接アクセスしない。検索条件はURL、query string、localStorage、sessionStorageへ保存しない。
- Route Handlerは既存のOrigin / Host検証を再利用し、`application/json`、宣言長とstream実測の両方で2 KiB以下だけを受け付ける。UTF-8、JSON、exact key、入力上限、sort / direction allowlistに違反するrequestは固定400へ閉じる。
- requestは`query`、`sort`、`direction`、`cursor`のexact shapeとする。queryは100 Unicode scalar以下、Unicode空白区切り8語以下、control characterなしとし、cursorはnullまたは1024文字以下とする。
- Route Handlerはserver-side session検証後の既存member serviceを呼ぶ。responseは`private, no-store`、`Vary: Cookie`、`Referrer-Policy: same-origin`を維持し、200 / 400 / 401 / 403 / 503を既存の利用者状態へ対応付ける。検索条件をURLへ含めず、cross-originへのReferrerを送らない境界は維持する。

### Browserへ返すdata

- Rust APIのmember UUIDはserver-sideで認可済み行の`profileHref`へ変換する。browserへ返す各itemは`profileHref`、`displayName`、`nameKana`、`joinedOn`、`organizationName`、`positionName`のexact shapeとし、`profileHref`はquery / fragmentのないcanonicalな`/members/{UUID}`だけを許可する。UUIDの単独fieldとorganization / position UUIDは除去する。
- skill、自己紹介、写真参照は対応contractが完了するまでbrowser responseへ加えず、一覧と詳細で明示的なplaceholderとして表示する。動作する詳細linkは認可済み検索結果だけに追加する。
- browser側でもstatus、header、content type、exact response shape、20件上限、文字列・日付・request ID・cursor上限をruntime検証する。不一致、redirect、timeout、network error、未知のstatusは内部detailを反射せずservice unavailableへ閉じる。
- opaque cursorは次pageを取得するための一時的なbrowser memoryとしてだけ保持する。cursor内部の意味を解釈せず、画面、URL、永続storage、application logへ出さない。

### UI stateと操作

- 初期pageはServer Componentで取得し、検索formと以降のpage操作だけをClient Componentが担当する。draft条件と最後に適用済みの条件を分離し、次pageのcursorを別のdraft条件へ誤って送らない。
- 新しい検索は表示結果を置き換え、`さらに表示`は現在の認可済み結果へ追記する。次page取得だけが失敗した場合は既存結果を保持し、次pageの再試行を提示する。
- 進行中requestはAbortControllerと6秒timeoutで中止できるようにし、新しいrequestまたはunmount後に古いresponseが画面を上書きしないようsequenceを確認する。
- input、select、buttonはnative HTMLを使う。pending中は二重送信を無効化し、入力errorと更新後の結果領域へprogrammatic focusを移す。360pxではcontrolを1列にし、横scrollを発生させない。

## Consequences

- 利用者は氏名・氏名カナのliteral AND検索、氏名または入社日の昇順・降順、cursorによる追加読込を画面から操作できる。
- URL共有やbrowser historyによる検索条件復元は行わない。これは個人データ最小化を優先した意図的な制約であり、正式デザインで保存機能が必要になった場合は保存先、保持期間、閲覧境界を別Issueで再評価する。
- page sizeはWebから20件に固定する。前pageへ戻る独立navigationは持たず、現在の画面では追加読込した結果を同一listへ蓄積する。
- Rust API、OpenAPI、Supabase schema、seed、remote環境は変更しない。shared deploymentのnetwork、secret、rate limit、business timezoneは引き続き未決定である。

## Verification and recovery

- parser、browser response検証、状態遷移、component、Route Handlerのtestでexact shape、上限、same-origin、相対URL検証、不要ID除去、status mapping、append失敗時の結果保持を確認する。
- `mise run smoke:web:member`で合成Auth userから検索、並び替え、不正入力、cross-origin拒否、認可済み詳細link、認可外memberとIDの非露出までをlocal-onlyで確認する。
- 実ブラウザでloading / upstream error / retry、検索、並び替え、入力error、Enter / Tab / Shift+Tab / Space、更新後focus、360pxの横scrollなしを確認する。
- 問題がある場合は`/members/search`、browser client、Client Component、関連styleとtestを同じchangeとしてrevertし、Issue #39のserver-side初期一覧へ戻す。schema、seed、remote data、remote secretのrollbackは発生しない。

## References

- ADR 0010: member searchのliteral検索と署名付きcursor pagination
- ADR 0011: Next.js server boundaryのSupabase Auth session
- ADR 0012: Next.js server boundaryからmember APIへの接続

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
