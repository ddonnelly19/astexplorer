import * as React from 'react';
import defaultParserInterface from '../utils/defaultParserInterface';
const pkg = require('remark/package.json') as {
  version: string;
  homepage?: string;
};

const ID = 'remark';

type RemarkModule = {
  remark: () => {
    use(plugins: unknown[]): {parse(code: string): unknown};
  };
};

type PluginModule = {default: unknown};

export default {
  ...defaultParserInterface,

  id: ID,
  displayName: ID,
  version: pkg.version,
  homepage: pkg.homepage,
  locationProps: new Set(['position']),

  loadParser(
    callback: (modules: {
      remark: RemarkModule['remark'];
      gfm: unknown;
      directive: unknown;
      footnotes: unknown;
      frontmatter: unknown;
      math: unknown;
    }) => void,
  ) {
    (require as any)([
      'remark',
      'remark-gfm',
      'remark-directive',
      'remark-footnotes',
      'remark-frontmatter',
      'remark-math',
    ], (
      {remark}: RemarkModule,
      {default: gfm}: PluginModule,
      {default: directive}: PluginModule,
      {default: footnotes}: PluginModule,
      {default: frontmatter}: PluginModule,
      {default: math}: PluginModule,
    ) => callback({ remark, gfm, directive, footnotes, frontmatter, math }));
  },

  parse(
    { remark, gfm, directive, footnotes, frontmatter, math },
    code: string,
    options: Record<string, boolean>,
  ) {
    const plugins = [
      options['remark-gfm'] ? gfm : false,
      options['remark-directive'] ? directive : false,
      options['remark-footnotes'] ? footnotes : false,
      options['remark-frontmatter'] ? [frontmatter, ['yaml', 'toml']] : false,
      options['remark-math'] ? math : false,
    ].filter((plugin) => plugin !== false);
    return remark().use(plugins).parse(code);
  },

  nodeToRange({position}: {position?: {start: {offset: number}; end: {offset: number}}}) {
    if (position) {
      return [position.start.offset, position.end.offset];
    }
  },

  opensByDefault(_node: unknown, key: string) {
    return key === 'children';
  },

  getDefaultOptions() {
    return {
      'remark-directive': false,
      'remark-footnotes': false,
      'remark-frontmatter': false,
      'remark-gfm': false,
      'remark-math': false,
    };
  },

  renderSettings(parserSettings: Record<string, boolean>, onChange: (settings: Record<string, boolean>) => void) {
    return (
      <div>
        <p>
          remark is extended through{' '}
          <a
            href="https://github.com/remarkjs/remark/blob/HEAD/doc/plugins.md"
            target="_blank"
            rel="noreferrer noopener"
          >
            plugins
          </a>
        </p>
        {defaultParserInterface.renderSettings.call(
          this,
          parserSettings,
          onChange,
        )}
      </div>
    );
  },
};
