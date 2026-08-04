# よくある質問

### なぜこのリポジトリにはコードがないのですか？

開発は業務データを扱うprivateリポジトリで行っています。このリポジトリは、参加を検討している方とワークショップ参加者のための入口です。プロジェクト内容を事前に判断できるよう、コードを含まない設計判断・進め方だけを公開しています。詳しくは [project-overview.md](project-overview.md) を参照してください。

### privateリポジトリのforkではないのですか？

違います。GitHubの仕様上、privateリポジトリのforkはvisibilityをpublicへ変更できません。また同一のrepository network内のコミットは相互に到達可能になるため、privateとネットワークを共有しない**独立した新規リポジトリ**として作成しています。

### 技術スタックは何ですか？

Next.js（Vercel）、Rust API（Render）、Supabase（PostgreSQL / Auth / Storage）です。詳しくは [architecture.md](architecture.md) を参照してください。

### どうすれば参加できますか？

Discussionsの「参加申込」カテゴリへ投稿してください。段階的にアクセスをお渡しする方針です。詳しくは [how-to-join.md](how-to-join.md) を参照してください。

### 社内メンバーでなくても参加できますか？

はい。社内メンバー、有志、自己学習目的の方、いずれも歓迎します。区別はしません。

### すぐにprivateリポジトリへ招待してもらえますか？

すぐにはお約束できません。業務データを扱うリポジトリである以上、招待には選別を伴います。ワークショップ参加や、Discussionsでのやり取りを通じて実績を確認したうえで招待する、段階的な運用にしています。

### ADRを全部公開しているのはなぜですか？

技術的な議論の質を最も直接的に示す資料だと考えているためです。抜粋にすると「都合の良いものだけ見せている」という印象になり、ADR同士の相互参照も切れてしまいます。詳しくは [development-approach.md](development-approach.md) を参照してください。

### このリポジトリの文書は再利用できますか？

はい。[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供しています。帰属表示があれば、コピーや共有、改変が可能です。

### ワークショップはどんな内容ですか？

実際のIssueに着手し、Pull Requestを1本出すところまでを体験する内容です。詳しくは [workshop/README.md](workshop/README.md) を参照してください。

### 質問はどこにすればよいですか？

Discussionsの「質問」カテゴリへ投稿してください。

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
