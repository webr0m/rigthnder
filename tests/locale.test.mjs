import { test } from 'node:test';
import assert from 'node:assert/strict';
import { t, setLanguage, getLanguage, subscribeLanguage } from '../src/locale.mjs';

test('language changes notify existing views and preserve untranslated personal text', () => {
  const changes = [],
    unsubscribe = subscribeLanguage(() => changes.push(getLanguage()));
  try {
    setLanguage('en');
    assert.equal(t('SIGUIENTE'), 'NEXT');
    assert.equal(t('Hablemos de'), "Let's talk about");
    setLanguage('de');
    assert.equal(t('SIGUIENTE'), 'WEITER');
    assert.equal(t(' Prueba de texto personal '), ' Prueba de texto personal ');
    assert.equal(t('München'), 'München');
    assert.equal(t('Chile Despertó'), 'Chile Despertó');
    setLanguage('xx');
    assert.equal(getLanguage(), 'de');
    assert.deepEqual(changes, ['en', 'de']);
    setLanguage('es');
    assert.equal(t('Hablemos de'), 'Hablemos de');
  } finally {
    unsubscribe();
    setLanguage('es');
  }
});
