type Handler = (data: unknown) => void;

const subscribers: Record<string, Handler[]> = {};

export function subscribe(topic: string, handler: Handler): () => void {
  let handlers = subscribers[topic];
  if (!handlers) {
    handlers = subscribers[topic] = [];
  }
  if (handlers.indexOf(handler) === -1) {
    handlers.push(handler);
  }

  return () => {
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  };
}

export function publish(topic: string, data?: unknown): void {
  if (subscribers[topic]) {
    setTimeout(function callSubscribers() {
      if (subscribers[topic]) {
        const handlers = subscribers[topic];
        for (let i = 0; i < handlers.length; i++) {
          handlers[i](data);
        }
      }
    }, 0);
  }
}

export function clear(unsubscribers: Array<() => unknown>): void {
  unsubscribers.forEach(call);
}

function call(f: () => unknown): unknown {
  return f();
}
