import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localizeFormValidation } from '../src/form-validation.mjs';

test('localized validation clears stale errors before preset actions, preserving business validators', () => {
  class Field extends EventTarget {
    value = '';
    message = '';
    get validity() {
      return { valueMissing: !this.value, customError: Boolean(this.message) };
    }
    setCustomValidity(message) {
      this.message = message;
    }
    closest() {
      return { elements: [this, business] };
    }
  }
  const field = new Field(),
    business = new Field();
  business.setCustomValidity('Adult age required');
  const stop = localizeFormValidation(field, () => 'Please complete this field.');
  field.dispatchEvent(new Event('invalid'));
  assert.equal(field.message, 'Please complete this field.');
  // A date preset changes React state, not the input's native input event.
  field.dispatchEvent(new Event('click'));
  field.value = '2026-11-02';
  assert.equal(field.message, '');
  assert.equal(business.message, 'Adult age required');
  field.value = '';
  field.dispatchEvent(new Event('invalid'));
  const enter = new Event('keydown');
  Object.defineProperty(enter, 'key', { value: 'Enter' });
  field.dispatchEvent(enter);
  assert.equal(field.message, '');
  stop();
});
