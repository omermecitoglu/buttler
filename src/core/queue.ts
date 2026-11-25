import { getSharedState } from "./shared-state";

/** Returns a function that runs the given tasks one after another. A task that fails doesn't affect the next ones. */
export function createQueue(name: string) {
  const queue = getSharedState(name, () => ({ tail: Promise.resolve() }));
  return <T>(task: () => Promise<T>): Promise<T> => {
    const result = queue.tail.then(task);
    queue.tail = result.then(() => undefined, () => undefined);
    return result;
  };
}
