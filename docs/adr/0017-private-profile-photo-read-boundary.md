# ADR 0017: プロフィール写真をRust proxyとprivate Storageで配信する

- Status: Accepted（書き込み境界はADR 0018で拡張）
- Date: 2026-07-29
- Tracking: GitHub Issue #53

## Context

社員写真は相互理解の補助として必要だが、本人確認の証拠ではなく、member coreや
自己紹介とは別の個人データである。旧システムは原本と複数種類の派生画像をサーバーのファイルシステム上に保持し、専用権限で参照していた。一方、削除endpoint、退職時の画像削除、
強固な実体検査は確認できなかった。

新版ではprivate Supabase Storageを利用する。browserへsigned URLを返す案は、URLの
有効期間中に再認可できず、token expiryとCDN/browser cacheの寿命が一致しない。
Smart CDNとImage TransformationsはSupabase Pro機能であり、無料運用の必須条件にも
できない。ownerは写真を任意とし、shared環境への初回upload前に明示同意を得ること、
退職・写真削除では参照を即時に止めて原本と派生を削除すること、本人以外の更新は
明示された管理者だけにして監査すること、原本を配信せず派生と一緒に削除することを
承認した。

## Decision

- bucket `member-profile-photos` はprivateとし、JPEG / PNG、最大10 MiBだけを受ける。
  upload時の実体、dimension、metadata、派生生成はADR 0018のserver側検査でさらに狭くする。
- 同意時刻とopaqueな写真versionを`private.member_profile_photos`へ、`list`、`detail`、
  `original`のserver-only locatorと検査済みcontent metadataを別tableへ保持する。
  object keyはresponse、signed URL、log、analytics、auditへ含めない。
- 読み取りは`POST /v1/member-photo`へmember IDと`list` / `detail`だけをbodyで渡す。
  RustはJWTを検証し、監査付きdatabase resolverで独立認可した後、同じ利用者JWTを
  Supabase Storageへ転送する。Storage RLSでも同じ写真認可を再評価する。
- Rustはredirectを拒否し、5秒でtimeoutする。Storage応答のstatus、MIME、宣言size、
  実byte数、variant別上限を検査してからbinary responseを返す。`original`はresolver、
  RLS、API contractのすべてで拒否する。
- Next.jsは認証cookieを使う同一origin route
  `/members/{memberId}/photo?variant=list|detail`だけをbrowserへ公開する。RustとNextの
  responseは`private, no-store`、credentialに対応する`Vary`、`nosniff`を付ける。
- 写真未登録、写真read拒否、Storage object欠落は画面上で同じinitial placeholderに
  畳み込む。APIは対象不存在、metadata不存在、認可拒否、Storageの404 / RLS拒否を
  同じ404へ畳み込み、objectの有無を示すflagを返さない。
- 写真readはmember core readを前提にするが、自己紹介権限を継承しない。user deny、
  user allow、本人、role allow、default denyの順で評価する。写真は記録された退職日の
  開始時点から拒否する。
- database監査はactive actor、要求target、`list` / `detail`、`resolved` /
  `unavailable`、時刻だけを持つ。locator、URL、credential、画像、氏名は持たない。
- 削除は、最初に写真metadataを無効化または削除してRLSとresolverを閉じ、
  次に原本と全派生objectを削除する。この順序によりblob削除やcache invalidationの
  完了待ちでも新しい参照を許可しない。

## Consequences

- 各画像requestはRust、database resolver、Storage RLSを通るためsigned URLより負荷は
  増えるが、requestごとに最新の退職・削除・権限状態を確認できる。
- `no-store`なのでbrowser / CDNの再利用はせず、削除後の新規requestは即時に拒否する。
  すでに受信済みまたは通信中のbyteを回収することはできない。この限界を「即時失効」
  の境界とする。
- 画像変換はruntime配信時に行わず、ADR 0018で無料枠でも利用できる事前生成派生へ
  固定する。Supabase Pro機能へのupgradeは不要である。
- RLS helperはPostgRESTの公開schema外へ置き、authenticatedはhelperのUSAGE / EXECUTE
  だけを持つ。private photo tableとaudit tableの直接権限は持たない。
- read audit自体も個人データである。shared環境の保持期間、閲覧者、削除手順は適用前の
  human checkpointとして残る。

## Compatibility, validation, and recovery

- read sliceでは新規endpointと同一origin routeだけを追加した。Issue #57ではmember detail
  responseへnullableな`photo_edit`を追加し、生成clientとNext.jsを同時に更新する。
  写真取得が失敗しても一覧と詳細はplaceholderで利用できる。
- localではmigration replay、bucket設定、table/function権限、role owner、独立認可、
  resolver監査、Storage RLS、original拒否、Rust repository / HTTP、Next parser / route /
  placeholder、combined smokeを合成dataだけで検証する。
- shared適用前の回復は`mise run supabase:reset`とする。適用後の問題では既存migrationや
  objectを手作業で巻き戻さず、まずphoto endpoint / routeを無効化してplaceholderへ閉じ、
  forward migrationでpolicy、grant、metadataを是正する。
- bucketを削除するrollbackは行わない。orphan objectが疑われる場合は新しい参照を閉じた
  状態で、値を出さない件数照合と承認済みcleanup jobを使う。

## References

- [Supabase: Serving assets from Storage](https://supabase.com/docs/guides/storage/serving/downloads)
- [Supabase: Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn)
- [Supabase: Image Transformations](https://supabase.com/docs/guides/storage/serving/image-transformations)
- ADR 0004: default denyのメンバー読取policy
- ADR 0015: 自己紹介参照をmember coreから分離する
- ADR 0018: profile写真write lifecycle
- `docs/features/member-profile-photo.md`

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
