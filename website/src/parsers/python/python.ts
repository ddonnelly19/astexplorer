import defaultParserInterface from '../utils/defaultParserInterface';
const pkg = require('filbert/package.json') as {
  version: string;
  homepage?: string;
};

const ID = 'python';

type FilbertParser = {
  parse(code: string, options: {locations: boolean; ranges: boolean}): unknown;
};

type ParserModule = {
  parser: FilbertParser;
};

export default {
  ...defaultParserInterface,

  id: ID,
  displayName: ID,
  version: pkg.version,
  homepage: pkg.homepage || 'https://github.com/differentmatt/filbert',
  locationProps: new Set(['range', 'loc', 'start', 'end']),

  loadParser(callback: (module: ParserModule) => void) {
    (require as any)(['filbert'], (parser: FilbertParser) => {
      callback({ parser });
    });
  },

  parse({parser}: ParserModule, code: string) {
    return parser.parse(code, {
        locations: true,
        ranges: true,
    });
  },

  opensByDefault(_node: unknown, key: string) {
    switch (key) {
      case 'block':
      case 'nodes':
        return true;
    }
  },

  nodeToRange(node: {range?: unknown}) {
    const {range} = node;
    if (typeof range === 'object') {
      return range as [number, number];
    }
  },

};
