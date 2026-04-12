const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

class InlineRuntimeHtmlPlugin {
  /**
	 * @param {import("webpack").Compiler} compiler
	 */
  apply(compiler) {
    compiler.hooks.compilation.tap('InlineRuntimeHtmlPlugin', compilation => {
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tap(
        'InlineRuntimeHtmlPlugin',
        data => {
          data.assetTags.scripts = data.assetTags.scripts.map(tag => {
            const src = tag && tag.attributes && tag.attributes.src;
            if (!src) {
              return tag;
            }

            const assetName = path.basename(`${src}`.split('?')[0]);
            if (!/^runtime(?:[-.].+)?\.js$/.test(assetName)) {
              return tag;
            }

            const asset = compilation.getAsset(assetName);
            if (!asset) {
              return tag;
            }

            return {
              tagName: 'script',
              voidTag: false,
              meta: tag.meta,
              attributes: {type: 'text/javascript'},
              innerHTML: asset.source.source().toString(),
            };
          });

          return data;
        },
      );
    });
  }
}

module.exports = InlineRuntimeHtmlPlugin;
