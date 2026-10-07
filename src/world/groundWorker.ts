// Draws zone grounds off the main thread (see art/groundJob.ts).
import { GroundJob, runGroundJob } from '../art/groundJob';

self.onmessage = (e: MessageEvent<GroundJob>) => {
  const result = runGroundJob(e.data);
  (self as unknown as Worker).postMessage(result, [result.pixels.buffer]);
};
