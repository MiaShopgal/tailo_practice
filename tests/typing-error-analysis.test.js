'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../website/js/typing-error-analysis.js');
const A = globalThis.TypingErrorAnalysis;

test('hyphens and spaces are equivalent syllable separators', () => {
  assert.equal(A.syllables('uàn-thàn').length, A.syllables('uan2 than3').length);
  assert.deepEqual(A.categories('uàn-thàn', 'uan3 than3'), []);
  assert.deepEqual(A.categories('uàn-thàn', 'uan2 than3'), ['tone']);
});

test('numeric and diacritic tone representations parse', () => {
  assert.equal(A.parseSyllable('tsîng').tone, 5);
  assert.equal(A.parseSyllable('tshing5').tone, 5);
});

test('classifies a nasal coda mismatch and a missing tone mark', () => {
  assert.ok(A.categories('thāk-tsheh', 'thāng tsheh')[0] === 'coda' || A.categories('thāk-tsheh', 'thāng tsheh').includes('coda'));
  assert.deepEqual(A.categories('uàn-thàn', 'uan than'), ['missingTone']);
});

test('separator-only changes do not highlight canonical spelling', () => {
  assert.equal(A.highlightTarget('uàn-thàn', 'uàn thàn').includes('typing-error-char'), false);
});
