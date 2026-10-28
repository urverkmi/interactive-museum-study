/* Researcher control panel: create links, see who has which sequence. */
(function () {
  'use strict';
  const CFG = window.STUDY_CONFIG;
  const C = window.STUDY_CONTENT;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const strip = s => String(s).replace(/<[^>]+>/g, '');
  const studyUrl = new URL('index.html', location.href).toString().split('?')[0];
  const seqs = Object.keys(CFG.latinSquare);
  const artIds = C.artworks.map(a => a.id);
  let key = '';
  try { key = localStorage.getItem('mstudy-admin-key') || ''; } catch (e) {}
  let data = null;

  const vChip = v => '<span class="v ' + esc(v) + '">' + esc(v) + '</span>';

  /* ---------- Latin square + previews (works without backend) ---------- */
  function presentation(seq) {
    const map = CFG.latinSquare[seq];
    let t = artIds.map(id => ({ id, v: map[id] }));
    if (CFG.presentationOrder === 'byVersion') t.sort((a, b) => a.v.localeCompare(b.v));
    return t;
  }
  function drawSquare() {
    let h = '<thead><tr><th>Sequence</th>' + C.artworks.map((a, i) => '<th>Artwork ' + (i + 1) + ' <span class="vname">' + esc(a.id) + '</span></th>').join('') +
      '<th>Shown in this order</th><th></th></tr></thead><tbody>';
    seqs.forEach(s => {
      const map = CFG.latinSquare[s];
      h += '<tr><td><strong>' + s + '</strong></td>' +
        artIds.map(id => '<td>' + vChip(map[id]) + '<span class="vname">' + esc(CFG.versionNames[map[id]]) + '</span></td>').join('') +
        '<td>' + (CFG.presentationOrder === 'random' ? '<span class="muted">Random per participant (balanced)</span>' :
          presentation(s).map(t => esc(t.id) + ' ' + vChip(t.v)).join(' → ')) + '</td>' +
        '<td><a href="' + esc(studyUrl + '?preview=1&seq=' + s) + '" target="_blank" rel="noopener">Preview ↗</a></td></tr>';
    });
    $('square').innerHTML = h + '</tbody>';
    const titles = C.artworks.map((a, i) => 'Artwork ' + (i + 1) + ' (' + a.id + ') = ' + strip(a.title)).join(' · ');
    $('square').insertAdjacentHTML('afterend', '<p class="muted small">' + esc(titles) + '<br>Versions: ' +
      Object.entries(CFG.versionNames).map(([k, v]) => k + ' = ' + v).join(' · ') + '</p>');
  }

  function fillSeqSelect(next) {
    $('seq').innerHTML = '<option value="auto">Auto — next in rotation' + (next ? ' (currently ' + next + ')' : '') + '</option>' +
      seqs.map(s => '<option value="' + s + '">Sequence ' + s + ': ' + artIds.map(id => id + '=' + CFG.latinSquare[s][id]).join(', ') + '</option>').join('');
  }

  /* ---------- Backend ---------- */
  async function api(params) {
    const url = new URL(CFG.backendUrl);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || 'server error');
    return j;
  }

  function setConn(ok, text) {
    const c = $('conn');
    c.className = 'conn ' + (ok ? 'ok' : 'off');
    c.textContent = text;
  }

  async function refresh() {
    if (!CFG.backendUrl) return;
    if (!key) { showSetup('Enter the admin key to connect.'); return; }
    $('refresh').disabled = true;
    try {
      data = await api({ action: 'list', key });
      $('setup-card').hidden = true;
      setConn(true, 'Connected · ' + data.assignments.length + ' links');
      fillSeqSelect(data.nextSequence);
      drawBalance();
      drawPeople();
      $('sheet-link').href = data.sheetUrl;
      $('sheet-link').hidden = false;
      $('create-btn').disabled = false;
    } catch (err) {
      setConn(false, 'Not connected');
      showSetup('Could not connect: ' + err.message);
    } finally {
      $('refresh').disabled = false;
    }
  }

  function showSetup(msg) {
    $('setup-card').hidden = false;
    $('setup-msg').textContent = msg;
    $('create-btn').disabled = true;
  }

  function drawBalance() {
    const max = Math.max(1, ...seqs.map(s => data.summary[s].assigned));
    $('balance').innerHTML = seqs.map(s => {
      const x = data.summary[s];
      const done = x.completed, prog = x.started, todo = x.assigned - done - prog;
      const pct = n => (n / max * 100) + '%';
      return '<div class="bal-row"><span>Sequence ' + s + '</span>' +
        '<div class="bar" role="img" aria-label="' + done + ' completed, ' + prog + ' in progress, ' + todo + ' not started">' +
        '<span class="done" style="width:' + pct(done) + '"></span><span class="prog" style="width:' + pct(prog) + '"></span><span class="todo" style="width:' + pct(todo) + '"></span></div>' +
        '<span><strong>' + done + '</strong> done / ' + x.assigned + '</span></div>';
    }).join('') +
      '<div class="legend"><span><i style="background:var(--ok)"></i>Completed</span><span><i style="background:#8fa3cc"></i>In progress</span><span><i style="background:#c9c6be"></i>Not started</span></div>';
  }

  function drawPeople() {
    const rows = data.assignments.slice().reverse();
    if (!rows.length) { $('people').innerHTML = '<tbody><tr><td class="muted">No links yet.</td></tr></tbody>'; return; }
    let h = '<thead><tr><th>Created</th><th>For</th><th>Code</th><th>Seq</th>' +
      artIds.map(id => '<th>' + esc(id) + '</th>').join('') + '<th>Page order</th><th>Status</th><th>Note</th><th></th></tr></thead><tbody>';
    rows.forEach(r => {
      const st = String(r.status || '');
      const link = studyUrl + '?p=' + encodeURIComponent(r.code);
      h += '<tr><td>' + esc(fmtDate(r.created_at)) + '</td><td class="wrap-cell">' + esc(r.label) + '</td>' +
        '<td class="mono">' + esc(r.code) + '</td><td>' + esc(r.sequence) + '</td>' +
        artIds.map(id => '<td>' + vChip(r[id]) + '</td>').join('') +
        '<td>' + orderHtml(r) + '</td>' +
        '<td><span class="status ' + st.replace(/\s+/g, '-') + '">' + esc(st) + '</span>' +
          (r.completed_at ? '<br><span class="muted small">' + esc(fmtDate(r.completed_at)) + '</span>' : '') + '</td>' +
        '<td class="wrap-cell muted">' + esc(r.note) + '</td>' +
        '<td>' + (r.source === 'open link' ? '<span class="muted small">open link</span>' :
          '<button class="btn small" data-copy="' + esc(link) + '">Copy link</button>') +
          (st !== 'completed' && st !== 'void' ? ' <button class="btn small" data-void="' + esc(r.code) + '" title="Withdraw this link; its slot no longer counts for balancing">Void</button>' : '') +
        '</td></tr>';
    });
    $('people').innerHTML = h + '</tbody>';
  }

  /** "art2 C → art1 A → art3 B" for a row (or created-link reply) */
  function orderHtml(r) {
    const ids = String(r.order || '').split(/\s*>\s*/).filter(Boolean);
    if (CFG.presentationOrder !== 'random' || !ids.length) {
      return presentation(r.sequence).map(t => esc(t.id) + ' ' + vChip(t.v)).join(' → ');
    }
    const map = r.versions || r;
    return ids.map(id => esc(id) + ' ' + vChip(map[id])).join(' → ');
  }

  function fmtDate(s) {
    if (!s) return '';
    const d = new Date(s);
    if (isNaN(d)) return s;
    return d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text); } catch (e) {
      const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
    }
    if (btn) { const old = btn.textContent; btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = old; }, 1400); }
  }

  /* ---------- Events ---------- */
  $('key-form').addEventListener('submit', e => {
    e.preventDefault();
    key = $('key').value.trim();
    try { localStorage.setItem('mstudy-admin-key', key); } catch (err) {}
    refresh();
  });

  $('create-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('create-btn');
    btn.disabled = true;
    try {
      const j = await api({ action: 'create', key, label: $('label').value.trim(), note: $('note').value.trim(), seq: $('seq').value });
      const link = studyUrl + '?p=' + encodeURIComponent(j.code);
      $('created').hidden = false;
      $('created').innerHTML = '<strong>' + esc(j.label) + '</strong> → sequence ' + j.sequence + ' (' +
        artIds.map(id => esc(id) + ' ' + vChip(j.versions[id])).join(', ') + ')' +
        '<br><span class="small">Page order: ' + orderHtml(j) + '</span>' +
        '<div class="link"><input readonly value="' + esc(link) + '" aria-label="Participant link"><button class="btn small" type="button" data-copy="' + esc(link) + '">Copy</button></div>';
      $('label').value = ''; $('note').value = '';
      await refresh();
    } catch (err) {
      alert('Could not create link: ' + err.message);
    } finally {
      btn.disabled = false;
    }
  });

  document.addEventListener('click', async e => {
    const c = e.target.closest('[data-copy]');
    if (c) return copy(c.dataset.copy, c);
    const v = e.target.closest('[data-void]');
    if (v && confirm('Void link ' + v.dataset.void + '? The participant will no longer be able to use it.')) {
      try { await api({ action: 'void', key, p: v.dataset.void }); refresh(); } catch (err) { alert(err.message); }
    }
  });
  $('refresh').addEventListener('click', refresh);

  /* ---------- Boot ---------- */
  drawSquare();
  fillSeqSelect();
  $('open-link-row').innerHTML = 'Open link for a panel or forum (assigns the next sequence automatically when someone starts): <br><a href="' + esc(studyUrl) + '" target="_blank" rel="noopener">' + esc(studyUrl) + '</a>';
  if (!CFG.backendUrl) {
    setConn(false, 'Pilot mode — no backend');
    $('create-btn').disabled = true;
    $('create-card').insertAdjacentHTML('beforeend', '<p class="muted small">Set <code>backendUrl</code> in config.js to create links (README, step 2).</p>');
    $('people').innerHTML = '<tbody><tr><td class="muted">No backend configured yet.</td></tr></tbody>';
  } else {
    $('key').value = key;
    refresh();
  }
})();
