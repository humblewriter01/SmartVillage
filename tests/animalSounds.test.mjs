import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { ANIMAL_SOUND_FILES, animalSoundUrl } from '../src/services/animalSoundService.ts';
import { LIVESTOCK_ANIMALS } from '../src/services/livestockService.ts';

test('every livestock species has its own bundled, locally addressed MP3', async () => {
  assert.deepEqual(Object.keys(ANIMAL_SOUND_FILES).sort(), LIVESTOCK_ANIMALS.map(a => a.id).sort());
  const hashes = new Set();
  for (const animal of LIVESTOCK_ANIMALS) {
    const file = ANIMAL_SOUND_FILES[animal.id];
    assert.equal(animalSoundUrl(animal.id), `/sounds/${file}`);
    assert.equal(animalSoundUrl(animal.id, '/village/'), `/village/sounds/${file}`);
    const bytes = await readFile(new URL(`../public/sounds/${file}`, import.meta.url));
    assert.ok(bytes.length > 3000 && bytes.length < 100_000, `${file} should be a short recording`);
    const isMp3 = bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
    assert.ok(isMp3, `${file} should have an MP3 header`);
    hashes.add(createHash('sha256').update(bytes).digest('hex'));
  }
  assert.equal(hashes.size, LIVESTOCK_ANIMALS.length);
  assert.equal(animalSoundUrl('../remote'), null);
});
