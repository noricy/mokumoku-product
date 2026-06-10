# code-da (コード打)

もくもく会用の寿司打風タイピングゲーム。コードやコマンドを打って「ドリンク代の元を取る」のがゴール。

## ローカル開発

```bash
npm install
npm run dev
```

http://localhost:5173 を開く。

## 本番ビルド

```bash
npm run build
npm run preview   # ローカルで配信して確認
```

`dist/` に静的ファイルが出力されるので、そのままどこにでも上げられる。

## 共有 (デプロイ)

### Vercel (おすすめ・1分)

```bash
npx vercel
```

対話に従うだけ。本番URLが返ってくるので Slack 等に貼って共有。

### GitHub Pages

リポジトリにこの `code-da/` を push して、`vite.config.ts` に `base: '/<repo-name>/'` を追加 → `npm run build` → `dist/` を `gh-pages` ブランチに公開。

### Netlify / Cloudflare Pages

ドラッグ&ドロップで `dist/` フォルダを投げ込めば公開できる。

## ゲームルール

- 3 コース: お手軽 ¥300 / お勧め ¥500 / 高級 ¥1000
- 制限時間内にプール内のコマンド/スニペットを打って実行する
- **IDE 補完モデル**: タイプした前方一致プレフィックスから候補が表示される。
  `↑↓` で選択、`Tab` または `Enter` で実行
- 1文字打つごとに ¥4〜¥6 獲得 (コース別)。補完で省略した文字は無報酬 →
  「完走で最大¥」「早回しで回転数」のトレードオフ
- コース代以上稼げば「元取れた」(ランク B 以上)
- `Shift+Tab` で候補リフレッシュ (バッファ非空なら入力クリア)
- `Backspace` で1文字戻る / `Esc` で中断

## お題の追加

`src/data/words.ts` の `CASUAL` / `RECOMMENDED` / `PREMIUM` に追記するだけ。
もくもく会で出てきたネタを足していくとウケる。
