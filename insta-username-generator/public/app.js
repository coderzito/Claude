(function () {
  const $ = (id) => document.getElementById(id);
  const results = $('results');
  let current = [];

  function syncLengthLabels(changed) {
    let min = +$('min').value;
    let max = +$('max').value;
    // Keep min <= max by dragging the other slider along.
    if (min > max) {
      if (changed === 'min') $('max').value = max = min;
      else $('min').value = min = max;
    }
    $('minVal').textContent = min;
    $('maxVal').textContent = max;
  }

  function options() {
    return {
      minLength: +$('min').value,
      maxLength: +$('max').value,
      style: $('style').value,
      prefix: $('prefix').value,
      letters: $('letters').checked,
      digits: $('digits').checked,
      underscores: $('underscores').checked,
      periods: $('periods').checked,
    };
  }

  function button(label, onClick) {
    const b = document.createElement('button');
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  const BADGE_TEXT = { exists: 'Account exists', missing: 'No account', unknown: "Couldn't verify", checking: 'Checking…' };

  function setBadge(badge, status) {
    badge.className = 'badge ' + status;
    badge.textContent = BADGE_TEXT[status] || status;
    badge.hidden = false;
  }

  async function check(name, badge) {
    setBadge(badge, 'checking');
    let status = 'unknown';
    try {
      const res = await fetch('/api/check?u=' + encodeURIComponent(name));
      status = (await res.json()).status || 'unknown';
    } catch { /* network error: leave as unknown */ }
    setBadge(badge, status);
    return status;
  }

  // "Hide taken names": check each listed name in turn and drop the ones with an account.
  let filterRun = 0;
  const rows = new Map(); // name -> { li, badge }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function setFilterStatus(text) {
    const el = $('filterStatus');
    el.textContent = text;
    el.hidden = !text;
  }

  async function filterTaken() {
    const id = ++filterRun;
    const names = current.slice();
    let hidden = 0, unknown = 0;
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const row = rows.get(name);
      if (!row) continue;
      setFilterStatus(`Checking ${i + 1} of ${names.length}… hid ${hidden} taken so far`);
      const status = await check(name, row.badge);
      if (id !== filterRun) return; // a newer Generate replaced this list
      if (status === 'exists') {
        hidden++;
        row.li.remove();
        rows.delete(name);
        current = current.filter((n) => n !== name);
      } else if (status === 'unknown') {
        unknown++;
      }
      if (i < names.length - 1) await sleep(3000);
      if (id !== filterRun) return;
    }
    let msg = `Done: hid ${hidden} taken name${hidden === 1 ? '' : 's'}, ${current.length - unknown} with no account left.`;
    if (!current.length) msg += ' Hit Generate for more.';
    setFilterStatus(msg);
    if (unknown) {
      const el = $('filterStatus');
      el.append(` ${unknown} couldn't be checked. `);
      const a = document.createElement('a');
      a.href = '/debug.html';
      a.target = '_blank';
      a.textContent = 'See why';
      el.appendChild(a);
    }
  }

  function render() {
    results.innerHTML = '';
    rows.clear();
    for (const name of current) {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.className = 'name';
      span.textContent = name + ' ';
      const len = document.createElement('span');
      len.className = 'len';
      len.textContent = `(${name.length})`;
      span.appendChild(len);

      const badge = document.createElement('span');
      badge.hidden = true;

      const actions = document.createElement('span');
      actions.className = 'li-actions';
      actions.append(
        button('Copy', (e) => copy(name, e.target)),
        button('Check', () => check(name, badge)),
        button('Go to Insta', () => { window.open('/go/' + encodeURIComponent(name), '_blank', 'noopener'); })
      );
      li.append(span, badge, actions);
      results.appendChild(li);
      rows.set(name, { li, badge });
    }
  }

  async function copy(text, el) {
    try {
      await navigator.clipboard.writeText(text);
      const old = el.textContent;
      el.textContent = 'Copied!';
      setTimeout(() => (el.textContent = old), 1000);
    } catch { /* clipboard blocked; ignore */ }
  }

  function generate() {
    const count = Math.max(1, Math.min(50, +$('count').value || 10));
    current = UsernameGen.generateMany(count, options());
    render();
    filterRun++; // stop any check still running on the old list
    setFilterStatus('');
    if ($('hideTaken').checked) filterTaken();
  }

  $('min').addEventListener('input', () => syncLengthLabels('min'));
  $('max').addEventListener('input', () => syncLengthLabels('max'));
  $('generate').addEventListener('click', generate);
  $('copyAll').addEventListener('click', (e) => copy(current.join('\n'), e.target));
  syncLengthLabels();
  generate();
})();
