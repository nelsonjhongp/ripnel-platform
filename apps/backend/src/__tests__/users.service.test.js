const { describe, it } = require('node:test');
const assert = require('node:assert');

const { buildTemporaryPassword } = require('../modules/users/users.service');

describe('users.service temporary password', () => {
  it('builds a human-friendly temporary password with two words, two digits, and a symbol', () => {
    for (let index = 0; index < 40; index += 1) {
      const password = buildTemporaryPassword();

      assert.match(password, /^[A-Z][a-z]+[2-9]{2}[A-Z][a-z]+!$/);
      assert.ok(password.length >= 10);
    }
  });

  it('avoids ambiguous characters in generated temporary passwords', () => {
    for (let index = 0; index < 40; index += 1) {
      const password = buildTemporaryPassword();

      assert.doesNotMatch(password, /[01]/);
      assert.doesNotMatch(password, /[ÁÉÍÓÚÜÑáéíóúüñ]/);
    }
  });
});
