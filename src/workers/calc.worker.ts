/// <reference lib="webworker" />

import { findCombinations, sort } from '../lib/calc';
import type {
  WorkerCalcCombinationsData,
  WorkerCommand,
  WorkerResult,
  WorkerSortData,
} from '../types';

addEventListener('message', (event: MessageEvent<WorkerCommand>) => {
  switch (event.data.action) {
    case 'findCombinations':
      postMessage({
        action: event.data.action,
        data: findCombinations(event.data.data as WorkerCalcCombinationsData, (count) => {
          postMessage({
            action: 'findCombinations',
            data: count,
            isUpdate: true,
          } satisfies WorkerResult);
        }),
        isUpdate: false,
      } satisfies WorkerResult);
      break;
    case 'sort':
      postMessage({
        action: event.data.action,
        data: sort(event.data.data as WorkerSortData),
        isUpdate: false,
      } satisfies WorkerResult);
      break;
    default:
      postMessage({
        action: 'sort',
        data: null,
        error: 'unknown action',
        isUpdate: false,
      } satisfies WorkerResult);
  }
});
