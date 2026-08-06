# ADR 0002: OpenAPI契約先行とTypeScript client生成

- Status: Accepted
- Date: 2026-07-25

## Context

Rust API と Next.js の境界を人手で重複定義すると、path、request、response、error shapeの差異をレビューだけでは検出しにくい。今後は認証や個人データを扱うため、契約の正と生成経路を機械検証できる必要がある。

## Decision

- `openapi/works-api.yaml` の OpenAPI 3.1 documentをHTTP API契約の正とする。
- Redocly CLIのreviewed configurationで契約をlintする。
- `openapi-typescript` で `packages/api-client/src/generated/works-api.ts` を生成する。
- `openapi-fetch` を生成型へ結び付ける薄いruntime clientとして使う。
- 生成型はcompile-time guaranteeでありruntime validationではない。Rust handlerは入力検証と安定したresponse shapeに引き続き責任を持つ。
- 生成型はclean clone直後から利用できるようGit管理するが、直接編集しない。
- `mise run api:generate` を唯一の再生成コマンドとし、`mise run api:generate:check` とCIで契約との差分を検出する。
- handler実装は自動生成しない。Rustのroute testと契約レビューで一致を確認し、縦切りごとにcontract testを追加する。

## Consequences

- Web側はpathとpayloadをTypeScriptで検証できる。
- 契約変更時はOpenAPI、Rust実装、テスト、生成型を同じPRで更新する必要がある。
- 生成型のdiffはレビュー対象になるが、手編集された変更は再生成チェックで拒否される。
- OpenAPI外の応答や改ざんされた応答をruntimeで受理しない要件が生じた場合は、境界にruntime schema validationを追加する。
- 認証方式や非公開operationは契約に明示する必要がある。公開health endpointは `security: []` として例外を明示する。

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
