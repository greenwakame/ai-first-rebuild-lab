# ADR 0014: Explicit primary assignment for member profile core

- Status: Accepted for local synthetic implementation
- Date: 2026-07-28
- Related: Issue #51、Issue #45、ADR 0004、ADR 0008

## Context

一覧とプロフィール詳細には所属・役職が必要だが、旧システムでは所属情報が複数の場所に分散して保持されており、一覧表示用の所属と役職とで参照元が異なる。役職の取得も順序が保証されないデータから行われており、複数所属がある場合に再現可能なauthoritative sourceになっていない。既存targetはmember coreとdefault-deny
read policyまでを持ち、組織・役職・詳細endpointはまだ持たない。

## Decision

- targetはorganization、position、member-organization assignmentをprivate tableとして
  追加する。
- assignmentへ `is_primary` を持たせ、partial unique indexでmemberあたり最大1件にする。
- 一覧と詳細は主所属relationだけを同一のsourceとして読む。row orderから推測しない。
- 主所属未設定とposition未設定を許容し、nullable responseにする。
- 既存member read capabilityを基本情報全体へ適用し、fieldごとの独立認可は写真・
  自己紹介など後続の別capabilityに限定する。
- 詳細readは `POST /v1/member-profile` とし、対象UUIDをbodyで受ける。対象未存在と
  unauthorizedは同じ404 responseにする。
- legacy integer keyはmigration照合専用でAPIへ公開しない。

## Consequences

- 一覧と詳細の所属・役職が決定的になり、authorization済みqueryでまとめて取得できる。
- 旧版の順序依存表示と完全には一致しない可能性があるため、real import前に不一致件数と
  業務owner判断が必要になる。
- memberに主所属が必須というconstraintはまだ置けない。欠損を安全に表示できる一方、
  production data quality ruleは後続判断となる。
- bodyに置いたtarget UUIDはrequest pathの通常access logに残らない。ただしNext.jsの
  direct profile URLではopaque member UUIDを使うため、Web側でもquery、analytics、
  external referrerへ流さない設計を継続する。
- Issue #55のWeb routeはcanonicalな `/members/{UUID}` だけを受け、認証をSuspenseより
  前に確認する。URL不正、対象未存在、対象への権限なしは同じ200の安全な表示へ畳み、
  APIの404理由やresponse bodyを反射しない。200 responseのmember UUIDがrequest対象と
  一致しない場合もservice unavailableへ閉じる。
- 一覧からbrowserへ渡す対象UUIDは、認可済みrowから作ったquery / fragmentなしの
  `profileHref`だけとする。詳細render前にmember / organization / position UUIDを除去し、
  routeには`Referrer-Policy: same-origin`とprivate no-storeを適用する。詳細linkの自動
  prefetchは無効にし、利用者が遷移する前に個人プロフィールを取得しない。

## Alternatives considered

- 旧システムの所属フィールドをtargetへそのまま残す: 旧システムの正規化意図と矛盾し、二重管理を
  固定するため不採用。
- assignmentの先頭rowを主所属とする: query planやinsert順で表示が変わるため不採用。
- memberへpositionを直接持たせる: 旧システムではpositionが所属関係に紐づく属性であり、
  複数所属との対応を失うため不採用。
- 詳細を `GET /v1/members/{id}` にする: matched routeなら生IDをlogしない実装も可能だが、
  proxyや周辺access logのURL露出を避けるため初期contractではPOSTを採用する。

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
