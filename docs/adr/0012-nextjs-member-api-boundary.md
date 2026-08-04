# ADR 0012: Next.js server boundaryからmember APIへの接続

- Status: Accepted
- Date: 2026-07-26
- Tracking: GitHub Issue #39
- Amended: 2026-07-28 (GitHub Issue #54)

## Context

Issue #27までに認可済みmember search APIとgenerated TypeScript clientを、Issue #37でSupabase Authのserver-side login、session cookie、保護page、logoutを実装した。一方、`/members`はsession検証済みplaceholderであり、Next.jsからRust APIへtokenを渡す境界、runtime response検証、利用者へ返す状態、RSC payloadへ含める個人データの範囲が未確定だった。

保護pageの認証をSuspense内だけで行うと、Next.jsがloading shellをHTTP 200でstreamした後にclient-side redirectする場合がある。未認証requestをHTTP redirectとして閉じ、tokenとmember UUIDをbrowserへ不要に渡さず、Rust APIの認可結果だけを表示する構成が必要である。

## Decision

### 認証とtoken伝播

- `/members` page本体はSuspense boundaryより前に`getClaims()`で空でない`sub`を確認し、失敗時は`/login`へredirectする。これにより未認証requestへloading shellを先に返さない。
- member取得側でも`getClaims()`を再確認した後にだけ`getSession()`からaccess tokenを取り出す。未検証sessionを認証判断へ使わず、tokenが空または16 KiB超ならRust APIを呼ばない。
- access tokenはNext.js serverからRust APIの`Authorization: Bearer` headerへだけ渡す。Client Component、HTML、RSC props、URL、error、logへ渡さない。
- browserからRust APIやSupabase business tableを直接呼ばせない。Next.jsはgenerated `@works/api-client`を使う薄いBFFとし、認証・認可の正はRust APIとPostgreSQLに残す。

### API設定とresponse境界

- server-onlyの`WORKS_API_BASE_URL`を必須とする。remoteはHTTPS、HTTPはloopbackだけを許可し、credential、path、query、fragmentを拒否する。設定値や内部例外は利用者向けmessageへ反射しない。
- 初期表示は`query = ""`、`sort = "name"`、`direction = "asc"`、`limit = 20`の固定POSTとする。検索、sort、cursor操作UIは後続Issueへ分ける。
- requestは`cache: "no-store"`、redirect拒否、5秒timeoutとする。responseは`Cache-Control: private, no-store`、`Vary: Authorization`、UUID形式の`x-request-id`を必須とし、欠落や不正値では503相当へ閉じる。
- generated clientの型だけを信頼せず、200 responseのexact key、最大20件、UUID、文字列長、nullable field、ISO date、cursor上限をruntimeでも検証する。bodyの内部detailは画面へ表示しない。
- 400、401、403、503を別の利用者状態へ対応付け、emptyとloadingも別表示にする。401はlogout後の再login、その他はretryを提示し、検証済みrequest IDだけを問い合わせIDとして表示できる。

### Browserへ渡すmember data

- Rust API responseの`member_id`はserver-side validationとpagination契約に保持する。Issue #55以降は、認可済み一覧行から同一originの詳細へ遷移するため、単独fieldではなく検証済み相対URL `/members/{member UUID}` の`profileHref`へだけ変換する。organization / position UUIDは引き続きview modelから除去する。
- 初期一覧が表示するfieldは`display_name`、`name_kana`、`joined_on`と、認可済みの主所属・役職の`display_name`だけとする。member、organization、positionのUUIDはview modelから除去する。mail、Auth subject、legacy ID、認可rule、image path、skill、自己紹介は取得・表示しない。
- Issue #54の写真、skill、自己紹介、詳細導線は後続contractが整うまでpresentation-onlyのplaceholderとし、実在するように見える値や壊れたURLを生成しない。
- loadingは認証確認後のmember取得だけをSuspenseでstreamする。route-level loading UIは未認証requestへ200 shellを返し得るため、この保護routeでは使わない。

## Consequences

- 未認証requestはserver redirectとなり、認証済みrequestだけがloadingまたはmember状態へ進む。
- member取得時に`getClaims()`が再実行されるが、stream開始前の認証保証とtoken取得直前のfail-closed確認を分離できる。
- 初期pageは認可済み20件までを表示できる一方、検索、並び替え、pagination操作はまだ利用できない。
- Vercel / Render間のnetwork、CORS、shared runtime secret、database identity、business timezoneは未決定であり、local-only Rust binaryをdeployしない。

## Verification and recovery

- unit / component testでAPI URL拒否、claims-before-session、token上限、request contract、responseとheaderのruntime validation、400 / 401 / 403 / 503、loading、empty、profile相対URL以外へのUUID非表示を確認する。
- `mise run smoke:web:member`はlocal Supabase、短時間database login、loopback Rust API、production buildのNext.jsを接続する。合成Auth userでloginし、認可済みmemberだけの表示と詳細導線、deny / ruleなし / 退社memberの非露出、session維持、logout、未認証再拒否を確認する。
- smoke testはtoken、password、service-role key、cookie、Auth UUID、member UUID、response bodyを出力せず、終了時にprocess、database login、actor mapping、合成Auth userを清掃する。通常CIには追加しない。
- 問題がある場合はNext.jsのmember API client、一覧UI、`WORKS_API_BASE_URL`とcombined smokeを同じchangeとしてrevertする。schema、remote data、remote secretのrollbackは発生しない。

## References

- ADR 0008: 認証済みmember searchのHTTP境界
- ADR 0009: local Supabase Authとmember API runtime
- ADR 0010: member searchのliteral検索と署名付きcursor pagination
- ADR 0011: Next.js server boundaryのSupabase Auth session

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
