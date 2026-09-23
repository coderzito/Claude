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
    try {
      const res = await fetch('/api/check?u=' + encodeURIComponent(name));
      const data = await res.json();
      setBadge(badge, data.status || 'unknown');
    } catch {
      setBadge(badge, 'unknown');
    }
  }

  function render() {
    results.innerHTML = '';
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
  }

  $('min').addEventListener('input', () => syncLengthLabels('min'));
  $('max').addEventListener('input', () => syncLengthLabels('max'));
  $('generate').addEventListener('click', generate);
  $('copyAll').addEventListener('click', (e) => copy(current.join('\n'), e.target));
  syncLengthLabels();
  generate();
})();
