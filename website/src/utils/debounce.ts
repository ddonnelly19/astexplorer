export default function debounce<T extends (...args: any[]) => unknown>(f: T, timeout=100) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: unknown;

  return function(this: unknown, ...args: Parameters<T>) {
    lastThis = this;
    lastArgs = args;
    if (timer) {
      return;
    }
    timer = setTimeout(() => {
      timer = null;
      if (lastArgs) {
        f.apply(lastThis as ThisParameterType<T>, lastArgs);
      }
    }, timeout);
  };
}
