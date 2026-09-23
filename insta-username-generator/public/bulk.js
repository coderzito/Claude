// Bulk hunt: generate names and check them one at a time, backing off when Instagram rate-limits.
(function () {
  const $ = (id) => document.getElementById(id);
  const STORE_KEY = 'insta-gen-free-names';
  const MAX_BACKOFF_S = 300;

  let running = false;
  let runId = 0; // bumps on every start so an old loop can tell it was replaced
  let wakeTimer = null;
  let wake = null;
  let backoff = 0; // seconds; grows while Instagram keeps refusing to answer
  const checked = new Set();
  const stats = { checked: 0, taken: 0, free: 0, unknown: 0 };
  let free = load();

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(free)); } catch { /* storage blocked */ }
  }

  function options() {
    const len = +$('huntLen').value;
    return {
      minLength: len,
      maxLength: len,
      style: $('style').value,
      prefix: $('prefix').value,
      letters: $('letters').checked,
      digits: $('digits').checked,
      underscores: $('underscores').checked,
      periods: $('periods').checked,
    };
  }

  function setStatus(text, waiting) {
    const el = $('huntStatus');
    el.textContent = text;
    el.classList.toggle('waiting', !!waiting);
  }

  function renderStats() {
    $('statChecked').textContent = stats.checked;
    $('statTaken').textContent = stats.taken;
    $('statFree').textContent = stats.free;
    $('statUnknown').textContent = stats.unknown;
  }

  function renderFree() {
    const ul = $('huntResults');
    ul.innerHTML = '';
    for (const name of free) {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.className = 'name';
      span.textContent = name;
      const actions = document.createElement('span');
      actions.className = 'li-actions';
      const go = document.createElement('button');
      go.textContent = 'Go to Insta';
      go.addEventListener('click', () => window.open('/go/' + encodeURIComponent(name), '_blank', 'noopener'));
      const del = document.createElement('button');
      del.textContent = 'Remove';
      del.addEventListener('click', () => { free = free.filter((n) => n !== name); save(); renderFree(); });
      actions.append(go, del);
      li.append(span, actions);
      ul.appendChild(li);
    }
  }

  // Wait that Stop can cut short.
  function sleep(seconds) {
    return new Promise((resolve) => {
      wake = resolve;
      wakeTimer = setTimeout(resolve, seconds * 1000);
    });
  }

  function nextName() {
    const opts = options();
    for (let i = 0; i < 500; i++) {
      const n = UsernameGen.generate(opts);
      if (!checked.has(n) && !free.includes(n)) return n;
    }
    return null;
  }

  async function checkName(name) {
    try {
      const res = await fetch('/api/check?u=' + encodeURIComponent(name));
      return (await res.json()).status || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  async function loop(id) {
    let name = null;
    while (running && id === runId) {
      if (!name) name = nextName();
      if (!name) {
        setStatus('Ran out of new names for these settings. Try other characters or a longer length.');
        stop();
        return;
      }
      setStatus(`Checking @${name}…`);
      const status = await checkName(name);
      if (!running || id !== runId) return;

      if (status === 'unknown') {
        // Rate limited: wait longer each time and retry the same name.
        stats.unknown++;
        backoff = Math.min(MAX_BACKOFF_S, backoff ? backoff * 2 : 30);
        renderStats();
        setStatus(`Instagram is limiting lookups. Waiting ${backoff}s before trying @${name} again…`, true);
        await sleep(backoff);
        continue;
      }

      backoff = 0;
      checked.add(name);
      stats.checked++;
      if (status === 'exists') stats.taken++;
      else if (status === 'missing') {
        stats.free++;
        free.unshift(name);
        save();
        renderFree();
      }
      renderStats();
      name = null;
      await sleep(+$('huntDelay').value);
    }
  }

  function start() {
    if (running) return;
    running = true;
    $('huntStart').disabled = true;
    $('huntStop').disabled = false;
    loop(++runId);
  }

  function stop() {
    running = false;
    clearTimeout(wakeTimer);
    if (wake) wake();
    $('huntStart').disabled = false;
    $('huntStop').disabled = true;
    if (!$('huntStatus').textContent.startsWith('Ran out')) setStatus('Stopped.');
  }

  async function copyFree(e) {
    try {
      await navigator.clipboard.writeText(free.join('\n'));
      e.target.textContent = 'Copied!';
      setTimeout(() => (e.target.textContent = 'Copy free names'), 1000);
    } catch { /* clipboard blocked */ }
  }

  $('huntLen').addEventListener('input', () => ($('huntLenVal').textContent = $('huntLen').value));
  $('huntDelay').addEventListener('input', () => ($('huntDelayVal').textContent = $('huntDelay').value));
  $('huntStart').addEventListener('click', start);
  $('huntStop').addEventListener('click', stop);
  $('huntCopy').addEventListener('click', copyFree);
  $('huntClear').addEventListener('click', () => { free = []; save(); renderFree(); });
  renderFree();
})();
