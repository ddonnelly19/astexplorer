import defaultParserInterface from '../utils/defaultParserInterface';
const pkg = require('yaml-ast-parser/package.json') as {
  version: string;
  homepage?: string;
};

const ID = 'yaml-ast-parser';
let Kind: Record<string, string> | null = null;

type YamlAstNode = {
  kind?: string | number;
  startPosition?: number;
  endPosition?: number;
};

type YamlAstModule = {
  Kind: Record<string, string>;
  load(code: string): unknown;
};

export default {
  ...defaultParserInterface,

  id: ID,
  displayName: ID,
  version: pkg.version,
  homepage: pkg.homepage || 'https://www.npmjs.com/package/yaml-ast-parser',

  _ignoredProperties: new Set(['parent', 'errors']),
  locationProps: new Set(['startPosition', 'endPosition']),
  typeProps: new Set(['kind']),

  nodeToRange(node: YamlAstNode) {
    if (typeof node.startPosition === 'number') {
      return [node.startPosition, node.endPosition];
    }
  },

  getNodeName(node: YamlAstNode) {
    return Kind && node.kind != null ? Kind[String(node.kind)] : undefined;
  },

  loadParser(callback: (parser: YamlAstModule) => void) {
    (require as any)(['yaml-ast-parser'], function(yamlAstParser: YamlAstModule) {
      Kind = yamlAstParser.Kind;
      callback(yamlAstParser);
    });
  },

  parse({load}: YamlAstModule, code: string) {
    return load(code);
  },
};
