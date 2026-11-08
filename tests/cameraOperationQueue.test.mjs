import test from 'node:test';
import assert from 'node:assert/strict';
import { createCameraOperationQueue } from '../src/services/cameraOperationQueue.ts';

test('a stop requested during a pending native start runs before a later start', async () => {
  const queue = createCameraOperationQueue();
  const events = [];
  let release;
  const permission = new Promise(resolve => { release = resolve; });
  const first = queue(async () => { events.push('start 1'); await permission; events.push('started 1'); });
  const stop = queue(async () => { events.push('stop 1'); });
  const second = queue(async () => { events.push('start 2'); });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(events, ['start 1']);
  release();
  await Promise.all([first, stop, second]);
  assert.deepEqual(events, ['start 1', 'started 1', 'stop 1', 'start 2']);
});

test('a rejected camera operation does not prevent later cleanup', async () => {
  const queue = createCameraOperationQueue();
  const failed = queue(async () => { throw new Error('denied'); });
  let stopped = false;
  const stop = queue(async () => { stopped = true; });
  await assert.rejects(failed, /denied/);
  await stop;
  assert.equal(stopped, true);
});
