# v13 TODO

## 仕様

- [x] `#morse-card` を新規ページとして追加する方針を決定
- [x] 対象を欧文と記号に決定
- [x] 記号一覧を確定
- [x] 既存 `#flashcard` とは別ページにする方針を決定

## 実装

- [ ] `v12` をベースに `v13/app` と `v13/lib` を作成する
- [ ] `morse-flashcard.tsv` を追加する
- [ ] `MorseCardTrainer` を追加する
- [ ] `MorseCardState` を追加する
- [ ] `MorseCardView` を追加する
- [ ] `#morse-card` ルートを追加する
- [ ] メニューにモールス符号フラッシュカードを追加する
- [ ] i18n 文言を追加する
- [ ] 既存スタイルに合わせて UI を整える
- [ ] `X` と `×` が音声問題の同一選択肢に出ないよう制御する

## テスト

- [ ] trainer のユニットテストを追加する
- [ ] state のユニットテストを追加する
- [ ] メニュー E2E テストを更新する
- [ ] モールスカード E2E テストを追加する
- [ ] `npm test` を実行する
- [ ] `npm run build` を実行する

## 公開成果物

- [ ] `v13/index.html` を生成する
- [ ] `v13/assets/` を生成する
- [ ] `v13/morse-flashcard.tsv` を配置する
- [ ] ルート `index.html` から v13 へ到達できるよう更新する
