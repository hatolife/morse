# v13 TODO

## 仕様

- [x] `#morse-card` を新規ページとして追加する方針を決定
- [x] 対象を欧文と記号に決定
- [x] 記号一覧を確定
- [x] 既存 `#flashcard` とは別ページにする方針を決定

## 実装

- [x] `v12` をベースに `v13/app` と `v13/lib` を作成する
- [x] `morse-flashcard.tsv` を追加する
- [x] `MorseCardTrainer` を追加する
- [x] `MorseCardState` を追加する
- [x] `MorseCardView` を追加する
- [x] `#morse-card` ルートを追加する
- [x] メニューにモールス符号フラッシュカードを追加する
- [x] i18n 文言を追加する
- [x] 既存スタイルに合わせて UI を整える
- [x] `X` と `×` が音声問題の同一選択肢に出ないよう制御する

## テスト

- [x] trainer のユニットテストを追加する
- [x] state のユニットテストを追加する
- [x] メニュー E2E テストを更新する
- [x] モールスカード E2E テストを追加する
- [x] `npm test` を実行する
- [x] `npm run build` を実行する

## 公開成果物

- [x] `v13/index.html` を生成する
- [x] `v13/assets/` を生成する
- [x] `v13/morse-flashcard.tsv` を配置する
- [x] ルート `index.html` から v13 へ到達できるよう更新する
