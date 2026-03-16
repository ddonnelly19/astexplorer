const pkg = require('mathjs/package.json') as {version: string};

import defaultParserInterface from '../utils/defaultParserInterface'

const ID = 'mathjs'

type MathJsModule = {
  parse(code: string): unknown;
};

export default {
  ...defaultParserInterface,

  id: ID,
  displayName: ID,
  version: pkg.version,
  homepage: 'https://mathjs.org/',
  locationProps: new Set(['span']),

  defaultParserID: 'mathjs',

  async loadParser(callback: (parser: MathJsModule) => void) {
    (require as any)(['mathjs'], callback);
  },

  parse(parser: MathJsModule, code: string) {
    try {
      return parser.parse(code)
    } catch (message) {
      // AST Explorer expects the thrown error to be an object, not a string.
      throw new SyntaxError(message);
    }
  },

  getNodeName(node: {type?: string}) {
    return node.type
  },

  // TODO once this feature is added to mathjs
  // nodeToRange(node) {
  // },

  opensByDefault(node: {type?: string}) {
    return node.type === 'BlockNode'
  },
}
