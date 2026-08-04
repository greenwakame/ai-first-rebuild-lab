# ADR 0018: プロフィール写真の書き込みをdurable operationで管理する

- Status: Accepted
- Date: 2026-07-30
- Tracking: GitHub Issue #57
- Extends: ADR 0017

## Context

プロフィール写真の更新は、PostgreSQLのmetadata更新とSupabase Storageのobject操作を
単一transactionにできない。Storageを先に置くと失敗時にorphan objectが残り、metadataを
先に公開すると派生画像が揃わない状態を読者へ見せる。削除でも、Storageの完了を待ってから
metadataを消す順序では、失敗中も古い写真を参照できる。

写真は個人データであり、browserからの直接uploadやsigned URLはcredential、locator、
失効制御の境界を広げる。また、画像decoderは圧縮率の高い入力や大きなdimensionによりCPUと
memoryを消費するため、認可、入力上限、並行数を画像処理より前に制限する必要がある。

## Decision

- browserは認証cookieを使うNext.js同一origin routeだけへ送信する。Next.jsはorigin、body
  size、field、宣言MIMEを検査し、session tokenをserver側で取得してRustへ転送する。
- RustはJWT、active account、member core、独立した写真update rule、未完了operation、楽観的
  versionを画像処理前に確認する。画像処理は同時2件までに制限したblocking taskで行う。
- 入力はJPEG / PNG、10 MiB以下とし、magicと宣言MIMEの一致、非animated PNG、orientation
  適用後の両辺512〜8192pxかつ24MP以下を必須にする。alphaは白へ合成し、metadataを引き継がず
  JPEGへ再エンコードする。`original`は長辺4096px以内、`detail`は中央512px、`list`は中央
  128pxの1:1派生とする。
- Rustだけがserver用Supabase secret keyを使う。keyはbrowser、Data API、response、log、
  error、tracked envへ渡さない。local wrapperはCLI出力をprocess内で検査し、子processへだけ
  渡して直ちにunsetする。shared / productionへの配布はこのIssueでは行わない。
- upload / replaceはdatabaseでoperationとrandom version namespaceをprepareし、3 objectを
  `x-upsert: false`で登録し、全件成功後に1 transactionで新metadataをactivateする。置換前の
  objectはactivate後のcleanup対象とする。
- deleteは楽観的version一致を確認し、1 transactionでactive metadataを先に失効してから、
  原本と全派生をStorage APIで削除する。Storage SQL tableの直接DELETEは行わない。
- 途中失敗はtargetごとに最大1件のdurable operationとそのobject集合へ残す。未完了operation中は
  新規writeを拒否し、operationを開始したactorまたは現在更新権限を持つactorだけがcleanupを
  再実行できる。cleaned objectだけを記録して冪等に再開する。
- write runtime roleはtable権限を持たず、review済みprepare / activate / revoke / cleanup関数だけを
  transaction内で実行する。write auditはactor、target、action、outcome、時刻だけとし、version、
  object key、画像情報は保持しない。

## Consequences

- DBとStorageの完全な原子性は得られないが、読者に不完全な新versionを公開せず、削除要求後の
  新規参照を先に閉じ、残作業を追跡・再実行できる。
- 同じtargetへの書き込みは直列化される。version不一致は409、未完了cleanupは専用409として
  browserへ返し、上書きと暗黙のobject放置を防ぐ。
- normalized `original`も配信用ではない。read resolver、Storage RLS、OpenAPIは引き続き
  `list` / `detail`だけを許可する。
- client側cropは採用しないため、利用者はserverの中央cropを確認して必要なら別画像を選ぶ。
- server secretはStorage全権限のtrust boundaryである。shared適用前に保管、rotation、incident、
  最小権限化の手順をPlatform / Securityが承認する必要がある。

## Compatibility, validation, and recovery

- 既存read endpointは維持する。member detail responseへnullableな`photo_edit`を追加し、Next.jsと
  生成clientを同じ変更で更新する。strictな外部clientはshared公開前に再生成が必要である。
- localではpgTAP、Rust unit / repository、OpenAPI、Next route / parser、および実Storageを使う
  合成PNGのupload、read、stale version競合、delete、DB / Storage残存ゼロを確認する。
- upload失敗は登録済みobjectをoperationに残してcleanupする。activate失敗も同じversionの全objectを
  cleanupする。置換後またはdelete後のcleanup失敗では、新metadata状態を巻き戻さず再実行する。
- shared migrationは巻き戻さずforward migrationで修正する。緊急時はmutation routeを閉じ、readを
  placeholderへ畳み、値を表示しない件数照合後に承認済みcleanupを行う。

## References

- [Supabase: API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase: Standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads)
- [Supabase: Delete objects](https://supabase.com/docs/guides/storage/management/delete-objects)
- [image crate](https://docs.rs/image/latest/image/)
- ADR 0017: private写真read境界
- `docs/features/member-profile-photo.md`

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
