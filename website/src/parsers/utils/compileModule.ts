export default function compileModule(code: string, globals: Record<string, unknown> = {}) {
  const exports: Record<string, unknown> = {};
  const module = {exports};
  const globalNames = Object.keys(globals);
  const keys = ['module', 'exports', ...globalNames];
  const values = [module, exports, ...globalNames.map(key => globals[key])];
  new Function(keys.join(), code).apply(exports, values);
  return module.exports;
}
