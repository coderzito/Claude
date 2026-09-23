const test = require('node:test');
const assert = require('node:assert');
const { validate, generate, generateMany } = require('../public/generator.js');

test('validate enforces Instagram rules', () => {
  assert.equal(validate('good_name.1'), null);
  assert.ok(validate(''));
  assert.ok(validate('a'.repeat(31)));
  assert.ok(validate('.abc'));
  assert.ok(validate('abc.'));
  assert.ok(validate('a..b'));
  assert.ok(validate('12345'));
  assert.ok(validate('Has-Dash'));
});

test('generated names are always valid and respect length', () => {
  const combos = [
    { minLength: 1, maxLength: 30, periods: true },
    { minLength: 5, maxLength: 5, style: 'readable', periods: true },
    { minLength: 3, maxLength: 8, letters: false, digits: true, underscores: true },
    { minLength: 10, maxLength: 20, prefix: 'The.', periods: true },
    { minLength: 12, maxLength: 4 },
  ];
  for (const opts of combos) {
    for (let i = 0; i < 2000; i++) {
      const n = generate(opts);
      assert.equal(validate(n), null, `${n} invalid for ${JSON.stringify(opts)}`);
    }
  }
  for (let i = 0; i < 500; i++) assert.equal(generate({ minLength: 7, maxLength: 7 }).length, 7);
});

test('generateMany returns unique names', () => {
  const names = generateMany(50, { minLength: 8, maxLength: 8 });
  assert.equal(names.length, 50);
  assert.equal(new Set(names).size, 50);
});
