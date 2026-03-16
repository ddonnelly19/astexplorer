import compileModule from '../../../utils/compileModule';
const pkg = require('remark/package.json') as {
  version: string;
  homepage?: string;
};

const ID = 'remark';

type RemarkTransformerModule = {
  remark: () => {
    use(plugin: unknown): {
      processSync(code: string): {value: string};
    };
  };
};

type NamedModule = {is?: unknown; visit?: unknown; visitParents?: unknown};

export default {
  id: ID,
  displayName: ID,
  version: pkg.version,
  homepage: pkg.homepage,

  defaultParserID: ID,

  loadTransformer(callback: (modules: Record<string, unknown>) => void) {
    (require as any)([
      'remark',
      'unist-util-is',
      'unist-util-visit',
      'unist-util-visit-parents',
    ], ({remark}: RemarkTransformerModule, {is}: NamedModule, {visit}: NamedModule, {visitParents}: NamedModule) => {
      callback({
        remark,
        'unist-util-is': is,
        'unist-util-visit': visit,
        'unist-util-visit-parents': visitParents,
      });
    });
  },

  transform({remark, ...availableModules}: Record<string, any>, transformCode: string, code: string) {
    function sandboxRequire(name: string) {
      if (!Object.getOwnPropertyNames(availableModules).includes(name))
        throw new Error(`Cannot find module '${name}'`);
      return availableModules[name];
    }

    const transform = compileModule(transformCode, { require: sandboxRequire });
    return remark().use(transform).processSync(code).value;
  },
};
