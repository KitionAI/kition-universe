<div align="center">

# Kition Universe

Kition Universe：AI のためのオープンなプロ向けソフトウェア群、Kition の 3D 星図です。kit ごとの 16 の惑星、シナリオ銀河、そして AI エージェントが実際のファイルで作業するリプレイがあります。

[universe.kition.ai](https://universe.kition.ai) · [Kition](https://kition.ai)

[English](../../README.md) · [简体中文](README.zh-CN.md) · **日本語** · [한국어](README.ko-KR.md) · [Deutsch](README.de-DE.md) · [Français](README.fr-FR.md) · [Español](README.es-ES.md) · [Português](README.pt-BR.md) · [Tiếng Việt](README.vi-VN.md)

</div>

[![Kition Universe](../images/kits.webp)](https://universe.kition.ai)

## これは何か

Kition は「kit」と呼ぶ 16 のプロ向けエディタです。文書、表計算、スライド、PDF、画像、動画、ベクター、CAD、3D シーンなどを扱います。どの kit も実際のファイルを開き、Kit Harness Protocol（KHP）というひとつのオープンなプロトコルを通じて AI エージェントが操作できます。

Kition Universe はその全体をひと目で見られる場所です。各 kit で何が作れるか、AI はそれをどう使うか、あなた自身はどう使えるか、という 3 つの問いに答えます。

## ここでできること

### kit ごとの 16 の惑星を訪ねる

kit にはそれぞれの世界があります。海の惑星、ガス惑星、都市の格子、溶岩の惑星。惑星をクリックすると kit で作れるものがわかり、着陸すると街を歩けます。街の建物ひとつひとつが kit の機能です。

### エージェントの作業を見る

再生を押すと、エージェントが送るコマンドが 1 つずつ表示され、その横に各ステップのあと kit が描いた画像が並びます。使われている建物が光ります。終わったら、プロンプトと設定を自分の AI 用にコピーできます。これは実際の kit コマンドの記録であり、モデルがその場で動いているわけではありません。

![エージェントの作業を見る](../images/replay.webp)

### ひとつの仕事を kit から kit へたどる

12 のシナリオ銀河が kit の組み合わせ方を示します。経営レビューは表計算からレポート、スライド、署名済みの PDF へ進みます。輸送船がファイルを惑星から惑星へ運び、完成したファイルは成果デッキに並びます。

![ひとつの仕事を kit から kit へたどる](../images/scenario.webp)

### やりたいことから始める

「四半期レビュー」「ピボット」「.psd」と入力すれば、そこへ直接飛べます。シナリオ、kit、機能、エージェントのコマンド、ファイル形式を検索できます。検索はブラウザ内で行われ、何も送信されません。

![やりたいことから始める](../images/search.webp)

### ほかの人が作ったものを見る

kit の上に作られた製品は、プロダクト銀河の惑星になり、使っている kit と光の線でつながります。掲載は無料で、製品の惑星はすべて同じ大きさです。

![ほかの人が作ったものを見る](../images/products.webp)

### 全体のつながりを見る

全体図でシナリオ銀河を指すと、それを構成する kit の惑星への線が表示されます。60 秒のツアーが、プロトコル、kit ひとつ、シナリオひとつ、製品を順に案内します。

![全体のつながりを見る](../images/overview.webp)

## 16 の kit

kit ひとつが惑星ひとつです。Preview と書かれた kit はまだ開発中で、惑星には足場が組まれています。

| Kit | 編集するもの | ファイル | 惑星 |
| --- | --- | --- | --- |
| [**motion**](https://universe.kition.ai/planet/motion/) | モーショングラフィックス | `.kmotion` | 溶岩の惑星 |
| [**note**](https://universe.kition.ai/planet/note/) | 互いにリンクする Markdown ノート | `.md` | ガス惑星 |
| [**table**](https://universe.kition.ai/planet/table/) | 型付きフィールドとビューを持つ構造化テーブル | `.ktable` | 都市の惑星 |
| [**board**](https://universe.kition.ai/planet/board/) | ホワイトボードとマインドマップ | `.kboard` | 海の惑星 |
| [**photo**](https://universe.kition.ai/planet/photo/) | レイヤー画像 | `.psd` | 嵐の惑星 |
| [**film**](https://universe.kition.ai/planet/film/) | 動画編集 | `.kfilm` | ガス惑星 |
| [**doc**](https://universe.kition.ai/planet/doc/) | ワープロ文書 | `.docx` | 海の惑星 |
| [**sheet**](https://universe.kition.ai/planet/sheet/) | 表計算 | `.xlsx` | 都市の惑星 |
| [**slide**](https://universe.kition.ai/planet/slide/) | プレゼンテーション | `.kslide` | ガス惑星 |
| [**pdf**](https://universe.kition.ai/planet/pdf/) | PDF のページ、フォーム、墨消し | `.pdf` | クレーターの岩石惑星 |
| [**vector**](https://universe.kition.ai/planet/vector/) | ベクターイラスト | `.kvector` | 結晶の惑星 |
| [**layout**](https://universe.kition.ai/planet/layout/) · Preview | ページレイアウト | `.klayout` | 砂丘の惑星 |
| [**cad**](https://universe.kition.ai/planet/cad/) · Preview | 2D 製図 | `.dxf` | クレーターの岩石惑星 |
| [**html**](https://universe.kition.ai/planet/html/) · Preview | Web ページ | `.html` | 嵐の惑星 |
| [**scene**](https://universe.kition.ai/planet/scene/) · Preview | 3D シーン | `.kscene` | 海の惑星 |
| [**design**](https://universe.kition.ai/planet/design/) · Preview | インターフェースデザイン | `.kdesign` | 結晶の惑星 |

## 知っておくとよいこと

- このサイトは AI モデルを呼び出しません。リプレイは実際の kit コマンドの記録で、画像は kit が描いたものです。
- 進み具合（訪れた惑星、見たリプレイ）はブラウザにだけ保存されます。アカウントはありません。
- WebGL がなくても使えます。静的な星図と同じ内容が表示され、リプレイも見られます。
- 英語と中国語で利用できます。

## 製品や銀河を追加する

kit を使って何かを作りましたか。プロダクト銀河の惑星として掲載できます。複数の kit を通る仕事の進め方があれば、シナリオ銀河を提案できます。どちらも無料で、issue フォームから受け付けます。

- [製品の惑星を追加する](https://github.com/KitionAI/kition-universe/issues/new?template=built-with-kition.yml)
- [シナリオ銀河を提案する](https://github.com/KitionAI/kition-universe/issues/new?template=scenario-galaxy.yml)
- [ルールと形式](../../.github/CONTRIBUTING.md)

## ビルドとテスト

サイトは静的です。Astro、three.js、データファイル 1 つで構成されています。ローカルで動かすには:

```bash
pnpm install
pnpm dev        # http://localhost:4330
```

ビルド、チェック、デプロイの方法: [docs/DEVELOPMENT.md](../DEVELOPMENT.md)

## リンク

- [Kition](https://kition.ai) · [GitHub](https://github.com/KitionAI/kition)
- [Kition SDK](https://github.com/KitionAI/kition-sdk) · [開発者向けドキュメント](https://developer.kition.ai)
- [Kit Harness Protocol](https://universe.kition.ai/protocol/)

## ライセンス

Apache-2.0
