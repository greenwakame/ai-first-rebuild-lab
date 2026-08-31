# vendor/marked — provenance

このディレクトリのファイルは marked から取得したものです。**編集しないでください。**

公開サイトで Markdown をブラウザ上で描画するために使います。このリポジトリは
ビルド工程を持たないため（ADR 0028 D3）、バンドラを通さず import map から
直接参照しています。CDN への実行時依存はありません。

| 項目 | 値 |
| --- | --- |
| 名称 | marked |
| version | **18.0.11** |
| ライセンス | **MIT**（全文は `LICENSE`） |
| 取得元 | `https://registry.npmjs.org/marked/-/marked-18.0.11.tgz` |
| tarball sha256 | `cef55476c7551e73e1a89118fa69fee9f7eef9960e9c774ad266e22ee966b994` |
| tarball sha1 | `0f50ce5cdf25b2c07f67d3787220b64a5845cce1`（npm 公開値と一致を確認） |
| npm integrity | `sha512-HnslJfsZkRPBDJRHvVtAaWlZHEpSu7u8LgQuJCELjRKuWR+hpq4A7sLq3p8HaI9ypVoXDXxV34CsQJEe1+J5Aw==`（同上） |

配布物全体ではなく ESM ビルド1本だけを取り出しています。外部への import は
持たず、単体で完結することを確認済みです。

## 取り出したファイルと sha256

| sha256 | bytes | path |
| --- | --- | --- |
| `8e3a3f82f59a60958f56ca08f445647c32a4733dc7ca6c2c46f6eb898471ab9c` | 2942 | `LICENSE` |
| `05e41134d075ad3a009a748d6c779c3d83cea9b942be911c2d9abade36d1dd31` | 43800 | `lib/marked.esm.js` |

## 採用しなかったもの

- **highlight.js** — 構文強調。対象文書のコードフェンス112個のうち55個が言語
  指定なし、40個が bash であり、gzip 43KB に見合わないため採用しない。
- **mermaid** — gzip **953KB**。対象文書中の mermaid は1個のみで、しかも同じ
  箇所から対話型の実物の図へリンクされている。採用しない。

## 取得手順（再現用）

```bash
curl -sL -o marked.tgz https://registry.npmjs.org/marked/-/marked-18.0.11.tgz
shasum -a 256 marked.tgz   # 上表の tarball sha256 と一致すること
tar -xzf marked.tgz
# package/lib/marked.esm.js と package/LICENSE を vendor/marked/ へ配置する
```
