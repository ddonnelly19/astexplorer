import defaultParserInterface from '../utils/defaultParserInterface';
const pkg = require('lucene/package.json') as {
  version: string;
  homepage?: string;
};

const ID = 'lucene';

type LuceneModule = {
  parse(code: string): unknown;
};

type OffsetLocation = {
  start: {offset: number};
  end: {offset: number};
};

type LuceneNode = {
  location?: OffsetLocation;
  fieldLocation?: OffsetLocation;
  termLocation?: OffsetLocation;
};

export default {
  ...defaultParserInterface,

  id: ID,
  displayName: ID,
  version: pkg.version,
  homepage: pkg.homepage,
  locationProps: new Set(['fieldLocation', 'termLocation', 'location']),

  loadParser(callback: (parser: LuceneModule) => void) {
    (require as any)(['lucene'], callback);
  },

  parse({parse}: LuceneModule, code: string) {
    return parse(code);
  },

  nodeToRange(node: LuceneNode) {
    const start: number[] = [];
    const end: number[] = [];

    if (node.location) {
      start.push(node.location.start.offset);
      end.push(node.location.end.offset);
    }
    if (node.fieldLocation) {
      start.push(node.fieldLocation.start.offset);
      end.push(node.fieldLocation.end.offset);
    }
    if (node.termLocation) {
      start.push(node.termLocation.start.offset);
      end.push(node.termLocation.end.offset);
    }

    if (start.length === 0 || end.length === 0) {
      return;
    }

    return [start.reduce((a, b) => Math.min(a, b)), end.reduce((a, b) => Math.max(a, b))];
  },

  getDefaultOptions() {
    return {};
  },

};
