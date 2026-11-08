// Native camera calls share one plugin instance. Serializing them ensures a stop
// requested during a permission prompt happens before a subsequent start.
export function createCameraOperationQueue() {
  let pending: Promise<unknown> = Promise.resolve();

  return function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = pending.then(operation);
    pending = next.catch(() => undefined);
    return next;
  };
}
