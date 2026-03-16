import defaultParserInterface from '../utils/defaultParserInterface';
const pkg = require('@humanwhocodes/momoa/package.json') as {
  version: string;
  homepage?: string;
};

const ID = 'momoa';

type MomoaModule = {
  parse(code: string, options?: Record<string, unknown>): unknown;
};

export default {
  ...defaultParserInterface,

  id: ID,
  displayName: ID,
  version: pkg.version,
  homepage: pkg.homepage,
  locationProps: new Set(['loc']),

  loadParser(callback: (parser: MomoaModule) => void) {
    (require as any)(['@humanwhocodes/momoa'], callback);
  },

  parse(momoa: MomoaModule, code: string, options?: Record<string, unknown>) {
    return momoa.parse(code, options);
  },

  nodeToRange({loc}: {loc?: {start: {offset: number}; end: {offset: number}}}) {
    if (loc) {
      return [
        loc.start.offset,
        loc.end.offset,
      ];
    }
  },

  getDefaultOptions() {
    return {
      comments: true,
      tokens: true,
      ranges: true,
    };
  },

}
