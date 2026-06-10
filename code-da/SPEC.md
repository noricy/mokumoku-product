# code-da 仕様書

## 1. コンセプト

**エンジニア向け寿司打**。

寿司打のフォーマット(コース選択 → 制限時間内にお題を打つ → 元取れたか判定)に、コード/コマンドをお題として乗せたタイピングゲーム。IDE のオートコンプリート体験をゲーム要素として組み込む。

- ターゲット: もくもく会参加者のエンジニア
- 用途: アイスブレイク・スキマ時間の腕試し
- 公開先: GitHub Pages (https://noricy.github.io/mokumoku-product/)

## 2. 画面遷移

```
[コース選択] → [プレイ] → [結果] ┬→ [プレイ] (もう一度)
                                    └→ [コース選択] (戻る)
```

## 3. ゲームプレイ仕様

### 3.1 状態モデル

| フィールド | 説明 |
|---|---|
| `target: string` | 現在のお題。必ず現コースのプール内から抽選される。画面に表示される |
| `buffer: string` | プレイヤーが正しくタイプ済みの文字列。**常に `target` の前方一致部分文字列** |
| `selectedIdx: number` | 補完候補リストでの選択位置 |
| `stats` | `correctChars`, `missedChars`, `completedWords`, `earnedYen`, `elapsedMs` |
| `remainingMs` | 残り時間 (ms) |
| `status` | `"playing" \| "finished"` |

### 3.2 文字入力ルール

印字可能文字 (`key.length === 1`) が押された時:

- `target[buffer.length] === key` (=次の正解文字) のとき
  - `buffer ← buffer + key`
  - `earnedYen += yenPerChar(course)` (即時加算)
  - `correctChars++`
  - `buffer === target` になった瞬間に**お題完了**を発火 (3.4 参照)
- それ以外
  - `buffer` は変化しない
  - `missedChars++`
  - 入力欄が shake アニメーション

### 3.3 補完候補リスト

- 表示位置: 入力バッファの下、最大 **6 件**
- 構成: 現コースのプールから「`buffer` を前方一致プレフィックスに持つ単語」を抽出
  - `target` は **常に候補に含まれる** (target は pool ∈、buffer は target の前方一致なので)
- ソート: プール内出現順 (シャッフルしない / レンダごとに順序が変わらない)
- `target` を視覚的にハイライト (枠線 or 色、選択カーソルとは別)
- 選択カーソル ▸ で 1 件をハイライト
  - **初期選択は `target`**
  - `buffer` が変化したときも、`target` が候補に残っていれば選択を `target` に維持
- `buffer` が空のとき: プールから 6 件サンプルしてプレビュー表示 (淡色)
  - これは「お題ヒント」表示で、Tab/Enter は無効

### 3.4 お題完了 (word completion)

`buffer === target` になった時、以下を一括で実行:

- `completedWords++`
- 次の `target` を抽選 (直前の `target` 以外から)
- `buffer ← ""`、`selectedIdx ←` 新 target の位置

### 3.5 Tab / Enter (補完実行)

IDE のオートコンプリートに倣い、**現在のトークン1個分だけ**補完する。target 全体の一発補完はしない。

#### 3.5.1 トークン定義

target を以下のルールで分割した単位を「トークン」と呼ぶ:

- **空白** (` ` 半角スペース) で区切る
- 引用符 (`"`, `'`, `` ` ``) で始まるトークンは閉じ引用符までを 1 トークンとする (中の空白は分割しない)
- 例: `git commit -m "fix"` → `git`, `commit`, `-m`, `"fix"` の 4 トークン
- 例: `git commit -m "feat: add login"` → `git`, `commit`, `-m`, `"feat: add login"` の 4 トークン

#### 3.5.2 補完可能トークン (completable token)

以下を満たすトークンのみ Tab 補完の対象:

- 長さ ≥ 2 文字
- 引用符 (`"`, `'`, `` ` ``) で始まらない
- 括弧類 (`{`, `}`, `(`, `)`, `[`, `]`)、パイプ (`|`)、論理演算 (`&`, `;`)、不等号 (`<`, `>`) を含まない

該当しないトークンは「**リテラル**」として扱い、補完不可。

#### 3.5.3 Tab 押下時の処理

1. `selected ≠ target` → 何もしない (hasError 視覚フィードバックのみ、ペナルティなし)
2. `buffer` が空 → 何もしない (preview モード)
3. `selected === target` の場合:
   - target における `buffer.length` 以降の「次のトークン」を特定する
     - `buffer.length` 位置から空白を読み飛ばし、最初の非空白文字から始まるトークン
   - そのトークンがリテラル → 何もしない (hasError 視覚フィードバックのみ、ペナルティなし)
   - 補完可能トークンなら:
     - `buffer ← target.slice(0, トークン末尾 + 末尾の空白1個分)` (末尾に空白があれば含める、無ければトークン末尾まで)
     - 補完で埋めた文字には ¥ は入らない
     - `buffer === target` になれば 3.4 のお題完了を発火

#### 3.5.4 例

target = `git commit -m "fix"` (長さ 19) の場合:

| buffer (長さ) | Tab 押下後 (長さ) | 備考 |
|---|---|---|
| `g` (1) | `git ` (4) | `git` + 末尾スペース |
| `git ` (4) | `git commit ` (11) | 次トークン `commit` + 末尾スペース |
| `git commit ` (11) | `git commit -m ` (14) | `-m` + 末尾スペース |
| `git commit -m ` (14) | 変化なし (NoCompletion) | 次トークンは `"fix"` でリテラル |
| `git commit -m "f` (16) | 変化なし | 現在いるトークンはリテラル |

### 3.6 ↑↓ (候補ナビゲーション)

- 補完候補内で選択位置を上下移動
- 端でクランプ (循環なし)
- `buffer` が空のときは無効 (プレビュー表示なので)

### 3.7 Shift+Tab (リフレッシュ)

- `buffer` が空のとき: 現 `target` を別の単語に交換、`missedChars += 3` のペナルティ
- `buffer` が非空のとき: `buffer ← ""` (タイプし直し)。ペナルティなし、`target` は維持

### 3.8 Backspace

- `buffer` 末尾を 1 文字削除
- ¥ は減らない、`missedChars` も加算しない
- `buffer` が空のときは無効

### 3.9 Esc

- ゲーム中断 → コース選択画面へ戻る (statsは破棄)

## 4. ¥ と採点

### 4.1 1 文字単価 (`yenPerChar`)

| コース | ¥/char |
|---|---|
| お手軽 | 4 |
| お勧め | 5 |
| 高級 | 6 |

### 4.2 ランク判定

`ratio = earnedYen / coursePrice`

| ランク | 条件 |
|---|---|
| SS | ratio ≥ 2.0 |
| S  | ≥ 1.5 |
| A  | ≥ 1.2 |
| B  | ≥ 1.0 (元取れた) |
| C  | ≥ 0.7 |
| D  | それ未満 |

### 4.3 WPM 計算

`wpm = correctChars / 5 / (elapsedMs / 60000)`
(5 文字 = 1 ワードの慣習)

### 4.4 正確率

`accuracy = correctChars / (correctChars + missedChars) × 100`

## 5. コース定義

| コース | コース代 | 制限時間 | プール |
|---|---|---|---|
| お手軽 (☕) | ¥300 | 45 秒 | CASUAL: 短いコマンド (`ls -la`, `git pull` 等) |
| お勧め (🥐) | ¥500 | 60 秒 | RECOMMENDED: 実務頻出 (`git commit -m "fix"`, `useState` 等) |
| 高級 (🍰) | ¥1000 | 90 秒 | PREMIUM: 長文スニペット (`docker compose up -d --build`, `const result = await fetch(url)` 等) |

## 6. お題プール

- `src/data/words.ts` の `WORDS` オブジェクトに 3 プールを定義
- プール内に重複なし
- 同じプール内で `target` が連続しないように、抽選時に直前と異なるものを優先
- プール追加・編集はファイル直接編集 (UI なし)

## 7. 結果画面

表示要素:
- ランクバッジ (大、色は条件次第: SS/S = 金、A/B = 緑、C/D = 赤)
- ランクコメント (例: 「黒字ランチが余裕で食えます」)
- 詳細テーブル
  - コース (絵文字 + 名前 + コース代)
  - 獲得額 (差額表示 +/-、色分け)
  - 完了お題数
  - WPM
  - 正確率
  - 正タイプ / ミスタイプ
- アクション
  - もう一度 (同コースで再プレイ)
  - コース選択へ
  - 結果をシェア (Twitter intent URL に文言 + `#コード打` ハッシュタグ)

## 8. キーバインド一覧

| キー | 動作 |
|---|---|
| 印字可能文字 | 1文字入力 (target に一致した場合のみ buffer 延長 + ¥獲得) |
| `↑` / `↓` | 補完候補リストの選択を移動 |
| `Tab` / `Enter` | 選択中の候補で補完実行 (selected が target に一致時のみ有効) |
| `Shift+Tab` | リフレッシュ / バッファクリア |
| `Backspace` | buffer を 1 文字削除 |
| `Esc` | 中断 (コース選択へ戻る) |

## 9. UI 方針

- ターミナル風 (黒背景 / 緑系アクセント / monospace フォント)
- お題は大きく表示 (画面上部)、入力 buffer は IDE のインプット行のように表現
- 補完候補は IDE のドロップダウンを模した縦リスト (`▸` カーソル、`target` のみ枠付き)
- 残り時間プログレスバー、HUD に「残り / 獲得 / 目標¥」
- 配色: 緑 (正タイプ), 赤 (ミス), 黄 (¥目標), シアン (時間)

## 10. 非機能

- スタック: Vite + React + TypeScript
- ビルド: `npm run build` → `dist/` を GitHub Pages に Actions 経由でデプロイ
- 入力対応:
  - **デスクトップ**: 物理キーボード (window keydown で特殊キー、隠し input の beforeinput で文字)
  - **モバイル**: ソフトキーボードからの文字入力 (隠し input の beforeinput) + 画面上アクションボタン (Tab / ↑↓ / Shift+Tab / Esc / Backspace)
  - ゲーム領域タップで input に focus → ソフトキーボード起動
- レスポンシブ: モバイル幅でもアクションボタンが画面下部に並び、片手操作可能
- ブラウザ: モダンブラウザ最新版 (Chrome / Edge / Firefox / Safari, iOS Safari 含む)

## 11. 対象外 (out of scope)

将来の拡張余地として残しつつ、本仕様の範囲には含めない:

- ランキング / リーダーボード (localStorage や Supabase 等)
- 効果音 / BGM
- IME 経由の日本語入力お題
- カスタムプール作成 UI
- マルチプレイ / 対戦モード
- 統計 / 履歴の永続化

## 12. UI 上の追加表示

- 現在トークンがリテラル(補完不可)の場合、ヒント領域に「現トークンは literal — Tab 不可」を表示
- リテラル部分は target 表示で控えめに色分け(任意、UX 確認用)
