import defaultParserInterface from '../utils/defaultParserInterface';
const pkg = require('json-to-ast/package.json') as {
  version: string;
  homepage?: string;
};

const ID = 'jsonToAst';

type JsonToAstParser = (code: string) => unknown;

export default {
  ...defaultParserInterface,

  id: ID,
  displayName: ID,
  version: pkg.version,
  homepage: pkg.homepage,
  locationProps: new Set(['loc']),

  loadParser(callback: (parser: JsonToAstParser) => void) {
    (require as any)(['json-to-ast'], callback);
  },

  parse(jsonToAst: JsonToAstParser, code: string) {
    return jsonToAst(code);
  },

  nodeToRange({loc}: {loc?: {start: {offset: number}; end: {offset: number}}}) {
    if (loc) {
      return [
        loc.start.offset,
        loc.end.offset,
      ];
    }
  },
}
