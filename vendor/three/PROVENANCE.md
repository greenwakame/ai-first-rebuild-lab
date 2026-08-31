# vendor/three — provenance

このディレクトリのファイルは three.js から取得したものです。**編集しないでください。**
更新する場合は、下記の手順で取得し直し、この表も更新してください。

このリポジトリはビルド工程を持たないため（ADR 0028 D3）、バンドラを通さず
import map から直接参照しています。CDN への実行時依存はありません。

| 項目 | 値 |
| --- | --- |
| 名称 | three.js |
| version | **r185（npm `three@0.185.1`）** |
| 公開日 | 2026-07-01 |
| ライセンス | **MIT**（全文は `LICENSE`） |
| 取得元 | `https://registry.npmjs.org/three/-/three-0.185.1.tgz` |
| tarball sha256 | `a2143f5bf978bd3470a51024b2b6bdd581913ba8f36ff1538d433f3a95adf2df` |
| tarball sha1 | `63e9e241a17b101e211965121a017b4b4d8054ae`（npm 公開値と一致を確認） |
| npm integrity | `sha512-5aojFCXKwnjBRZvUnt3WFfEcvUJgkN5LlijRFN95hMy8WVkG4I0QNcJE+OuWvuJ0bOdStrbfXn0pkd6/QyiAlg==`（同上） |

配布物全体ではなく、ヒーローの描画に必要なファイルだけを取り出しています。
取り出したファイルの import を再帰的に辿り、閉じていることを確認済みです。
外部へ出る指定子は `three` だけで、これは import map が同ディレクトリ内へ解決します。

## 取り出したファイルと sha256

| sha256 | bytes | path |
| --- | --- | --- |
| `8b378ebe60e2fe500158cb0ac71cb5e8b7d92953c2abcc63a0eb90499653b5bc` | 1081 | `LICENSE` |
| `05b2609338c76cd65daf74f3ac515bc9a5045e1b3b33edc07d8c9bd55250fa90` | 385386 | `build/three.core.min.js` |
| `86bcee248b64f44bcfc23c331ae74619061957d59cab040171dcb6fb5900beb6` | 365552 | `build/three.module.min.js` |
| `1a580add8398e969a63336ed99a8d3ef33705b059132c0ee9914c83b688177a6` | 14157 | `examples/jsm/misc/GPUComputationRenderer.js` |
| `4e079a5886152d7e529a59aef644e968ab4d32c6a33ce016b36bf29b2eac26f7` | 8501 | `examples/jsm/postprocessing/EffectComposer.js` |
| `7cd08eee9d5d6f5578beaddbdcbe9c384f6873810af27f22ab7db3ceeb127aa3` | 4694 | `examples/jsm/postprocessing/MaskPass.js` |
| `02e4a261af34de71338185e9e87f0cbe5cba9115608d984363e1269dec1d2272` | 4184 | `examples/jsm/postprocessing/OutputPass.js` |
| `444b409c235ead986893c472e720da1b779a56985c7d10b279c7944b52bd61c5` | 4218 | `examples/jsm/postprocessing/Pass.js` |
| `817f6c3cdcd0fd41515d112359ea0532568eefb5aabd3b33903957ebca1b8a6a` | 4280 | `examples/jsm/postprocessing/RenderPass.js` |
| `e2500a5913b26bbf5148ceaae644c6edcff06a18b01494ee37bf856353d2ab9d` | 3228 | `examples/jsm/postprocessing/ShaderPass.js` |
| `1158bb02f6467889aba19c1a788b9107054d7f6a558498b5e2152db5873bb859` | 14921 | `examples/jsm/postprocessing/UnrealBloomPass.js` |
| `a33057d5ac91c43304c186ac0e8816e62bb2ed471d3a00ff3018dfd5c0389718` | 729 | `examples/jsm/shaders/CopyShader.js` |
| `5044f780b6e6cf863947f64c36fe1587132f7fbe395ada863cd1e5f0388dcf1e` | 1291 | `examples/jsm/shaders/LuminosityHighPassShader.js` |
| `353479f77a8d7e2629d49ccac9fc2f5dbfdda5442e0adf867b00377a2fcb0cb2` | 1876 | `examples/jsm/shaders/OutputShader.js` |

合計 813,017 bytes（raw）。GitHub Pages は gzip で配信するため、実際の転送量は
約 201 KB です。

## 取得手順（再現用）

```bash
curl -sL -o three.tgz https://registry.npmjs.org/three/-/three-0.185.1.tgz
shasum -a 256 three.tgz   # 上表の tarball sha256 と一致すること
tar -xzf three.tgz
# package/ から上表の path に対応するファイルを vendor/three/ へ配置する
```
