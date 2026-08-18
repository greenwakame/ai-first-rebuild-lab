<p align="right"><sub><a href="../../README.md">← README へ戻る</a></sub></p>

# 設計判断の記録（ADR）

元に戻しにくい判断は、すべて **ADR（Architecture Decision Record）** として記録しています。「なぜその設計にしたか」を後から追えるようにすることが目的です。

各ADRは **コンテキスト（何が問題か）→ 決定（何を選んだか）→ 帰結** の構成で書かれています。判断が後から改訂された場合は、元のADRに改訂履歴を追記し、新しいADRとの相互参照を残しています。

> [!NOTE]
> このページは日本語の索引です。ファイル名は英語のため、内容が推測しにくいことを補うために用意しています。**ADR本体の内容は変更していません。**

## どれから読むか

すべてを順に読む必要はありません。技術的な議論の質が伝わりやすいものを挙げます。

| ADR | なぜ読む価値があるか |
| --- | --- |
| [0004 default-denyのメンバー読取認可](0004-default-deny-member-read-policy.md) | このプロジェクトの認可モデルの中核。判定順序を明示し、**ルール不在なら見せない**という安全側の設計に倒している |
| [0010 literal検索と署名付きcursor pagination](0010-member-search-query-sort-pagination.md) | 旧システムのクライアント側正規表現による全件検索を、**認可前の件数を漏らさない**サーバー側の有界な検索へ置き換えた判断 |
| [0017 プロフィール写真の配信境界](0017-private-profile-photo-read-boundary.md) | signed URLを採らずRust proxyを選んだ理由と、**「即時失効」の限界を明示している**点 |
| [0019 cargo-denyの採用](0019-rust-dependency-supply-chain-review.md) | 技術選定の比較と、**不採用の理由を誤解なく書いている**例 |
| [0021 agentによる視覚検証基盤](0021-agent-visual-verification.md) | AI-first開発ならではの判断。成功条件を「CIが止めること」ではなく**「agentが自分の出力を見て直せること」**に置いている |
| [0023 要求IDのトレーサビリティとドリフト検出](0023-requirement-traceability-and-drift-detection.md) | 生成AIが仕様とコードの両方を書く前提で、**「AIが仕様のほうを書き換えて整合を取る」ことを機械的に禁じた**判断。却下した4案と、この仕組みで検出できないズレの類型まで記録している |

## データベースと認可

業務データをどこに置き、誰が何を読めるかを決めた判断です。

| ADR | 決めたこと |
| --- | --- |
| [0001 Private database boundary by default](0001-private-database-boundary.md) | 業務テーブルと補助関数を既定で `private` スキーマへ置き、Data APIのロールへ権限を渡さない |
| [0004 default-denyのメンバー読取認可](0004-default-deny-member-read-policy.md) | ユーザー単位・ロール単位のルールと退社日で判定し、**ルールがなければ拒否**する順序を固定する |
| [0005 database権限グループの分離](0005-rust-database-permission-group.md) | バージョン管理には `NOLOGIN` の権限グループだけを作り、パスワードを持つログインを混在させない |
| [0006 local database loginと認可済みrepository](0006-local-database-login-and-member-repository.md) | ローカル専用の一時ログインをプロセス単位で作成・削除し、リポジトリには**検証済みの認証主体を必須入力**にする |
| [0014 メンバープロフィールの主所属を明示する](0014-member-profile-core-contract.md) | 所属情報が複数箇所に分散していた状態に対し、**明示的な主所属フラグ**を1件だけ持てる制約で決定的にする |
| [0015 自己紹介の参照を分離する](0015-independent-member-introduction-read.md) | メンバー基本情報の参照権限を自己紹介へ継承させず、**専用の認可ルール**を持たせる |
| [0016 自己紹介の更新を専用関数へ閉じ込める](0016-member-introduction-update-boundary.md) | 認可・検証・競合判定・監査を1つのデータベーストランザクションから外さない |
| [0017 プロフィール写真の配信境界](0017-private-profile-photo-read-boundary.md) | private Storage と Rust proxy を経由させ、**リクエストごとに最新の権限状態を確認**する |
| [0018 プロフィール写真の書き込み管理](0018-private-profile-photo-write-lifecycle.md) | メタデータとオブジェクトを単一トランザクションにできない前提で、順序と復旧を設計する |

## 認証

利用者が誰であるかを、どこでどう検証するかの判断です。

