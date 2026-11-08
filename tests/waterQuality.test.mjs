import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyWaterPixels, waterQualityService } from '../src/services/waterQualityService.ts';

const pixel = (r, g, b, a = 255) => new Uint8ClampedArray([r, g, b, a]);

test('the offline RGB heuristic distinguishes green, brown, grey, dark and bright neutral samples', () => {
  const cases = [
    [pixel(40, 150, 55), 'algae'],
    [pixel(150, 100, 55), 'turbid'],
    [pixel(170, 170, 170), 'turbid'],
    [pixel(45, 45, 45), 'turbid'],
    [pixel(225, 230, 225), 'clean'],
    [pixel(230, 120, 240), 'unknown'],
  ];
  for (const [rgba, expected] of cases) assert.equal(classifyWaterPixels(rgba), expected);
});

test('classification averages visible pixels and rejects missing or transparent data', () => {
  assert.equal(classifyWaterPixels(new Uint8ClampedArray([
    220, 220, 220, 255, 240, 240, 240, 255, 0, 150, 0, 0,
  ])), 'clean');
  assert.throws(() => classifyWaterPixels(new Uint8ClampedArray()), /pixels/);
  assert.throws(() => classifyWaterPixels(pixel(250, 250, 250, 0)), /visible/);
});

test('manual examples contain bilingual guidance without claiming visual clarity proves safety', () => {
  const clean = waterQualityService.getCleanBoreholeResult();
  const turbid = waterQualityService.getTurbidRiverResult();
  const algae = waterQualityService.getAlgaeWaterResult();
  assert.equal(clean.status, 'clean');
  assert.match(clean.advice, /germs or chemicals/i);
  assert.match(clean.adviceHausa, /ƙwayoyin cuta/i);
  assert.equal(turbid.status, 'not_clean');
  assert.match(turbid.advice, /boil/i);
  assert.equal(algae.status, 'not_clean');
  assert.match(algae.advice, /do not drink/i);
  assert.match(algae.advice, /boiling.*may not remove algae toxins/i);
  assert.match(algae.adviceHausa, /kada a sha/i);
});

test('photo analysis samples the centre on a small canvas and releases local file URLs', async () => {
  const previous = { Image: globalThis.Image, document: globalThis.document,
    create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  let drawn;
  const revoked = [];
  try {
    globalThis.Image = class {
      naturalWidth = 600;
      naturalHeight = 400;
      set src(value) { this.source = value; queueMicrotask(() => this.onload()); }
    };
    globalThis.document = {
      createElement(tag) {
        assert.equal(tag, 'canvas');
        return {
          getContext() {
            return {
              drawImage(...args) { drawn = args; },
              getImageData() { return { data: pixel(30, 160, 45) }; },
            };
          },
        };
      },
    };
    URL.createObjectURL = () => 'blob:local-test';
    URL.revokeObjectURL = url => revoked.push(url);
    const result = await waterQualityService.analyzeWater(new File(['photo'], 'water.jpg', { type: 'image/jpeg' }));
    assert.equal(result.category, 'algae');
    assert.deepEqual(drawn.slice(1), [100, 0, 400, 400, 0, 0, 96, 96]);
    assert.deepEqual(revoked, ['blob:local-test']);
  } finally {
    globalThis.Image = previous.Image;
    globalThis.document = previous.document;
    URL.createObjectURL = previous.create;
    URL.revokeObjectURL = previous.revoke;
  }
});

test('failed image decoding or canvas access never returns a clean result', async () => {
  const previous = { Image: globalThis.Image, document: globalThis.document,
    create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  const revoked = [];
  try {
    globalThis.Image = class {
      naturalWidth = 100;
      naturalHeight = 100;
      set src(value) { queueMicrotask(() => this.onload()); }
    };
    globalThis.document = { createElement: () => ({ getContext: () => null }) };
    URL.createObjectURL = () => 'blob:failed';
    URL.revokeObjectURL = url => revoked.push(url);
    await assert.rejects(waterQualityService.analyzeWater(new File(['x'], 'bad.jpg')), /Canvas unavailable/);
    assert.deepEqual(revoked, ['blob:failed']);
    globalThis.Image = class { set src(value) { queueMicrotask(() => this.onerror()); } };
    await assert.rejects(waterQualityService.analyzeWater('data:image/jpeg;base64,bad'), /load image/);
    await assert.rejects(waterQualityService.analyzeWater('https://example.com/water.jpg'), /Only local/);
  } finally {
    globalThis.Image = previous.Image;
    globalThis.document = previous.document;
    URL.createObjectURL = previous.create;
    URL.revokeObjectURL = previous.revoke;
  }
});
