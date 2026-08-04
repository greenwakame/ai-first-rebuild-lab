<p align="right"><sub><a href="../README.md">← README へ戻る</a></sub></p>

# よくある質問

## このリポジトリについて

<details>
<summary><b>なぜこのリポジトリにはコードがないのですか？</b></summary>

<br>

開発は別のprivateリポジトリで行っています。このリポジトリは、参加を検討している方とワークショップ参加者のための入口です。プロジェクト内容を事前に判断できるよう、コードを含まない設計判断・進め方だけを公開しています。詳しくは [project-overview.md](project-overview.md) を参照してください。

</details>

<details>
<summary><b>privateリポジトリのforkではないのですか？</b></summary>

<br>

違います。GitHubの仕様上、privateリポジトリのforkはvisibilityをpublicへ変更できません。また同一のrepository network内のコミットは相互に到達可能になるため、privateとネットワークを共有しない**独立した新規リポジトリ**として作成しています。

</details>

<details>
<summary><b>このリポジトリの文書は再利用できますか？</b></summary>

<br>

はい。[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供しています。帰属表示があれば、コピーや共有、改変が可能です。

</details>

## プロジェクトについて

<details>
<summary><b>技術スタックは何ですか？</b></summary>

<br>

Next.js（Vercel）、Rust API（Render）、Supabase（PostgreSQL / Auth / Storage）です。詳しくは [architecture.md](architecture.md) を参照してください。

</details>

<details>
<summary><b>実際の業務データや個人情報を扱いますか？</b></summary>

<br>

**扱いません。開発で使うのは合成データだけです。** メンバー名や写真なども、この用途のために作った架空のデータです。実在する人物の情報や、実際に運用されていたデータをローカル環境やCIへ持ち込まない方針を、プロジェクトの非交渉事項として定めています（[roadmap.md](roadmap.md) 参照）。

ワークショップで参加者が触れるのも合成データのみです。機密情報の取り扱いを心配する必要はありません。

</details>

<details>
<summary><b>ADRを全部公開しているのはなぜですか？</b></summary>

<br>

技術的な議論の質を最も直接的に示す資料だと考えているためです。抜粋にすると「都合の良いものだけ見せている」という印象になり、ADR同士の相互参照も切れてしまいます。詳しくは [development-approach.md](development-approach.md) を参照してください。

</details>

## 参加について

<details>
<summary><b>どうすれば参加できますか？</b></summary>

<br>

Discussionsの「参加申込」カテゴリへ投稿してください。段階的にアクセスをお渡しする方針です。詳しくは [how-to-join.md](how-to-join.md) を参照してください。

</details>

<details>
<summary><b>社内メンバーでなくても参加できますか？</b></summary>

<br>

はい。社内メンバー、有志、自己学習目的の方、いずれも歓迎します。区別はしません。

</details>

<details>
<summary><b>すぐにprivateリポジトリへ招待してもらえますか？</b></summary>

<br>

すぐにはお約束できません。開発用のリポジトリは実際に動いている作業場所であり、参加者が増えるとレビューや進行の調整に相応の手間がかかるためです。ワークショップ参加や、Discussionsでのやり取りを通じて意思を確認したうえで招待する、段階的な運用にしています。

機密データを扱うから選別している、ということではありません（上記のとおり合成データのみです）。

</details>

<details>
<summary><b>ワークショップはどんな内容ですか？</b></summary>

<br>

実際のIssueに着手し、Pull Requestを1本出すところまでを体験する内容です。詳しくは [workshop/README.md](workshop/README.md) を参照してください。

</details>

<details>
<summary><b>質問はどこにすればよいですか？</b></summary>

<br>

Discussionsの「質問」カテゴリへ投稿してください。

</details>

## 次に読む

| 文書 | 内容 |
| --- | --- |
| [how-to-join.md](how-to-join.md) | 参加方法 |
| [project-overview.md](project-overview.md) | プロジェクト概要 |
| [workshop/README.md](workshop/README.md) | ワークショップ開催概要 |

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
