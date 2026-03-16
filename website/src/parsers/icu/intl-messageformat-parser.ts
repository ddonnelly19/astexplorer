import defaultParserInterface from '../utils/defaultParserInterface';
const pkg = require('intl-messageformat-parser/package.json') as {
  version: string;
  homepage?: string;
};

const ID = 'intl-messageformat-parser';
const TYPES: Record<string, string> = {};

type IntlMessageFormatModule = {
  TYPE: Record<string, string>;
  parse(code: string, opts?: Record<string, unknown>): unknown;
};

export const parserSettingsConfiguration = {
  fields: [
    'captureLocation',
    'ignoreTag',
    'normalizeHashtagInPlural',
    'shouldParseSkeletons',
  ],
};

const defaultOptions = {
  captureLocation: true,
  normalizeHashtagInPlural: true,
};

export default {
  ...defaultParserInterface,

  id: ID,
  displayName: ID,
  version: pkg.version,
  homepage:
    pkg.homepage || 'https://formatjs.io/docs/intl-messageformat-parser/',
  locationProps: new Set(['location']),

  loadParser(callback: (all: IntlMessageFormatModule) => void) {
    (require as any)(['intl-messageformat-parser'], (all: IntlMessageFormatModule) => {
      Object.keys(all.TYPE).forEach((k) => {
        TYPES[k] = all.TYPE[k];
      });
      callback(all);
    });
  },

  parse(parser: IntlMessageFormatModule, code: string, opts?: Record<string, unknown>) {
    return parser.parse(code, opts);
  },

  _getSettingsConfiguration() {
    return parserSettingsConfiguration;
  },

  getDefaultOptions() {
    return defaultOptions;
  },

  getNodeName(node: {type?: string | number}) {
    return node.type != null && TYPES[String(node.type)];
  },

  nodeToRange({location}: {location?: {start?: {offset: number}; end?: {offset: number}}}) {
    if (location && location.start && location.end) {
      return [location.start.offset, location.end.offset];
    }
  },
};
