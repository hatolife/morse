# モールス体験

モールス信号の学習・練習を支援するWebアプリケーション

## 公開URL

- https://morse.hato.life/

## 概要

アマチュア無線のモールス通信(CW)を学習するためのWebアプリケーションです。
ブラウザだけで、コッホ法によるモールス符号の習得、電鍵操作の練習、CW略語・Q符号の学習、実践的なQSO聞き取り練習ができます。

[LCWO (Learn CW Online)](https://lcwo.net/)の機能の一部をスマートフォンでも利用しやすくする目的で実装されています。

## 主な機能

- **コッホ法トレーニング**: レッスン1-40（標準コッホシーケンス）、カスタム文字選択対応
- **電鍵練習**: 縦振り・横振り電鍵シミュレーター、Iambic A/B対応、キーバインド設定可能
- **CW略語・Q符号学習**: フラッシュカード・試験モード、全500語以上収録、CSV/TSVエクスポート
- **QSO聞き取り練習**: ラバースタンプQSO、ランダムQSO生成、カテゴリ別テンプレート、音声ダウンロード
- **ライブラリ化**: `morse-engine`として独立したライブラリを提供、他プロジェクトから再利用可能
- **高品質**: ユニットテスト344件（98.94%カバレッジ）、E2Eテスト39件（100%成功）
- **セキュリティ**: npm依存関係の脆弱性0件、定期的な依存関係更新、GitHub Actions CI/CD

## バージョン

### 最新版
- **[v13 - モールス符号フラッシュカード版](https://morse.hato.life/v13/)** - 欧文・数字・記号のモールス符号をカード形式で学習
  - [モールス符号フラッシュカード](https://morse.hato.life/v13/#morse-card) - 一覧/学習/試験モード、音声出題、苦手カード復習
  - [CW略語・Q符号学習](https://morse.hato.life/v13/#flashcard) - 500語以上、閲覧/学習/試験モード
  - [コッホ法トレーニング](https://morse.hato.life/v13/#koch) - レッスン1-40、カスタム文字選択
  - [モールス信号聞き取り練習](https://morse.hato.life/v13/#listening) - QSO生成、音声ダウンロード
  - [横振り電鍵練習](https://morse.hato.life/v13/#horizontal-key) - タイミング評価機能付き、Iambic A/B対応
  - [縦振り電鍵練習](https://morse.hato.life/v13/#vertical-key) - タイミング評価機能付き

### 過去バージョン
- **[v11 - タイミング評価版](https://morse.hato.life/v11/)** - 電鍵操作のタイミング精度評価機能を追加 (更新: 2025-10-22)
  - [README](v11/app/README.md) - セットアップ手順と機能詳細
  - **新機能**: 縦振り・横振り電鍵にタイミング評価機能を追加
    - リアルタイムで短点/長点のタイミング精度を測定
    - 平均精度、平均誤差、要素別統計を表示
    - 練習の質を客観的に評価可能
  - **横振り電鍵のタイミング図機能** (2025-10-22追加):
    - PlantUML風タイミングチャート（Dit入力、Dash入力、出力の3本の信号ライン）
    - スクイーズ区間のハイライト表示（オレンジ色）
    - 無入力期間（Gap）のハイライト表示（青色）
    - デバッグ情報表示とタイミング図の自動リセット
  - **品質保証**: ユニットテスト386件、E2Eテスト43件（100%成功）
  - **セキュリティ**: npm依存関係の脆弱性0件（vite 7.1.10、vitest 3.2.4）
  - [メニューページ](https://morse.hato.life/v11/) - 5つの練習モードへのアクセス
  - [CW略語・Q符号学習](https://morse.hato.life/v11/#flashcard) - 500語以上、閲覧/学習/試験モード
  - [コッホ法トレーニング](https://morse.hato.life/v11/#koch) - レッスン1-40、カスタム文字選択
  - [モールス信号聞き取り練習](https://morse.hato.life/v11/#listening) - QSO生成、音声ダウンロード
  - [横振り電鍵練習](https://morse.hato.life/v11/#horizontal-key) - **タイミング評価機能付き + タイミング図**、Iambic A/B対応
  - [縦振り電鍵練習](https://morse.hato.life/v11/#vertical-key) - **タイミング評価機能付き**
- **[v10 - GUI/エンジン分離版](https://morse.hato.life/v10/)** - モールス信号エンジンのライブラリ化、全機能v9互換
  - [README](v10/README.md) - アーキテクチャ設計とライブラリAPI仕様
  - **アーキテクチャ**: GUI層とエンジン層を分離、`morse-engine`として独立したライブラリを提供
  - **再利用性**: 他のプロジェクトから簡単に利用可能なUI非依存のエンジン
  - **品質保証**: ユニットテスト346件（98.94%カバレッジ）、E2Eテスト39件（100%成功）
  - **セキュリティ**: npm依存関係の脆弱性0件（vite 7.1.11、vitest 3.2.4）
- **[v9 - v10開発前の安定版](https://morse.hato.life/v9/)** - v8の機能を維持した最終モノリス版
- **[v8 - PWA版](https://morse.hato.life/v8/)** - Progressive Web App、オフライン対応、インストール可能
- **[v7 - モールス信号聞き取り練習版](https://morse.hato.life/v7/)** - SPA形式、QSO聞き取り機能追加
- **[v6 - コッホ法マルチモード版](https://morse.hato.life/v6/)** - SPA形式、モードルーティング実装
- **[v5 - QSO聞き取り練習版](https://morse.hato.life/v5/)** - ラバースタンプQSO機能追加
- **[v4 - 単一HTML版](https://morse.hato.life/v4/)** - 単一HTMLファイル形式
- **[v3](https://morse.hato.life/v3/)** - v2の改良版
- **[v2 - TypeScript再実装版](https://morse.hato.life/v2/)** - [README](v2/README.md)
- **[v1 - 初期実装版](https://morse.hato.life/v1/)** - [README](v1/README.md)

## 技術スタック

- **フロントエンド**: TypeScript + Vite 7.1.10
- **アーキテクチャ**: GUI層とエンジン層を分離（v10以降）
- **ライブラリ**: morse-engine（UI非依存のモールス信号処理エンジン）
- **テスト**:
  - ユニットテスト: Vitest 3.2.4、387テスト（v11）
  - E2Eテスト: Playwright 1.56.1、41テスト、100%成功（v11）
- **音声生成**: Web Audio API
- **状態管理**: LocalStorage
- **UI/UX**: レスポンシブデザイン、モバイル対応
- **セキュリティ**: XSS保護（HTMLエスケープ）、依存関係脆弱性0件

## 開発

詳細は [.claude/context.md](.claude/context.md) を参照してください。

### セットアップ (v11)

```bash
# ライブラリ（morse-engine）
cd v11/lib
npm install

# アプリケーション（GUI）
cd v11/app
npm install
```

### 開発サーバー起動

```bash
# アプリケーション（GUI）
cd v11/app
npm run dev
```

### テスト

```bash
# ライブラリのユニットテスト（387テスト）
cd v11/lib
npm test

# カバレッジ確認
npm run test:coverage

# E2Eテスト（41テスト、Playwright）
cd v11/app
npm run test:e2e

# E2Eテスト（UI表示）
npm run test:e2e:ui

# E2Eテスト（ブラウザ表示あり）
npm run test:e2e:headed

# テストレポート表示
npm run test:e2e:report
```

### ビルド

```bash
# ライブラリ
cd v11/lib
npm run build

# アプリケーション
cd v11/app
npm run build
```

ビルド成果物は `v11/lib/dist/` と `v11/app/dist/` に出力されます。

## データファイル

- `flashcard.tsv` - CW略語・Q符号データ (500語以上)
  - タブ区切り形式
  - タグ、使用頻度、略語、英文、和訳、説明、具体例を収録
  - v10ではCSV/TSVエクスポート機能を追加

## ライセンス

このプロジェクトのソースコードは **CC0 1.0 Universal (パブリックドメイン)** として公開されています。

### 使用ライブラリのライセンス

このプロジェクトは以下のオープンソースライブラリを使用しています。各ライブラリのライセンスは、それぞれのライブラリのライセンスに従います。

#### ビルド・開発ツール
- **TypeScript** (5.3.3) - Apache License 2.0
- **Vite** (7.1.10) - MIT License
- **Vitest** (3.2.4) - MIT License
- **@vitest/coverage-v8** (3.2.4) - MIT License
- **Playwright** (1.56.1) - Apache License 2.0
- **Terser** (5.44.0) - BSD 2-Clause License
- **happy-dom** (20.0.7) - MIT License
- **@types/node** (20.10.0) - MIT License

各ライブラリの詳細なライセンス情報は、それぞれのプロジェクトページをご確認ください。