| ADR | 決めたこと |
| --- | --- |
| [0007 JWT検証とRustの認証境界](0007-supabase-jwt-verification-boundary.md) | issuerとaudienceを**信頼済みのサーバー設定から**受け取り、トークン内の値で接続先を選ばない |
| [0009 ローカル認証とAPI runtime](0009-local-auth-and-member-api-runtime.md) | ローカルの署名鍵をワークツリーごとに生成し、**追跡ファイル・コマンド引数・ログへ出さない** |
| [0011 Next.jsのサーバー境界とセッション](0011-nextjs-server-auth-session.md) | トークンをブラウザのストレージへ置かず、サーバー境界でのみ扱う |

## APIと契約

サービス間の境界をどう定義し、どう検証するかの判断です。

| ADR | 決めたこと |
| --- | --- |
| [0002 OpenAPI契約先行とクライアント生成](0002-contract-first-openapi-client.md) | OpenAPIドキュメントをHTTP API契約の正とし、**TypeScriptクライアントを自動生成**する |
| [0003 request ID付きのaccess log](0003-privacy-safe-access-logs.md) | 記録してよい項目を**許可リストで固定**し、トークン・クエリ・本文・氏名を残さない |
| [0008 認証済みmember searchのHTTP境界](0008-member-search-http-boundary.md) | Authorizationヘッダーの解釈を厳密にし、内部理由を反射しないエラー応答へ閉じる |
| [0010 literal検索と署名付きcursor pagination](0010-member-search-query-sort-pagination.md) | 入力に上限を設け、**認可前の件数を表さない**署名付きカーソルでページを刻む |

## Web（Next.js）

ブラウザとサーバー境界の間で、何を渡し何を渡さないかの判断です。

| ADR | 決めたこと |
| --- | --- |
| [0012 サーバー境界からmember APIへの接続](0012-nextjs-member-api-boundary.md) | 認証確認をローディング表示より前に行い、**未認証のリクエストをHTTPリダイレクトで閉じる** |
| [0013 メンバー一覧の検索・並び替え・ページ操作](0013-nextjs-member-directory-controls.md) | 検索語をURL・履歴・ストレージへ残さず、**同一オリジンのサーバー経由**でのみ問い合わせる |

## フロントエンド基盤

見た目と品質を、人の注意力ではなく仕組みで支えるための判断です。

| ADR | 決めたこと |
| --- | --- |
| [0020 CSS基盤とdesign tokenの機械的強制](0020-frontend-css-foundation.md) | デザイントークンからの逸脱を**CIで検出できる状態**にする |
| [0021 agentによる視覚とaccessibilityの自己検証](0021-agent-visual-verification.md) | AIエージェントが**自分の書いたUIを見て直せる**ようにする。人のレビュー待ちにしない |

## 要求と検証の接続

仕様・コード・テストのズレを、人の注意力ではなく終了コードで検出するための判断です。

| ADR | 決めたこと |
| --- | --- |
| [0023 要求IDのトレーサビリティとドリフト検出](0023-requirement-traceability-and-drift-detection.md) | 受け入れ条件に要求IDを与えてコードとテストへ貫通させ、**ズレを検出したらエージェントは整合を取らずに停止する**。既存コードからの要求の逆生成も禁じる |

## 運用と供給網

依存関係やツールを、実行可能な攻撃面として扱うための判断です。

| ADR | 決めたこと |
| --- | --- |
| [0019 cargo-denyの採用](0019-rust-dependency-supply-chain-review.md) | 脆弱性・ライセンス・禁止クレート・取得元を**1つのツールと1つの設定**で検証する |

## 補足

- **0001 と 0014 は表題が英語です。** 初期に作成されたもので、以降は日本語で統一しています。内容の質に差はありません。
- **0022 は同期していません。** shared stagingの信頼境界を扱ったADRで、環境変数名など運用固有の識別子を多数含むため、公開用の書き換え方針を別途決める必要があるためです。0023 の本文からは参照されています。**番号の欠落は、削除や失敗の記録ではありません。**
- ADRは開発リポジトリの `docs/adr/` を正として、このリポジトリへ手動で同期しています。**自動ミラーにしない**のは、公開前に人の目が入ること自体を安全装置と位置づけているためです。

## 次に読む

| 文書 | 内容 |
| --- | --- |
| [development-approach.md](../development-approach.md) | ADR駆動を含む開発の進め方 |
| [architecture.md](../architecture.md) | 技術構成とサービス境界 |
| [project-overview.md](../project-overview.md) | プロジェクト概要 |

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
