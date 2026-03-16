const localRequire = (require as any).context(
  './',
  true,
  /^\.\/(?!utils|transpilers)[^/]+\/(transformers\/([^/]+)\/)?(codeExample\.txt|[^/]+?\.(js|ts|tsx))$/,
);
const requireKeys = new Set(localRequire.keys());

function resolveModulePath(basePath: string): string {
  for (const extension of ['.ts', '.tsx', '.js']) {
    const path = `${basePath}${extension}`;
    if (requireKeys.has(path)) {
      return path;
    }
  }
  throw new Error(`Unable to resolve module path: ${basePath}`);
}

function interopRequire(module: any) {
  return module.__esModule ? module.default : module;
}

const files =
  localRequire.keys()
  .map((name: string) => name.split('/').slice(1));

const categoryByID: Record<string, any> = {};
const parserByID: Record<string, any> = {};
const transformerByID: Record<string, any> = {};

const restrictedParserNames = new Set([
  'index.js',
  'index.ts',
  'index.tsx',
  'codeExample.txt',
  'transformers',
  'utils',
]);

export const categories =
  files
  .filter(name => /^index\.(js|ts|tsx)$/.test(name[1]))
  .map(([catName]) => {
    const categoryPath = resolveModulePath(`./${catName}/index`);
    const category = localRequire(categoryPath);

    categoryByID[category.id] = category;

    category.codeExample = interopRequire(localRequire(`./${catName}/codeExample.txt`))

    let catFiles =
      files
      .filter(([curCatName]) => curCatName === catName)
      .map(name => name.slice(1));

    category.parsers =
      catFiles
      .filter(([parserName]) => !restrictedParserNames.has(parserName))
      .map(([parserName]) => {
        let parser = interopRequire(localRequire(`./${catName}/${parserName}`));
        parserByID[parser.id] = parser;
        parser.category = category;
        return parser;
      });

    category.transformers =
      catFiles
      .filter(([dirName, , fileName]) => dirName === 'transformers' && /^index\.(js|ts|tsx)$/.test(fileName))
      .map(([, transformerName]) => {
        const transformerDir = `./${catName}/transformers/${transformerName}`;
        const transformer = interopRequire(localRequire(resolveModulePath(`${transformerDir}/index`)));
        transformerByID[transformer.id] = transformer;
        transformer.defaultTransform = interopRequire(localRequire(`${transformerDir}/codeExample.txt`));
        return transformer;
      });

    return category;
  });

export function getDefaultCategory() {
  return categoryByID.javascript;
}

export function getDefaultParser(category = getDefaultCategory()) {
  return category.parsers.filter(p => p.showInMenu)[0];
}

export function getCategoryByID(id) {
  return categoryByID[id];
}

export function getParserByID(id) {
  return parserByID[id];
}

export function getTransformerByID(id) {
  return transformerByID[id];
}
