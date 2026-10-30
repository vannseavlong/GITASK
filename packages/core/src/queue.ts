/**
 * Run async jobs one at a time, in the order they were queued. Hosts use one queue for all
 * write handlers so two quick messages never read-modify-write the same file at once.
 * A failing job does not stop the jobs behind it.
 */
export function serialQueue(): <T>(job: () => Promise<T>) => Promise<T> {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(job: () => Promise<T>): Promise<T> => {
    const run = tail.then(job, job);
    tail = run.catch(() => undefined);
    return run;
  };
}
