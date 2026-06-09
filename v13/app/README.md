# モールス練習アプリ v11

モールス信号の練習アプリケーション - 縦振り電鍵、横振り電鍵、コッホ法、聞き取り練習、CW略語学習

## v11の新機能

**Phase 3完了: タイミング評価機能** ✅
- 縦振り電鍵と横振り電鍵にタイミング評価機能を追加
- リアルタイムで短点/長点のタイミング精度を測定
- 平均精度、平均誤差、要素別統計を表示
- 練習の質を客観的に評価可能

**横振り電鍵のタイミング図機能** ✅ (2025-10-22追加)
- **PlantUML風タイミングチャート**: パドル入力状態と出力信号を可視化
  - Dit入力、Dash入力、出力の3本の信号ライン
  - スクイーズ区間のハイライト表示（オレンジ色）
  - 無入力期間（Gap）のハイライト表示（青色）
- **デバッグ情報**: パドル入力イベント、スクイーズ区間、無入力期間の詳細表示
- **自動リセット機能**: 長時間無入力後のタイミング図自動クリア
- **スペーシング評価の配置変更**: タイミング図の下に移動して見やすく改善

**依存関係の最新化** ✅
- vitest: 1.0.4 → 3.2.4
- @vitest/coverage-v8: 1.0.4 → 3.2.4
- happy-dom: 12.10.3 → 20.0.7
- vite: 5.0.8 → 7.1.10
- セキュリティ脆弱性0件（6件を修正）
- 全387ユニットテスト成功
- 全41 E2Eテスト成功

## 開発環境セットアップ

### 必要な環境

- Node.js 18以降
- npm

### インストール

```bash
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアクセスできます。

### ビルド

```bash
npm run build
```

ビルド結果は `dist/` ディレクトリに出力されます。

## テスト

### 単体テスト (lib側)

```bash
cd ../lib
npm test
```

### E2Eテスト

#### 初回セットアップ

E2Eテストを実行するには、Chromiumブラウザと依存ライブラリのインストールが必要です:

```bash
# Chromiumブラウザのインストール
npx playwright install chromium

# システム依存ライブラリのインストール（管理者権限が必要）
npx playwright install-deps chromium
```

**注意**: `npx playwright install-deps chromium`は管理者権限が必要です。
Linuxの場合はsudoで実行してください:

```bash
sudo npx playwright install-deps chromium
```

#### WSL環境での制限事項

現在、WSL (Windows Subsystem for Linux) 環境では、Playwrightのページ作成処理に制約があり、E2Eテストが正常に動作しません。

**確認された問題**:
- ブラウザ起動: ✓ 正常
- コンテキスト作成: ✓ 正常
- ページ作成: ✗ `browserContext.newPage()`が3秒以上かかる

**試行した対策** (効果なし):
- `--use-gl=swiftshader`, `--disable-gpu`, `--disable-dev-shm-usage`, `--no-sandbox`の追加
- ブラウザのインストール場所確認 (既にext4上に配置済み)

WSL環境では`browserContext.newPage()`の処理が異常に遅く、実用的なテスト実行ができません。これはGPUレンダリングの問題ではなく、WSLのプロセス間通信やカーネル機能の制約によるものと考えられます。

**推奨される実行環境**:
- ネイティブLinux環境 (Ubuntu等)
- Windowsネイティブ環境 (Node.jsとPlaywrightをWindows上に直接インストール)
- CI/CD環境 (GitHub Actions等) - リポジトリルートの`.github/workflows/e2e-test.yml`で自動実行

**参考**: playwright.config.ts (playwright.config.ts:62-69)にはWSL環境用の最適化設定が含まれていますが、根本的な問題の解決には至りませんでした。

#### テスト実行

```bash
npm run test:e2e
```

特定のテストファイルのみ実行:

```bash
npx playwright test e2e/menu.spec.ts
```

### CI/CD (GitHub Actions)

GitHub Actionsで自動的にE2Eテストを実行できます。ワークフローは以下のタイミングで実行されます:

- `master`または`main`ブランチへのpush
- Pull Request作成時
- 手動実行 (Actions タブから)

**ワークフロー設定**: リポジトリルートの`.github/workflows/e2e-test.yml`

ワークフローは以下を実行します:
1. Node.js 20のセットアップ
2. 依存関係のインストール
3. Chromiumブラウザとシステム依存関係のインストール
4. デバッグテストの実行 (e2e/debug.spec.ts)
5. 全E2Eテストの実行
6. テストレポートのアップロード (失敗時も含む)

**手動実行方法**:
1. GitHubリポジトリの「Actions」タブを開く
2. 「E2E Tests」ワークフローを選択
3. 「Run workflow」ボタンをクリック

これにより、WSL環境の制約を回避して、ネイティブUbuntu環境でのE2Eテスト結果を確認できます。

## プロジェクト構造

```
v11/
├── lib/          # コアロジック（モールスエンジン、トレーナー等）
│   ├── src/
│   │   ├── core/        # コア機能（audio, buffer, timer等）
│   │   ├── trainers/    # トレーナー実装
│   │   └── components/  # 共通UIコンポーネント
│   └── test/            # 単体テスト
└── app/          # UIアプリケーション
    ├── src/
    │   └── ui/
    │       └── views/   # 各トレーナーのUIビュー
    ├── e2e/             # E2Eテスト
    └── dist/            # ビルド出力
```

## ライセンス

CC0 1.0 Universal (パブリックドメイン)
