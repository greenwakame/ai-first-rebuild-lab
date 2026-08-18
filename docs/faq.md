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

## 成り立ちについて

<details>
<summary><b>既存のワークショップとはどういう関係ですか？</b></summary>

<br>

このプロジェクトは、社内で続いてきた技術ワークショップの**新しい題材**として発足しました。詳しくは [なぜこのプロジェクトが始まったか](../README.md#なぜこのプロジェクトが始まったか) を参照してください。

そのワークショップが教えてきた「設計を先に固め、レビューを通してから実装する」という核はそのままで、この題材ではそこに **AIエージェントによる実装と、人による検証** が加わります。

</details>

<details>
<summary><b>ワークショップに参加しないと開発に参加できませんか？</b></summary>

<br>

**いいえ。ワークショップは必須ではありません。**

参加の入口はDiscussionsの **Apply**（参加申込）カテゴリです。ワークショップは、実際の進め方を短時間で体験できる**入口のひとつ**であって、唯一の経路ではありません。Discussionsでのやり取りを通じて継続的な参加意思を確認できれば、そちらからでも招待をご案内します。

詳しくは [how-to-join.md](how-to-join.md) を参照してください。

</details>

<details>
<summary><b>従来の題材と新しい題材、どちらを選べばいいですか？</b></summary>

<br>

**併存しているので、どちらを選んでも構いません。**

- **従来の題材** — 設計書を書き、レビューを受け、自分で実装する流れを一通り体験できます
- **この題材** — 同じ順序を踏みつつ、実装をAIエージェントが担い、**人は差分を検証する側に回ります**

「設計を先に固める」規律を持たないままAIエージェントに実装させると、生成された差分を評価する基準がありません。**その意味では、従来の題材で身につけたことがこの題材の前提になります。** どちらから始めても構いませんが、この題材に不安がある方は従来の題材から入るのも選択肢です。

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
<summary><b>AIが仕様のほうを書き換えて、辻褄を合わせてしまうことはないのですか？</b></summary>

<br>

**その失敗モードを検出するための仕組みを入れています。**

仕様の受け入れ条件にはIDが振られ、実装とテストの該当箇所にマーカーで結ばれています。仕様だけが変更されてコードが動いていない状態、逆に実装だけが変更されてテストも仕様も動いていない状態を、コマンドの終了コードで検出します。「実装済み」の状態を下げたり、要求の種別を弱いほうへ移したりして検出結果を消す操作も、それ自体を検出対象にしています。

そのうえで規約として、**ズレを検出したエージェントは整合を取らず、停止して人へ報告します。** 検出スクリプトに自動修正の機能はありません。

限界も明示しています。同じPull Requestで仕様とコードを同時に書き換えれば検査は通過します。検出しているのは「片方だけが動いていない」ことであって、要求文とコードの意味的な一致ではありません。詳しくは [ADR 0023](adr/0023-requirement-traceability-and-drift-detection.md) と [development-approach.md](development-approach.md#要求トレーサビリティ) を参照してください。

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

Discussionsの **Apply**（参加申込）カテゴリへ投稿してください。段階的にアクセスをお渡しする方針です。詳しくは [how-to-join.md](how-to-join.md) を参照してください。

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

Discussionsの **Q&A** カテゴリへ投稿してください。

</details>

## 次に読む

| 文書 | 内容 |
| --- | --- |
| [how-to-join.md](how-to-join.md) | 参加方法 |
| [project-overview.md](project-overview.md) | プロジェクト概要 |
| [workshop/README.md](workshop/README.md) | ワークショップ開催概要 |

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
