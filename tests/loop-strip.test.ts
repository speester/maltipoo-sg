import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrapPos } from '../src/scripts/loop-strip.ts';

test('wrapPos keeps a position inside one period', () => {
  assert.equal(wrapPos(0, 100), 0);
  assert.equal(wrapPos(99, 100), 99);
  assert.equal(wrapPos(100, 100), 0);
  assert.equal(wrapPos(250, 100), 50);
});

test('wrapPos brings a negative position back into the period, so a drag past the start keeps looping', () => {
  assert.equal(wrapPos(-1, 100), 99);
  assert.equal(wrapPos(-150, 100), 50);
});

test('wrapPos gives zero before the track has a width', () => {
  assert.equal(wrapPos(12, 0), 0);
});
