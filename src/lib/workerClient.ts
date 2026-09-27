import type { WorkerCommand, WorkerResult } from '../types';

export type WorkerHandle = {
  terminate: () => void;
};

function openCalcWorker(): Worker {
  return new Worker(new URL('../workers/calc.worker.ts', import.meta.url), { type: 'module' });
}

export function runWorker(
  command: WorkerCommand,
  onEvent: (result: WorkerResult) => boolean,
  onError: (message: string) => void,
): WorkerHandle {
  const worker = openCalcWorker();
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

/** One worker per command. `onEvent` returning true retires that worker only. */
export function runWorkerPool(
  commands: WorkerCommand[],
  onEvent: (index: number, result: WorkerResult) => boolean,
  onError: (message: string) => void,
): WorkerHandle {
  let stopped = false;
  const workers = commands.map(() => openCalcWorker());
  const terminate = () => {
    if (stopped) return;
    stopped = true;
    for (const worker of workers) worker.terminate();
  };
  workers.forEach((worker, index) => {
    worker.onmessage = (event: MessageEvent<WorkerResult>) => {
      if (stopped) return;
      if (onEvent(index, event.data)) worker.terminate();
    };
    worker.onerror = (error) => {
      if (stopped) return;
      terminate();
      onError(error.message || 'Calculation failed.');
    };
    worker.postMessage(commands[index]);
  });
  return { terminate };
}
