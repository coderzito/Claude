// Username generation + Instagram rule validation.
// Shared by the browser (window.UsernameGen) and the Node server/tests (module.exports).
(function (root) {
  const MAX_LEN = 30;
  const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
  const DIGITS = '0123456789';
  const VOWELS = 'aeiou';
  const CONSONANTS = 'bcdfghjklmnprstvwyz';

  // Instagram's rules: 1-30 chars, only letters/digits/periods/underscores,
  // no leading or trailing period, no two periods in a row, not only digits.
  function validate(name) {
    if (typeof name !== 'string' || name.length === 0) return 'Username is empty';
    if (name.length > MAX_LEN) return 'Longer than 30 characters';
    if (!/^[a-z0-9._]+$/.test(name)) return 'Only letters, numbers, periods and underscores are allowed';
    if (name.startsWith('.')) return "Can't start with a period";
    if (name.endsWith('.')) return "Can't end with a period";
    if (name.includes('..')) return "Can't have two periods in a row";
    if (/^[0-9]+$/.test(name)) return "Can't be only numbers";
    return null;
  }

  function randInt(n) {
    if (root.crypto && root.crypto.getRandomValues) {
      const buf = new Uint32Array(1);
      root.crypto.getRandomValues(buf);
      return buf[0] % n;
    }
    return Math.floor(Math.random() * n);
  }
  const pick = (s) => s[randInt(s.length)];

  // "random": every character drawn from the enabled sets.
  function randomBody(len, opts) {
    let pool = '';
    if (opts.letters) pool += LETTERS;
    if (opts.digits) pool += DIGITS;
    if (!pool) pool = LETTERS;
    let out = '';
    for (let i = 0; i < len; i++) out += pick(pool);
    return out;
  }

  // "readable": alternating consonant/vowel syllables, digits sprinkled at the end.
  function readableBody(len, opts) {
    let out = '';
    let vowel = randInt(2) === 0;
    const digitTail = opts.digits && len > 3 ? randInt(Math.min(3, len - 2) + 1) : 0;
    while (out.length < len - digitTail) {
      out += vowel ? pick(VOWELS) : pick(CONSONANTS);
      vowel = !vowel;
    }
    for (let i = 0; i < digitTail; i++) out += pick(DIGITS);
    return out;
  }

  // Replace a few interior characters with '.' or '_' while respecting the period rules.
  function addSeparators(chars, opts) {
    const seps = [];
    if (opts.underscores) seps.push('_');
    if (opts.periods) seps.push('.');
    if (!seps.length || chars.length < 3) return chars;
    const count = 1 + randInt(Math.max(1, Math.floor(chars.length / 6)));
    for (let n = 0; n < count; n++) {
      const i = 1 + randInt(chars.length - 2); // never first or last
      const sep = pick(seps);
      if (sep === '.' && (chars[i - 1] === '.' || chars[i + 1] === '.')) continue;
      chars[i] = sep;
    }
    return chars;
  }

  function generate(options) {
    const opts = Object.assign(
      { minLength: 6, maxLength: 12, letters: true, digits: true, underscores: true, periods: false, style: 'random', prefix: '' },
      options
    );
    const prefix = String(opts.prefix || '').toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, MAX_LEN);
    let min = Math.max(1, Math.min(MAX_LEN, opts.minLength | 0));
    let max = Math.max(1, Math.min(MAX_LEN, opts.maxLength | 0));
    if (min > max) [min, max] = [max, min];
    min = Math.max(min, prefix.length);
    max = Math.max(max, min);

    for (let attempt = 0; attempt < 200; attempt++) {
      const len = min + randInt(max - min + 1);
      const bodyLen = len - prefix.length;
      let body = opts.style === 'readable' ? readableBody(bodyLen, opts) : randomBody(bodyLen, opts);
      body = addSeparators(body.split(''), opts).join('');
      const name = prefix + body;
      if (!validate(name)) return name;
    }
    // Fallback that always satisfies the rules.
    return (prefix + 'user' + randInt(1e6)).replace(/\.+$/, '').slice(0, MAX_LEN);
  }

  function generateMany(count, options) {
    const seen = new Set();
    const out = [];
    for (let i = 0; i < count * 10 && out.length < count; i++) {
      const n = generate(options);
      if (!seen.has(n)) { seen.add(n); out.push(n); }
    }
    return out;
  }

  const api = { validate, generate, generateMany, MAX_LEN };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.UsernameGen = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
