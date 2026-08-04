# ADR 0004: default-denyのメンバー読取認可

- Status: Accepted
- Date: 2026-07-25
- Tracking: GitHub Issue #15
- Amended: 2026-08-02 (GitHub Issue #91)

## Context

認証済みメンバー一覧では、actorが読めるtarget memberをpaginationと件数計算より前にdatabaseで絞り込む必要がある。旧実装にはuser単位とrole単位の規則、退社日による除外がある一方、rule不在、複数role、NULL、退社当日の正式な業務規則は未確認である。

最初の実装はlocal Supabaseと合成データだけを使う。実ユーザー、認証credential、旧DB dump、remote Supabaseは対象外とし、未確認のlegacy挙動を安全側へ固定する。

## Decision

- business dataはADR 0001の `private` schemaへ置く。
- `private.members` と、Auth subjectをmemberへ対応付ける `private.user_accounts` を分離する。
- `auth_user_id` はcredentialを含まないopaque UUIDとして保持する。Auth accountの作成・削除・cascade方針が未決定のため、現時点では `auth.users` へのforeign keyを張らない。
- account statusは `active` / `inactive` のみとし、安全な初期値を `inactive` にする。
- role割当、role単位rule、user単位overrideをforeign key付きtableで保持する。
- `private.can_read_member(actor_member_id, target_member_id, effective_on)` が1 targetに対する判定を返す。
- 判定順序を次で固定する。
  1. NULL、unknown actor、active account mappingなし、過去退社actor、unknown target、過去退社targetはdeny。
  2. 明示user denyはdeny。
  3. 明示user allowはallow。
  4. actorに割り当てられたroleのうち1件以上がallowならallow。
  5. 上記以外はdefault deny。
- role ruleの `can_read = false` は単独ではuser allowを上書きしない。これはlegacy sourceで確認した優先関係を合成fixtureで固定したものであり、production cutover前に匿名化matrixと業務ownerの承認が必要である。
- 退社日は `departed_on < effective_on` のとき過去扱いにする。退社当日は在籍扱いになるが、timezoneを含む正式な業務規則は未決定である。
- `effective_on` はcallerが明示し、function内でserver current dateへ依存しない。
- functionは `SECURITY INVOKER` とし、固定した `search_path` を持つ。`public`、`anon`、`authenticated`、`service_role` へtable privilege、schema usage、function executeを付与しない。
- Rust用database principalと最小grantは、接続方式とsecret管理を決める後続Issueで追加する。通常read経路へSupabase `service_role` keyを使わない。

## Consequences

- rule欠損や未対応actorはデータを見られず、認可拡大より利用制限を優先する。
- 認可filterをrepository queryへ組み込むためのdatabase contractができる。
- Auth lifecycleとの参照整合性はapplicationと運用で管理する期間が生じる。Auth連携を実装するときに、削除順序、退職者保持、復旧を決めてforward migrationでforeign keyの要否を再評価する。
- 現在のtableは新規かつconsumerがなく、migrationは既存read pathをlockまたは変更しない。作成中の新規objectだけが対象である。
- 氏名を持つ構造を導入するため、seed、test、CIには明示的な合成値以外を入れない。

## Migration and repeat behavior

`20260725032511_member_authorization_foundation.sql` はtransaction内で新規table、constraint、index、function、revokeを追加するone-time migrationである。同じdatabaseへSQL fileを手動で再実行する用途にはせず、Supabase migration historyで一度だけ適用する。

clean local databaseでは全migrationを先頭からreplayできる。`supabase/seed.sql` は固定UUIDと `ON CONFLICT` を使い、同じfixtureを複数回適用してもmember、role、rule件数が増えない。seedの削除済みfixtureを自動削除する処理は持たないため、fixture集合を縮小した場合はlocal databaseをresetする。

## Validation and reconciliation

信頼できるnetwork上でDocker Desktopを起動し、次を実行する。

```bash
mise run supabase:start
mise run check:db
mise run supabase:migrations
mise run supabase:stop
```

`check:db` はclean reset、seed、pgTAP、schema lintを実行する。pgTAPは次を確認する。

- 7 tableと認可functionの存在。
- Data API roleにtable / function privilegeがないこと。
- role allow、複数role、user allow、user deny、ruleなし、inactive / unknown / 退社actor、unknown / 退社target、退社日境界。
- 合成member 9件、role 2件と、mapping / ruleのorphan 0件（Issue #15時点の初期値。Issue #91時点の正確な件数は下記Amendmentとpgtap assertionを参照）。
- functionが `SECURITY INVOKER` のままであること。

**Amendment（Issue #91、2026-08-02）**: role allow / user allow / user deny / ruleなし / 退社者 / inactive actorという本ADRの判定順序・境界fixture構成は変更していない。日本語の氏名・氏名カナで一覧のpagination（20件+「さらに表示」）を画面確認できるよう、`supabase/seed.sql`の標準レビューactorから見える現役memberを25件以上へ拡張し、`private.members`総数、role rule件数を増やした。認可境界fixtureとデザイン確認用fixtureの正確な件数は`supabase/tests/member_authorization_test.sql`のpgTAP assertionを正とし、本ADR本文の「9件」は初期値として残す。

共有環境へ適用する前には、個人値を出力せず次のaggregateを記録する。

- migration historyのlocal / target一致。
- source / targetのmember総数、在籍 / 退社件数、日付不正件数。
- account mapping、role割当、role rule、user overrideのorphan件数。
- actor別認可結果の不一致actor数と不一致row数。

不一致のmember ID集合や氏名、mail、Auth subjectをlog、CI artifact、Issue、PRへ出力しない。

## Recovery

この決定時点ではremote migrationを適用しない。localで問題があればstackを停止し、local databaseをresetして修正後のmigration chainをreplayする。

将来shared remoteへ適用した後は、このmigration fileの書換えやtable dropによるrollbackを行わない。新しいforward migrationでpolicy、constraint、grantを修正し、認可不一致が解消するまでmember routeを公開しない。旧システムのread pathはshadow verificationと業務承認が完了するまで残す。

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
