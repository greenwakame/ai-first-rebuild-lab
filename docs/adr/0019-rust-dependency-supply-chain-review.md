# ADR 0019: Rust依存関係のsupply-chain評価にcargo-denyを採用する

- Status: Accepted
- Date: 2026-08-01

## Context

Rust APIは`Cargo.toml`でversionを厳密に固定し、`cargo fetch --locked` / `--locked` buildを使っているが、RustSec advisory、license、禁止・重複crate、取得元sourceを確認する専用手段がなかった（Issue #67）。AGENTS.mdはskills、hooks、MCP server、CI workflow、dependency scriptを実行可能なsupply-chain surfaceとして扱い、有効化前のレビューを求めている。

候補は次の2つだった。

- **cargo-audit**（RustSec公式、`rustsec/rustsec`リポジトリ配下）: RustSec Advisory Databaseに対する既知脆弱性チェックに特化する。
- **cargo-deny**（EmbarkStudios、Apache-2.0 / MIT dual license、MSRV 1.88.0、2026-07時点で活発に保守）: advisories・licenses・bans（禁止/重複crate）・sourcesの4カテゴリを1つのtoolと1つの設定ファイルで検証する。advisoriesチェックはcargo-auditと同じRustSec Advisory Databaseを参照する（`https://github.com/RustSec/advisory-db`）。

## Decision

- **cargo-denyを採用**し、advisories・licenses・bans・sourcesの4チェックすべてに用いる。
- **cargo-auditは不採用**とする。cargo-denyのadvisoriesチェックが同じ advisory-db を参照しており、機能的に完全な部分集合になるため、2つ目のtoolを維持するコストに見合う追加の検出能力がない。保守状況やlicenseを理由に不採用にしたのではない（`rustsec/rustsec`は2026-07-31時点でも活発に更新されている）。
- versionは`.mise.toml`の`[tools]`に`"aqua:EmbarkStudios/cargo-deny" = "0.20.2"`として固定し、mise管理のバイナリ配布（GitHub Releaseのchecksum検証込み）だけを使う。globalな未固定`cargo install`は行わない。
- 実行は`mise run rust:deps:audit`（`cargo deny check`）だけとし、`.github/workflows/ci.yml`および`mise run check`には追加しない。開発者が明示実行するlocal-onlyな評価手段に限定する。
- 設定は repository root の`deny.toml`に置く。
  - `licenses.allow`には現在のCargo.lockで検出された実際のpermissive license（0BSD、Apache-2.0、BSD-1/2/3-Clause、BSL-1.0、CC0-1.0、CDLA-Permissive-2.0、ISC、MIT、MIT-0、Unicode-3.0、Unlicense、Zlib）だけを列挙する。
  - `licenses.private.ignore = true`とし、未公開の内部crateである`works-api`にlicense fieldを要求しない。
  - `bans.multiple-versions = "warn"`（テンプレート既定のまま）とし、重複crateはCI・checkを止めず可視化に留める。
  - `advisories.ignore`に、期限・owner・理由付きの例外だけを列挙する（現在は`RUSTSEC-2023-0071`のみ。後述）。

## Consequences

- Rust依存の既知脆弱性・license・禁止/重複crate・取得元sourceを、開発者が任意のタイミングで`mise run rust:deps:audit`により確認できる。
- 通常のCI実行時間やGitHub Actions利用量は変化しない。
- `licenses.allow`は新しいpermissive licenseの依存が増えるたびに更新が必要になる。`cargo deny check licenses`が`rejected`を返した場合、まず実際のlicense文字列を確認してから許可を追加する。
- `advisories.ignore`の例外はowner・理由・再確認のきっかけを`deny.toml`のコメントに明記する運用とする。無期限・理由なしの例外は追加しない。
- 初回実行で`RUSTSEC-2023-0071`（`rsa` crateのMarvin Attackタイミングサイドチャネル、`jsonwebtoken`のrust_crypto featureから到達）を検出した。上流に安全な更新がなく、application dependencyの変更はIssue #67の対象外のため、owner（greenwakame）・理由・再確認時期を明記した上で`advisories.ignore`に一時登録した。RSA鍵の運用方式見直しやjsonwebtoken/rsa crateの更新は別Issueで評価する。

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
