const HtmlWebpackPlugin = require('html-webpack-plugin')
const InlineRuntimeHtmlPlugin = require('./src/shims/InlineRuntimeHtmlPlugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

const DEV = process.env.NODE_ENV !== 'production';
const CACHE_BREAKER = Number(fs.readFileSync(path.join(__dirname, 'CACHE_BREAKER')));
const ENABLE_HTML_PLUGIN = process.env.DISABLE_HTML_PLUGIN !== '1';
const ENABLE_INLINE_MANIFEST_PLUGIN = process.env.DISABLE_INLINE_MANIFEST_PLUGIN !== '1';

/**
 * @param {RegExp} resourceRegExp
 * @param {RegExp | undefined} [contextRegExp]
 */
function ignorePlugin(resourceRegExp, contextRegExp) {
	return new webpack.IgnorePlugin(
		contextRegExp ? { resourceRegExp, contextRegExp } : { resourceRegExp },
	)
};

/**
 * Custom plugin to copy Monaco Editor worker files to output directory
 */
class CopyMonacoWorkersPlugin {
	/**
	 * @param {import("webpack").Compiler} compiler
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap('CopyMonacoWorkersPlugin', compilation => {
			compilation.hooks.processAssets.tap(
				{
					name: 'CopyMonacoWorkersPlugin',
					stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
				},
				() => {
					const monacoPath = path.join(__dirname, 'node_modules', 'monaco-editor', 'esm');
					const workerFiles = [
						'vs/editor/editor.worker.js',
						'vs/language/json/json.worker.js',
						'vs/language/css/css.worker.js',
						'vs/language/html/html.worker.js',
						'vs/language/typescript/ts.worker.js',
					];

					for (const workerFile of workerFiles) {
						const sourcePath = path.join(monacoPath, workerFile);
						const destRelativePath = path.join('monaco-editor', 'esm', workerFile);

						try {
							if (fs.existsSync(sourcePath)) {
								const content = fs.readFileSync(sourcePath);
								compilation.emitAsset(
									destRelativePath,
									new webpack.sources.RawSource(content),
								);
							}
						} catch (error) {
							console.warn(`Warning: Could not copy Monaco worker file ${workerFile}:`, error.message);
						}
					}
				},
			);
		});
	}
}

const plugins = [
	new webpack.DefinePlugin({
		'process.env.API_HOST': JSON.stringify(process.env.API_HOST || ''),
	}),
	new webpack.ProvidePlugin({
		Buffer: [require.resolve('buffer/index.js'), 'Buffer'],
	}),
	new NodePolyfillPlugin({
		excludeAliases: ['buffer', 'Buffer'],
	}),
	ignorePlugin(/\.md$/),
	ignorePlugin(/node\/nodeLoader.js/),
	new webpack.NormalModuleReplacementPlugin(/^node:/, resource => {
		resource.request = resource.request.replace(/^node:/, '');
	}),
	// Usually babel-eslint tries to patch eslint, but we are using "parseNoPatch",
	// so that code patch will never be executed.
	ignorePlugin(/^eslint$/, /babel-eslint/),

	// Prettier //

	// We don't use these parsers with prettier, so we don't need to include them
	ignorePlugin(/parser-flow/, /\/prettier/),
	ignorePlugin(/parser-glimmer/, /\/prettier/),
	ignorePlugin(/parser-graphql/, /\/prettier/),
	ignorePlugin(/parser-markdown/, /\/prettier/),
	ignorePlugin(/parser-parse5/, /\/prettier/),
	ignorePlugin(/parser-postcss/, /\/prettier/),
	ignorePlugin(/parser-typescript/, /\/prettier/),
	ignorePlugin(/parser-vue/, /\/prettier/),
	ignorePlugin(/parser-yaml/, /\/prettier/),

	// go //
	new webpack.NormalModuleReplacementPlugin(
		/^go$/,
		require.resolve('astexplorer-go/go'),
	),

	// eslint //

	// Shim ESLint stuff that's only relevant for Node.js
	new webpack.NormalModuleReplacementPlugin(
		/cli-engine/,
		'node-libs-browser/mock/empty',
	),
	new webpack.NormalModuleReplacementPlugin(
		/load-rules/,
		__dirname + '/src/parsers/js/transformers/eslint1/loadRulesShim.js',
	),

	// More shims

	// Doesn't look like jest-validate is useful in our case (prettier uses it)
	new webpack.NormalModuleReplacementPlugin(
		/jest-validate/,
		__dirname + '/src/shims/jest-validate.js',
	),

	// Hack to disable Webpack dynamic requires in ESLint, so we don't end up
	// bundling the entire ESLint directory including files we don't even need.
	// https://github.com/webpack/webpack/issues/198
	new webpack.ContextReplacementPlugin(/eslint/, /NEVER_MATCH^/),

	new MiniCssExtractPlugin({
		filename: DEV ? '[name].css' : `[name]-[contenthash]-${CACHE_BREAKER}.css`,
	}),

	// Copy Monaco Editor worker files
	new CopyMonacoWorkersPlugin(),

	...(ENABLE_HTML_PLUGIN ? [
		new HtmlWebpackPlugin({
			favicon: './favicon.png',
			inject: 'body',
			filename: 'index.html',
			template: './index.ejs',
		}),
	] : []),

	// Inline the runtime chunk into HTML to avoid an extra request.
	...(ENABLE_INLINE_MANIFEST_PLUGIN ? [
		new InlineRuntimeHtmlPlugin(),
	] : []),
	new webpack.ProgressPlugin({
		modules: false,
		activeModules: false,
		profile: false,
	}),
];

module.exports = Object.assign({
	experiments: {
		asyncWebAssembly: true,
	},

	optimization: {
		minimize: false, // Disabled: TerserPlugin causes OOM in production build (see webpack5-migration notes)
		minimizer: [
			new TerserPlugin({
				// Avoid worker fan-out in constrained environments.
				parallel: false,
				terserOptions: {
					compress: false,
					mangle: true,
					keep_fnames: true,
				},
			}),
		],
		moduleIds: DEV ? 'named' : 'deterministic',
		runtimeChunk: 'single',
		splitChunks: {
			chunks: 'initial',
			maxAsyncRequests: 5,
			cacheGroups: {
				parsers: {
					priority: 10,
					test: /\/src\/parsers\/|\/package\.json$/,
				},
				vendors: {
					test: /\/node_modules\//,
				},
			},
		},
	},

	module: {
		rules: [
			{
				test: /\.m?js$/,
				resolve: {
					fullySpecified: false,
				},
			},
			{
				test: /\.js$/,
				include: [
					path.join(__dirname, 'node_modules', 'tslint', 'lib'),
					path.join(__dirname, 'node_modules', 'babel5'),
					path.join(__dirname, 'node_modules', 'babel6'),
					path.join(__dirname, 'node_modules', 'babel-core'),
					path.join(__dirname, 'node_modules', '@glimmer', 'compiler', 'dist'),
					path.join(__dirname, 'node_modules', 'babel-plugin-macros', 'dist'),
					path.join(__dirname, 'node_modules', 'import-fresh'),
					path.join(__dirname, 'node_modules', 'try-resolve'),
				],
				parser: {
					exprContextCritical: false,
					unknownContextCritical: false,
					wrappedContextCritical: false,
				},
			},
			{
				test: [
					/\.d\.ts$/,
				],
				use: 'null-loader',
			},
			// Without this rule weback is loading the ESM version of esquery, which
			// causes an error since eslint uses `require('esquery')` (not
			// `require('esquery').default`) to load the module.
			{
				issuer: /eslint4/,
				resolve: {
					alias: {
						'esquery': 'esquery/dist/esquery.min.js',
					},
				},
			},
			{
				issuer: /eslint8/,
				resolve: {
					mainFields: ["browser", "main", "module"]
				},
			},
			{
				test: [
					/\/CLIEngine/,
					/\/globby/,
				],
				issuer: /\/@typescript-eslint\//,
				use: 'null-loader',
			},
			{
				test: /\.txt$/,
				exclude: /node_modules/,
				loader: 'raw-loader',
			},
			// @swc/wasm-web uses a build target assumes to run _without_ bundler, in result
			// contains incompatible syntax to webpack@4 (import.meta.url).
			// in here, augment import.meta with custom loader, also provides path to wasm binary
			// for its initializer to correctly import wasm binary.
			{
				test: /\wasm.js$/,
				include: [
					path.join(__dirname, 'node_modules', '@swc', 'wasm-web'),
				],
				loader: require.resolve('@open-wc/webpack-import-meta-loader'),
			},
			{
				test: /\.js$/,
				include: [
					path.join(__dirname, 'node_modules', 'monaco-editor', 'esm'),
				],
				loader: require.resolve('@open-wc/webpack-import-meta-loader'),
			},
			{
				test: /astexplorer_syn\.js$/,
				include: [
					path.join(__dirname, 'node_modules', 'astexplorer-syn'),
				],
				loader: require.resolve('@open-wc/webpack-import-meta-loader'),
			},
			{
				test: /.wasm$/,
				type: 'webassembly/async',
				include: [
					path.join(__dirname, 'node_modules', '@gengjiawen', 'monkey-wasm'),
					path.join(__dirname, 'node_modules', 'astexplorer-go'),
				],
			},
			{
				test: /.wasm$/,
				type: "javascript/auto",
				include: [
					path.join(__dirname, 'node_modules', '@swc', 'wasm-web'),
					path.join(__dirname, 'node_modules', 'astexplorer-syn'),
				],
				loader: "file-loader"
			},
			// This rule is needed to make sure *.mjs files in node_modules are
			// interpreted as modules.
			{
				test: /\.mjs$/,
				include: /node_modules/,
				type: 'javascript/auto',
			},
			{
				test: /\.([jt]sx?|mjs)$/,
				type: 'javascript/auto',
				include: [
					// To transpile our version of acorn as well as the one that
					// espree uses (somewhere in its dependency tree)
					/\/acorn.es.js$/,
					/\/acorn.mjs$/,
					/\/acorn-loose.mjs$/,
					path.join(__dirname, 'node_modules', '@glimmer', 'compiler', 'dist'),
					path.join(__dirname, 'node_modules', '@glimmer', 'syntax', 'dist'),
					path.join(__dirname, 'node_modules', '@glimmer', 'util', 'dist'),
					path.join(__dirname, 'node_modules', '@glimmer', 'wire-format', 'dist'),
					path.join(__dirname, 'node_modules', 'ast-types'),
					path.join(__dirname, 'node_modules', '@babel/eslint-parser'),
					path.join(__dirname, 'node_modules', 'babel-eslint'),
					path.join(__dirname, 'node_modules', 'babel-eslint8'),
					path.join(__dirname, 'node_modules', 'jsesc'),
					path.join(__dirname, 'node_modules', 'eslint-visitor-keys'),
					path.join(__dirname, 'node_modules', 'babel7'),
					path.join(__dirname, 'node_modules', 'babel-plugin-macros'),
					path.join(__dirname, 'node_modules', 'css-tree'),
					path.join(__dirname, 'node_modules', 'chevrotain'),
					path.join(__dirname, 'node_modules', 'chevrotain-allstar'),
					path.join(__dirname, 'node_modules', '@chevrotain', 'cst-dts-gen'),
					path.join(__dirname, 'node_modules', '@chevrotain', 'gast'),
					path.join(__dirname, 'node_modules', '@chevrotain', 'regexp-to-ast'),
					path.join(__dirname, 'node_modules', '@chevrotain', 'utils'),
					path.join(__dirname, 'node_modules', 'json-parse-better-errors'),
					path.join(__dirname, 'node_modules', 'java-parser'),
					path.join(__dirname, 'node_modules', 'babylon7'),
					path.join(__dirname, 'node_modules', 'eslint', 'lib'),
					path.join(__dirname, 'node_modules', 'eslint-scope'),
					path.join(__dirname, 'node_modules', 'eslint-visitor-keys'),
					path.join(__dirname, 'node_modules', 'eslint3'),
					path.join(__dirname, 'node_modules', 'eslint4'),
					path.join(__dirname, 'node_modules', 'jscodeshift', 'src'),
					path.join(__dirname, 'node_modules', 'lodash-es'),
					path.join(__dirname, 'node_modules', 'prettier'),
					path.join(__dirname, 'node_modules', 'meriyah'),
					path.join(__dirname, 'node_modules', 'monaco-editor'),
					path.join(__dirname, 'node_modules', 'astexplorer-syn'),
					path.join(__dirname, 'node_modules', 'react-redux', 'es'),
					path.join(__dirname, 'node_modules', 'recast'),
					path.join(__dirname, 'node_modules', 'redux', 'es'),
					path.join(__dirname, 'node_modules', 'regexp-tree'),
					path.join(__dirname, 'node_modules', 'regjsparser'),
					path.join(__dirname, 'node_modules', 'regexpp'),
					path.join(__dirname, 'node_modules', 'simple-html-tokenizer'),
					path.join(__dirname, 'node_modules', 'symbol-observable', 'es'),
					path.join(__dirname, 'node_modules', '@swc', 'wasm-web'),
					path.join(__dirname, 'node_modules', 'typescript-eslint-parser'),
					path.join(__dirname, 'node_modules', 'webidl2'),
					path.join(__dirname, 'node_modules', 'tslint'),
					path.join(__dirname, 'node_modules', 'tslib'),
					path.join(__dirname, 'node_modules', 'svelte'),
					path.join(__dirname, 'src'),
				],
				loader: 'babel-loader',
				options: {
					babelrc: false,
					presets: [
						[
							require.resolve('@babel/preset-env'),
							{
								targets: {
									browsers: ['defaults'],
								},
								modules: 'commonjs',
								forceAllTransforms: true,
							},
						],
						require.resolve('@babel/preset-typescript'),
						require.resolve('@babel/preset-react'),
					],
					plugins: [
						require.resolve('@babel/plugin-proposal-class-properties'),
						require.resolve('@babel/plugin-transform-class-static-block'),
						require.resolve('@babel/plugin-transform-optional-chaining'),
						require.resolve('@babel/plugin-transform-nullish-coalescing-operator'),
						require.resolve('@babel/plugin-transform-logical-assignment-operators'),
						require.resolve('@babel/plugin-transform-private-methods'),
						require.resolve('@babel/plugin-transform-private-property-in-object'),
						require.resolve('@babel/plugin-transform-numeric-separator'),
						require.resolve('@babel/plugin-transform-runtime'),
					],
				},
			},
			{
				test: /\.css$/,
				use: [
					DEV ? 'style-loader' : MiniCssExtractPlugin.loader,
					{
						loader: 'css-loader',
						options: { importLoaders: 1 },
					},
					'postcss-loader',
				],
			},
			{
				test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
				loader: 'url-loader',
				options: {
					limit: 10000,
					mimetype: 'application/font-woff',
				},
			},
			{
				test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
				loader: 'file-loader',
			},
		],

		noParse: [
			/traceur\/bin/,
			/typescript\/lib/,
			/esprima\/dist\/esprima\.js/,
			/esprima-fb\/esprima\.js/,
			// This is necessary because flow is trying to load the 'fs' module, but
			// dynamically. Without this webpack will throw an error at runtime.
			// I assume the `require(...)` call "succeeds" because 'fs' is shimmed to
			// be empty below.
			/flow-parser\/flow_parser\.js/,
		],
	},

	plugins: plugins,

	resolve: {
		alias: {
			'@chevrotain/cst-dts-gen$': path.join(__dirname, 'node_modules', '@chevrotain', 'cst-dts-gen', 'lib', 'src', 'api.js'),
			'@chevrotain/gast$': path.join(__dirname, 'node_modules', '@chevrotain', 'gast', 'lib', 'src', 'api.js'),
			'@chevrotain/regexp-to-ast$': path.join(__dirname, 'node_modules', '@chevrotain', 'regexp-to-ast', 'lib', 'src', 'api.js'),
			'@chevrotain/utils$': path.join(__dirname, 'node_modules', '@chevrotain', 'utils', 'lib', 'src', 'api.js'),
			'chevrotain$': path.join(__dirname, 'node_modules', 'chevrotain', 'lib', 'src', 'api.js'),
			'chevrotain-allstar$': path.join(__dirname, 'node_modules', 'chevrotain-allstar', 'lib', 'index.js'),
			buffer$: require.resolve('buffer/index.js'),
			'eslint8/lib/linter$': path.join(__dirname, 'node_modules', 'eslint8', 'lib', 'linter', 'index.js'),
			'eslint8/lib/source-code$': path.join(__dirname, 'node_modules', 'eslint8', 'lib', 'source-code', 'index.js'),
			'eslint8/package.json$': path.join(__dirname, 'node_modules', 'eslint8', 'package.json'),
			gojs: path.join(__dirname, 'node_modules', 'astexplorer-go', 'go.js'),
			'java-parser$': path.join(__dirname, 'node_modules', 'java-parser', 'src', 'index.js'),
			'java-parser/package.json$': path.join(__dirname, 'node_modules', 'java-parser', 'package.json'),
			'meriyah$': path.join(__dirname, 'node_modules', 'meriyah', 'dist', 'meriyah.umd.es5.js'),
			'meriyah/package.json$': path.join(__dirname, 'node_modules', 'meriyah', 'package.json'),
		},
		fallback: {
			buffer: require.resolve('buffer/index.js'),
			child_process: false,
			fs: false,
			'fs/promises': false,
			module: false,
			net: false,
			os: false,
			perf_hooks: false,
			readline: false,
			tty: false,
			v8: false,
			vm: false,
			worker_threads: false,
		},
		extensions: ['.ts', '.tsx', '.mjs', '.js', '.jsx', '.json'],
	},

	entry: {
		app: './src/app.js',
	},

	output: {
		path: path.resolve(__dirname, '../out'),
		filename: DEV ? '[name].js' : `[name]-[contenthash]-${CACHE_BREAKER}.js`,
		chunkFilename: DEV ? '[name].js' : `[name]-[contenthash]-${CACHE_BREAKER}.js`,
	},
},

	DEV ?
		{
			devtool: 'eval',
		} :
		{},
);
