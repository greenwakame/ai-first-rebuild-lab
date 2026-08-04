# ADR 0011: Next.js server boundaryのSupabase Auth session

- Status: Accepted
- Date: 2026-07-26
- Tracking: GitHub Issue #37
- Amended: 2026-07-26 (GitHub Issue #43)

## Context

Issue #25までにlocal Supabase Auth tokenをRust APIで検証する経路を、Issue #27までに認可済みmember searchを実装した。一方、Webはhealth確認用の最小画面だけで、login、session cookie、保護page、logoutを持たなかった。

legacy Webは独自tokenを`sessionStorage`へ保存していた。この方式を踏襲するとJavaScriptからtokenを読める状態が続き、Next.js server boundaryからRust APIへ必要なtokenだけを渡すtarget architectureにも合わない。Supabaseの現行SSR guidanceに沿いつつ、cookie、cache、CSRF、redirect、公開環境変数の境界を先に固定する必要がある。

## Decision

### Clientとsession検証

- `@supabase/ssr`と`@supabase/supabase-js`をexact versionで固定し、Supabase clientはmodule singletonにせずrequestごとに作る。
- URLとpublishable keyだけを公開設定として受け入れる。remote URLはHTTPS、HTTPはloopbackだけに限定し、URL credential、query、fragment、subpath、secret key、`service_role` legacy JWTを拒否する。
- Server Componentはcookie readだけ、Route HandlerとProxyは必要なcookie writeだけを行う。session保存は`tokens-only` encodingとする。
- 保護pageとlogin済み判定は`getClaims()`の成功と空でない`sub`を必須にし、error、例外、設定不備では未認証へ閉じる。`getSession()`の未検証値を認可判断に使わない。
- Proxyは`/login`と`/members`でtoken refreshを試みるが、最終的な保護判断はpageでも行う。browserからbusiness dataをSupabase Data APIへ直接取得しない。

### Cookie、mutation、redirect

- Auth cookieは`works-auth` prefix、`HttpOnly`、`SameSite=Lax`、`Path=/`、host-onlyとし、本番では`Secure`を必須にする。Supabaseが要求する削除用`Max-Age`などは維持する。
- loginとlogoutはPOST Route Handlerに限定する。`Origin`、`Sec-Fetch-Site`、browserが変更できない`Host`を照合し、remote originはHTTPS、local HTTPはloopbackだけを許可する。
- redirect先は検証済みOriginをbaseにした固定pathだけとする。利用者入力によるreturn URLやexternal URLは受け付けない。
- login bodyはURL-encoded 4 KiB以下、email 254文字以下、password 1024文字以下とする。credential不一致はaccount存在や内部理由を区別しない固定messageへ変換し、入力値を再表示しない。
- logoutはcurrent browser sessionだけを対象に`scope: local`で実行し、失敗時は認証済みpageへ戻して再試行可能にする。

### Cacheと表示範囲

- `/login`、`/members`、`/auth/*`はdynamicとし、`private, no-cache, no-store, must-revalidate, max-age=0`、`Expires: 0`、`Pragma: no-cache`を設定する。`Referrer-Policy: same-origin`、`X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`も付与する。`same-origin`はcross-originへのReferrerを送らず、同一originの基本form POSTではtuple originを維持するため、厳格なOrigin / Host照合と両立する。
- このIssueの`/members`はsession検証済み状態だけを表示し、mail、Auth UUID、access token、member dataを表示しない。member search API接続と各UI状態は後続Issueに分ける。
- `.env.example`にはplaceholderだけを置く。local service-role key、synthetic user credential、session cookieはfile、log、test output、Issue、PRへ出さない。

## Consequences

- browser JavaScriptからsession cookieを読めず、loginとlogoutを同一originのserver boundaryへ集約できる。
- Supabase Authはauthenticationとsession lifecycleだけを担い、Works authorizationは引き続きRustとprivate PostgreSQL境界で行う。
- password reset、return URL、OAuth、MFA、rate limit / abuse protectionは未実装であり、production login公開前に別Issueで判断する。
- `Host`をexternal hostとして保持しない独自reverse proxyを追加する場合は、信頼できるproxy headerとallowed originを別途設計する必要がある。

## Verification and recovery

- unit / component testで公開設定拒否、cookie属性、session fail-closed、Origin / Host照合、credential上限、generic error、formのaccessible labelとpending状態を確認する。
- local production build smoke testで、未認証redirect、cross-origin拒否、invalid login、valid login、2回の保護page表示、認証済みlogin pageのredirect、cookie属性、logout、logout後の拒否を確認する。random synthetic Auth userは終了時に削除し、credentialやresponse bodyを出力しない。
- 問題がある場合はlogin / members / auth Route Handler / ProxyとSSR dependencyを同じchangeとしてrevertする。database migration、remote Auth user、remote secretはないためdata rollbackは発生しない。

## References

- [Supabase: Creating a client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase: Advanced guide for server-side Auth](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
- [Next.js: Proxy](https://nextjs.org/docs/app/getting-started/proxy)
- ADR 0007: Supabase JWT検証とRust authentication境界
- ADR 0009: local Supabase Authとmember API runtime

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
