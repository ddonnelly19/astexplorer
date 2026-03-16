type ClassConfig = string | Record<string, unknown>;

export default function cx(...configs: ClassConfig[]): string {
  return configs.map(
    config => typeof config === 'string' ?
      config :
      Object.keys(config).filter(k => Boolean(config[k])).join(' '),
  ).join(' ');
}
