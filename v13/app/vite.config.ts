import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	base: './',
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	build: {
		outDir: 'dist',
		sourcemap: true,
		//! 本番ビルドの最適化設定。
		minify: 'terser',
		terserOptions: {
			compress: {
				drop_console: true, // console.logを削除
				drop_debugger: true, // debuggerを削除
			},
		},
		//! チャンク分割設定（コード分割）。
		rollupOptions: {
			output: {
				manualChunks: {
					//! morse-engineライブラリを別チャンクに分離。
					'morse-engine': ['morse-engine'],
				},
			},
		},
		//! チャンクサイズ警告の閾値を設定。
		chunkSizeWarningLimit: 1000,
		//! アセット圧縮設定。
		assetsInlineLimit: 4096, // 4KB以下のアセットをインライン化
	},
	server: {
		port: 3000,
		open: true,
	},
});
