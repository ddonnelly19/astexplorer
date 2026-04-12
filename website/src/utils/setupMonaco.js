/**
 * Setup Monaco Editor environment for web worker loading
 * This must be called before Monaco Editor is instantiated
 * 
 * The Monaco worker files are copied to the output directory by webpack
 */
export function setupMonacoEnvironment() {
	if (typeof globalThis !== 'undefined' && !globalThis.MonacoEnvironment) {
		globalThis.MonacoEnvironment = {
			getWorkerUrl: function(moduleId, label) {
				// Return the path to the worker file relative to the current location
				// The webpack plugin copies these files to: output/monaco-editor/esm/
				const basePath = getMonacoBasePath();
				const workerPath = getWorkerPath(moduleId);
				return basePath + workerPath;
			}
		};
	}
}

/**
 * Map Monaco module IDs to their worker file paths
 */
function getWorkerPath(moduleId) {
	const paths = {
		'vs/language/json/jsonWorker': 'vs/language/json/json.worker.js',
		'vs/language/css/cssWorker': 'vs/language/css/css.worker.js',
		'vs/language/html/htmlWorker': 'vs/language/html/html.worker.js',
		'vs/language/typescript/tsWorker': 'vs/language/typescript/ts.worker.js',
		'vs/editor/editor.worker': 'vs/editor/editor.worker.js',
	};
	
	return paths[moduleId] || paths['vs/editor/editor.worker'];
}

/**
 * Determine the base path for Monaco Editor assets
 * Returns the path to the monaco-editor/esm/ directory
 */
function getMonacoBasePath() {
	// Get the current script's directory or document base
	if (typeof window !== 'undefined' && window.location) {
		const currentPath = window.location.pathname;
		const basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
		return basePath + 'monaco-editor/esm/';
	}
	
	// Fallback to relative path
	return './monaco-editor/esm/';
}
