'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../website/js/typing-error-analysis.js');
const A = globalThis.TypingErrorAnalysis;

test('hyphens and spaces are equivalent syllable separators', () => {
  assert.equal(A.syllables('uàn-thàn').length, A.syllables('uan2 than3').length);
  assert.deepEqual(A.categories('uàn-thàn', 'uan3 than3'), []);
  assert.deepEqual(A.categories('uàn-thàn', 'uan2 than3'), ['sandhi']);
});

test('separates first-syllable sandhi from final-syllable tone errors', () => {
  assert.deepEqual(A.categories('uàn-thàn', 'uan2 than2'), ['sandhi', 'tone']);
});

test('numeric and diacritic tone representations parse', () => {
  assert.equal(A.parseSyllable('tsîng').tone, 5);
  assert.equal(A.parseSyllable('tshing5').tone, 5);
});

test('classifies entering-tone codas and unmarked wrong-tone errors', () => {
  assert.deepEqual(A.categories('thāk-tsheh', 'thāng tsheh'), ['enteringTone']);
  assert.deepEqual(A.categories('uàn-thàn', 'uan than'), ['sandhi', 'tone']);
});

test('classifies entering-tone coda differences separately', () => {
  assert.deepEqual(A.categories('tsik', 'tsit'), ['enteringTone']);
  assert.deepEqual(A.categories('tsik', 'tsi'), ['enteringTone']);
  assert.deepEqual(A.categories('tsim', 'tsin'), ['coda']);
});

test('treats an unmarked entering syllable as tone 4', () => {
  assert.deepEqual(A.categories('tsik', 'tsik4'), []);
  assert.deepEqual(A.categories('tsik', 'tsik1'), ['tone']);
  assert.equal(A.highlightTarget('tsik', 'tsik4').includes('typing-error-char'), false);
  assert.equal(A.highlightAnswerExtras('tsik', 'tsik4').includes('typing-error-char'), false);
});

test('treats an unmarked open syllable as tone 1', () => {
  assert.deepEqual(A.categories('sai', 'sai1'), []);
});

test('separator-only changes do not highlight canonical spelling', () => {
  assert.equal(A.highlightTarget('uàn-thàn', 'uàn thàn').includes('typing-error-char'), false);
});

test('correct final syllable tone is not highlighted when the first tone differs', () => {
  const html = A.highlightTarget('uàn-thàn', 'uan2 than3');
  assert.equal((html.match(/typing-error-char/g) || []).length, 1);
  assert.match(html, /<span class="typing-error-char">à<\/span>n-thàn$/);
});

test('extra numeric tone in the submitted answer is highlighted', () => {
  const html = A.highlightAnswerExtras('tsuann-san', 'tsuann7 san');
  assert.match(html, /<span class="typing-error-char">7<\/span>/);
  assert.equal((html.match(/typing-error-char/g) || []).length, 1);
});

test('highlights the answer vowel when its implicit tone is wrong', () => {
  const html = A.highlightAnswerExtras('tàu-tīn', 'tau3 tin');
  assert.match(html, /<span class="typing-error-char">i<\/span>/);
  assert.equal((html.match(/typing-error-char/g) || []).length, 1);
});
