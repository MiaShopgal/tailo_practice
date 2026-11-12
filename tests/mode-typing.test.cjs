const assert = require('node:assert/strict');
const { test } = require('node:test');

global.window = {};
require('../website/js/mode-typing.js');
const { typedSyllables } = global.window.TypingMode;

const syllables = [
  { s: 'khi', a: 'khi-audio', f: 10, p: [['kh', 'i', 1, -1]] },
  { s: 'thá', a: 'tha-audio', f: 9, p: [['th', 'a', 2, 1]] },
];

test('splits an unseparated two-syllable typed answer and finds each recording', () => {
  assert.deepEqual(typedSyllables('khi-thá', 2, syllables), [
    { text: 'khi', file: 'khi-audio' },
    { text: 'thá', file: 'tha-audio' },
  ]);
  assert.deepEqual(typedSyllables('khithá', 2, syllables), [
    { text: 'khi', file: 'khi-audio' },
    { text: 'thá', file: 'tha-audio' },
  ]);
});

test('accepts numbered tones and leaves an unknown syllable without a recording', () => {
  assert.deepEqual(typedSyllables('khi-tha2', 2, syllables), [
    { text: 'khi', file: 'khi-audio' },
    { text: 'tha2', file: 'tha-audio' },
  ]);
  assert.deepEqual(typedSyllables('khi-unknown', 2, syllables), [
    { text: 'khi', file: 'khi-audio' },
    { text: 'unknown', file: '' },
  ]);
});

test('finds the existing dictionary recording for the typed example', () => {
  require('../website/data/tone-syllables.js');
  const [syllable] = typedSyllables('khi', 1, global.window.TONE_SYLLABLES);
  assert.equal(syllable.text, 'khi');
  assert.ok(syllable.file);
});
