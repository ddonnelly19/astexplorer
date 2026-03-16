import defaultParserInterface from '../utils/defaultParserInterface';
const pkg = require('yaml/package.json') as {
  version: string;
  homepage?: string;
};

const ID = 'yaml';

type YamlNode = {
  type?: string;
  range?: [number, number];
  key?: {range: [number, number]};
  value?: {range: [number, number]};
};

type YamlModule = {
  parseAllDocuments(code: string, options?: Record<string, unknown>): unknown;
};

export default {
  ...defaultParserInterface,

  id: ID,
  displayName: ID,
  version: pkg.version,
  homepage: pkg.homepage,
  locationProps: new Set(['position']),

  loadParser(callback: (parser: YamlModule) => void) {
    (require as any)(['yaml'], callback);
  },

  nodeToRange(node: YamlNode) {
    if (node.range) {
      return node.range;
    }
    if (node.type === 'PAIR' && (node.key || node.value)) {
      if (node.key && node.value) {
        return [node.key.range[0], node.value.range[1]];
      } else if (node.key) {
        return node.key.range;
      } else {
        return node.value.range;
      }
    }
  },

  parse({parseAllDocuments}: YamlModule, code: string, options?: Record<string, unknown>) {
    return parseAllDocuments(code, options);
  },

  getDefaultOptions() {
    return {
      keepBlobsInJSON: true,
      keepCstNodes: false,
      keepNodeTypes: true,
      merge: false,
      mapAsMap: false,
      simpleKeys: false,
      maxAliasCount: 100,
      prettyErrors: true,
    };
  },
};
