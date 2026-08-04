# ADR 0003: request ID付きprivacy-safe access log

- Status: Accepted
- Date: 2026-07-25

## Context

Rust API は JSON 形式のstartup logをstdoutへ出力するが、request単位の追跡情報がない。障害調査ではrequestの開始と完了を関連付ける必要がある一方、Worksは将来個人情報、認証情報、業務データを扱う。一般的なHTTP access logをそのまま有効にすると、query string、cookie、authorization header、body、内部errorが外部logging基盤へ送られる危険がある。

外部error trackingやlog serviceを選ぶ前に、applicationが生成してよいfieldを小さなallowlistとして固定する必要がある。

## Decision

- APIはrequestごとにUUID v4のrequest IDをserver側で生成する。
- callerが送信した `x-request-id` は採用せず、responseの `x-request-id` にはserver-generated IDだけを返す。
- request開始eventは `event`、`request_id`、`method`、`path` を記録する。
- request完了eventは同じfieldに `status_code` と `latency_ms` を加える。
- `path` はAxumが解決したroute patternだけを使う（例: `/healthz`）。未定義routeは `<unmatched>` とし、実際のURI path、path parameter、query string、fragmentを記録しない。
- request / response body、query、cookie、authorization header、任意header、client IP、user agent、個人情報、credentialをaccess logへ渡さない。
- logは `tracing` からJSON stdoutへ出力し、applicationから外部vendorへ直接送信しない。
- production相当環境の `RUST_LOG` はreview済みのtargetに限定する。現在のRender設定は `works_api=info` とする。
- 外部logging / error trackingを導入する場合は別Issueでdata processing、region、retention、access、redaction、費用、停止手順をレビューする。

## Consequences

- clientと運用者はresponse headerとJSON logをrequest IDで関連付けられる。
- 実際のURI path、path parameter、query、headerを使った検索はできないが、将来のsecret / PII漏えいリスクを小さくできる。
- server-generated IDだけを使うため、現時点ではupstream/downstreamを横断する分散trace IDにならない。
- processがresponseを生成できないpanicや強制終了では完了eventとresponse headerが残らない。panic captureやerror trackingは別のreview対象とする。
- field変更はobservability contractの変更として、testとこのADRを同じPRで更新する。

## Verification and recovery

- route testでhealthと404 responseのheader、ID形式、requestごとの一意性を確認する。
- captureしたJSON logでallowlist fieldと実際のURI path / query / authorization / bodyの非記録を確認する。
- 問題がある場合はmiddlewareとOpenAPI headerをrevertし、既存のdependency-free `/healthz` とstartup logへ戻す。

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
