import type { WorkerCommand, WorkerResult } from '../types';

export type WorkerHandle = {
  terminate: () => void;
};

export function runWorker(
  command: WorkerCommand,
  onEvent: (result: WorkerResult) => boolean,
  onError: (message: string) => void,
): WorkerHandle {
  const worker = new Worker(new URL('../workers/calc.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent<WorkerResult>) => {
    if (onEvent(event.data)) {
      worker.terminate();
    }
  };
  worker.onerror = (error) => {
    onError(error.message || 'Calculation failed.');
    worker.terminate();
  };
  worker.postMessage(command);
  return { terminate: () => worker.terminate() };
}
