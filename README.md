# mokumoku-product

もくもく会で作るプロジェクト置き場。

## プロジェクト一覧

| ディレクトリ | 概要 |
|---|---|
| [code-da](./code-da) | コードを打って稼ぐ寿司打風タイピングゲーム |

## デプロイ

`main` に push すると GitHub Actions が `code-da` をビルドして GitHub Pages に公開する。
URL は `https://<user>.github.io/<repo-name>/`。

初回だけ GitHub リポジトリの Settings → Pages → Source を **GitHub Actions** に設定する必要あり。
