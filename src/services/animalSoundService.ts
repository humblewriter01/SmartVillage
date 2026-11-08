// Each file is a short, locally bundled recording; see public/sounds/CREDITS.md.
export const ANIMAL_SOUND_FILES: Record<string, string> = {
  chicken: 'chicken.mp3',
  goat: 'goat.mp3',
  sheep: 'sheep.mp3',
  cattle: 'cattle.mp3',
  donkey: 'donkey.mp3',
  camel: 'camel.mp3',
  pig: 'pig.mp3',
  duck: 'duck.mp3',
  turkey: 'turkey.mp3',
};

export function animalSoundUrl(animalId: string, baseUrl = '/'): string | null {
  const file = ANIMAL_SOUND_FILES[animalId];
  if (!file) return null;
  return `${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}sounds/${file}`;
}
