/* Participant-facing study app. Settings: config.js · Texts: content/content.js */
(function () {
  'use strict';

  const CFG = window.STUDY_CONFIG;
  const C = window.STUDY_CONTENT;
  const app = document.getElementById('app');
  const params = new URLSearchParams(location.search);

  // live    = backend configured, data is sent
  // pilot   = no backend configured, data kept locally, downloadable at the end
  // preview = ?preview=1 (from the control panel), nothing is sent or stored
  const MODE = params.has('preview') ? 'preview' : (CFG.backendUrl ? 'live' : 'pilot');
  const STORE_PREFIX = 'mstudy:';
  const ARTWORKS = Object.fromEntries(C.artworks.map(a => [a.id, a]));

  /* ------------------------------------------------------------------ */
  /* State                                                              */
  /* ------------------------------------------------------------------ */
  let S = null;           // persisted participant state
  let pageT0 = 0;         // performance.now() when the current screen opened
  let screenCleanup = null;
  const outbox = [];      // pilot/preview: everything that would have been sent

  function freshState(code, sequence, source, order) {
    const trials = buildTrials(sequence, order);
    const steps = ['start', 'background', 'instructions'];
    trials.forEach((t, i) => { steps.push('artwork:' + i); steps.push('quiz:' + i); });
    steps.push('endquestions');
    steps.push('end');
    return {
      code, sequence, source,
      trials, steps,
      step: 0,
      startedAt: new Date().toISOString(),
      results: trials.map(t => ({ artwork_id: t.artworkId, version: t.version, position: t.position })),
      session: { instructions_ms: 0, resumed_count: 0, consent_link_clicked: false },
      events: [],
      completed: false
    };
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** order: array of artwork ids from the backend (random mode), or null */
  function buildTrials(seq, order) {
    const map = CFG.latinSquare[seq];
    if (!map) throw new Error('Unknown sequence ' + seq);
    const ids = C.artworks.map(a => a.id);
    let ordered;
    if (CFG.presentationOrder === 'random') {
      const valid = Array.isArray(order) && order.length === ids.length && ids.every(id => order.includes(id));
      ordered = valid ? order.slice() : shuffle(ids);
    } else if (CFG.presentationOrder === 'byVersion') {
      ordered = ids.slice().sort((x, y) => map[x].localeCompare(map[y]));
    } else {
      ordered = ids.slice();
    }
    return ordered.map((id, i) => ({ artworkId: id, version: map[id], position: i + 1 }));
  }

  function parseOrder(s) {
    if (!s) return null;
    return String(s).split(/[\s,>]+/).filter(Boolean);
  }

  function save() {
    if (MODE === 'preview' || !S) return;
    try {
      localStorage.setItem(STORE_PREFIX + S.code, JSON.stringify(S));
      localStorage.setItem(STORE_PREFIX + 'last', S.code);
    } catch (e) { /* storage blocked: study still works, just can't resume */ }
  }
  function loadSaved(code) {
    try {
      const raw = localStorage.getItem(STORE_PREFIX + code);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  /* ------------------------------------------------------------------ */
  /* Logging & sending                                                  */
  /* ------------------------------------------------------------------ */
  function log(type, data) {
    if (!S) return;
    S.events.push(Object.assign({
      at: new Date().toISOString(),
      t_ms: Math.round(performance.now() - pageT0),   // ms since this screen opened
      screen: S.steps[S.step],
      type
    }, data || {}));
  }

  let queue = [];
  try { queue = JSON.parse(localStorage.getItem(STORE_PREFIX + 'queue') || '[]'); } catch (e) { queue = []; }
  let flushing = false;

  function send(payload) {
    payload.code = S.code;
    payload.sent_at = new Date().toISOString();
    if (MODE !== 'live') { outbox.push(payload); return; }
    queue.push(payload);
    try { localStorage.setItem(STORE_PREFIX + 'queue', JSON.stringify(queue)); } catch (e) {}
    flush();
  }

  async function flush() {
    if (flushing || MODE !== 'live') return;
    flushing = true;
    while (queue.length) {
      const body = JSON.stringify(queue[0]);
      try {
        // text/plain + no-cors avoids a CORS preflight, which Apps Script can't answer.
        await fetch(CFG.backendUrl, {
          method: 'POST', mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body, keepalive: body.length < 60000
        });
        queue.shift();
        try { localStorage.setItem(STORE_PREFIX + 'queue', JSON.stringify(queue)); } catch (e) {}
      } catch (e) {
        flushing = false;
        setTimeout(flush, 5000);
        return;
      }
    }
    flushing = false;
  }

  /* Sends whatever was logged since the last send */
  function takeEvents() { const ev = S.events; S.events = []; return ev; }

  /* ------------------------------------------------------------------ */
  /* Visibility tracking (tab hidden / window blurred)                  */
  /* ------------------------------------------------------------------ */
  const vis = { hiddenMs: 0, hiddenCount: 0, blurCount: 0, hiddenSince: null };
  function resetVis() { vis.hiddenMs = 0; vis.hiddenCount = 0; vis.blurCount = 0; vis.hiddenSince = document.hidden ? performance.now() : null; }
  function visHiddenNow() { return vis.hiddenMs + (vis.hiddenSince != null ? performance.now() - vis.hiddenSince : 0); }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { vis.hiddenSince = performance.now(); vis.hiddenCount++; log('tab_hidden'); }
    else if (vis.hiddenSince != null) { vis.hiddenMs += performance.now() - vis.hiddenSince; vis.hiddenSince = null; log('tab_visible'); }
  });
  window.addEventListener('blur', () => { vis.blurCount++; });

  window.addEventListener('beforeunload', (e) => {
    if (S && !S.completed && S.step > 0 && MODE !== 'preview') { e.preventDefault(); e.returnValue = ''; }
  });

  /* ------------------------------------------------------------------ */
  /* Helpers                                                            */
  /* ------------------------------------------------------------------ */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ARROW_R = '<span class="arrow-glyph" aria-hidden="true">→</span>';
  const SVG_LEFT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  const SVG_RIGHT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';

  /* Radio option used by background / quiz / ending questions. */
  function radioOpt(name, value, label) {
    return '<label class="radio-opt"><input type="radio" name="' + esc(name) + '" value="' + esc(String(value)) + '"><span>' + esc(label) + '</span></label>';
  }
  /* 1–7 numbered scale with labels only at the two ends (e.g. "easy to understand"). */
  function numberScale(name, lowLabel, highLabel) {
    let opts = '';
    for (let v = 1; v <= 7; v++) opts += '<label class="scale-opt"><input type="radio" name="' + esc(name) + '" value="' + v + '"><span>' + v + '</span></label>';
    return '<div class="scale7">' + opts + '</div><div class="scale-labels"><span>' + esc(lowLabel) + '</span><span>' + esc(highLabel) + '</span></div>';
  }
  /* 7-point scale where every point has its own text label (e.g. agree/disagree). */
  function likertScale(name, labels) {
    return '<div class="likert">' + labels.map((l, idx) => radioOpt(name, idx + 1, l)).join('') + '</div>';
  }
  function checkedVal(name) {
    const el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : null;
  }

  function randomCode(n) {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    const buf = new Uint32Array(n);
    crypto.getRandomValues(buf);
    for (let i = 0; i < n; i++) s += abc[buf[i] % abc.length];
    return s;
  }

  function render(html) {
    if (screenCleanup) { screenCleanup(); screenCleanup = null; }
    app.innerHTML = html;
    window.scrollTo(0, 0);
    pageT0 = performance.now();
    resetVis();
    banner();
    const h = app.querySelector('h1, h2, h3');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }

  function banner() {
    if (MODE === 'live') return;
    const b = document.createElement('div');
    b.className = 'mode-banner';
    const cur = S && S.steps[S.step] || '';
    const tIdx = cur.includes(':') ? Number(cur.split(':')[1]) : -1;
    const t = S && tIdx >= 0 ? S.trials[tIdx] : null;
    b.textContent = (MODE === 'preview' ? 'Preview — not recorded' : 'Pilot mode — no backend, nothing sent') +
      (S ? ' · sequence ' + S.sequence : '') +
      (t ? ' · ' + t.artworkId + ' = version ' + t.version + ' (' + (CFG.versionNames[t.version] || '') + ')' : '');
    app.appendChild(b);
  }

  function posHeader(trial) {
    return '<header class="pos"><span class="pos-badge">' + trial.position + '</span><span>' +
      esc(C.artworkPage.of) + ' ' + S.trials.length + '</span></header>';
  }

  function tombstone(a) {
    const meta = [a.artist, a.date].filter(Boolean).join(', ');
    return '<div class="tombstone"><h2>' + a.title + '</h2>' +
      (meta ? '<p>' + meta + '</p>' : '') +
      (a.medium ? '<p>' + a.medium + '</p>' : '') +
      (a.credit ? '<p>' + a.credit + '</p>' : '') + '</div>';
  }

  function next() {
    S.step++;
    save();
    show();
  }

  /* ------------------------------------------------------------------ */
  /* Router                                                             */
  /* ------------------------------------------------------------------ */
  function show() {
    const step = S ? S.steps[S.step] : 'start';
    const [kind, idx] = step.split(':');
    if (kind === 'start') return showStart();
    if (kind === 'background') return showBackground();
    if (kind === 'instructions') return showInstructions();
    if (kind === 'artwork') return showArtwork(Number(idx));
    if (kind === 'quiz') return showQuiz(Number(idx));
    if (kind === 'endquestions') return showEndQuestions();
    if (kind === 'end') return showEnd();
  }

  /* ---------- Start ---------- */
  let pendingAssignment = null;   // for links with ?p=CODE, fetched on load

  function showStart() {
    const st = C.start;
    render(
      '<section class="screen"><div class="screen-body"><div class="start-inner">' +
        '<p class="eyebrow">' + st.eyebrow + '</p>' +
        '<h1>' + st.title + '</h1>' +
        '<p class="lede">' + st.lede + '</p>' +
        '<p><a class="consent-link" id="info-link" href="participant-info/" target="_blank" rel="noopener">' + st.infoLinkText + ' ↗</a></p>' +
        '<div class="consent-checks">' +
          '<label class="check"><input type="checkbox" id="consent-age"><span>' + st.consentAge + '</span></label>' +
          '<label class="check"><input type="checkbox" id="consent-info"><span>' + st.consentInfo + '</span></label>' +
          '<label class="check"><input type="checkbox" id="consent-agree"><span>' + st.consentAgree + '</span></label>' +
        '</div>' +
        '<div id="width-notice" class="notice" hidden>' + st.desktopOnly + '</div>' +
        '<div id="start-error" class="notice" hidden></div>' +
        '<p class="byline">' + st.researchers.map(esc).join('<br>') + '</p>' +
      '</div></div>' +
      '<footer class="screen-foot"><button class="btn primary" id="start" disabled>' + st.startButton + ' ' + ARROW_R + '</button></footer></section>'
    );
    const boxes = [...document.querySelectorAll('.consent-checks input')];
    const btn = document.getElementById('start');
    const notice = document.getElementById('width-notice');
    let infoLinkClicked = false;
    document.getElementById('info-link').addEventListener('click', () => { infoLinkClicked = true; });

    function update() {
      const narrow = window.innerWidth < CFG.minViewportWidth && MODE === 'live';
      notice.hidden = !narrow;
      btn.disabled = !boxes.every(b => b.checked) || narrow;
    }
    boxes.forEach(b => b.addEventListener('change', update));
    window.addEventListener('resize', update);
    screenCleanup = () => window.removeEventListener('resize', update);
    update();

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const errBox = document.getElementById('start-error');
      try {
        const a = pendingAssignment || await assign();
        S = freshState(a.code, a.sequence, a.source, a.order);
        S.session.consent_link_clicked = infoLinkClicked;
        S.session.consent_ts = new Date().toISOString();
        S.session.consent_version = CFG.consentVersion;
        S.session.start_ms_on_screen = Math.round(performance.now() - pageT0);
        log('consent_given', { consent_link_clicked: infoLinkClicked });
        send({
          type: 'start',
          sequence: S.sequence,
          presentation: S.trials.map(t => t.artworkId + '=' + t.version).join(' > '),
          start_ts: S.startedAt,
          consent_ts: S.session.consent_ts,
          consent_version: S.session.consent_version,
          consent_link_clicked: infoLinkClicked,
          viewport: window.innerWidth + 'x' + window.innerHeight,
          screen: screen.width + 'x' + screen.height + '@' + (window.devicePixelRatio || 1),
          user_agent: navigator.userAgent,
          language: navigator.language,
          mode: MODE
        });
        next();
      } catch (err) {
        errBox.hidden = false;
        errBox.textContent = 'Sorry, the study could not start (' + err.message + '). Please check your connection and try again, or contact ' + CFG.contactEmails.join(' / ') + '.';
        btn.disabled = false;
      }
    });
  }

  async function backendGet(query) {
    const url = new URL(CFG.backendUrl);
    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || 'server error');
    return j;
  }

  async function assign() {
    if (MODE === 'live') {
      const j = await backendGet({ action: 'assign' });
      return { code: j.code, sequence: Number(j.sequence), order: parseOrder(j.order), source: 'open link' };
    }
    const seq = Number(params.get('seq')) || (1 + Math.floor(Math.random() * Object.keys(CFG.latinSquare).length));
    return { code: (MODE === 'preview' ? 'PREVIEW-' : 'PILOT-') + randomCode(4), sequence: seq, order: parseOrder(params.get('order')), source: MODE };
  }

  /* ---------- Background questions ---------- */
  function showBackground() {
    const B = C.background;
    render(
      '<section class="screen"><div class="screen-body"><div class="quiz-inner">' +
        '<h2 class="screen-title">' + B.title + '</h2>' +
        '<fieldset class="qgroup"><legend>' + B.q1 + '</legend>' +
          B.q1Options.map((o, idx) => radioOpt('bg-q1', idx, o)).join('') +
        '</fieldset>' +
        '<div class="collapsible" id="bg-q2-wrap">' +
          '<fieldset class="qgroup" id="bg-q2-group"><legend>' + B.q2 + '</legend>' +
            B.q2Options.map((o, idx) => radioOpt('bg-q2', idx, o)).join('') +
          '</fieldset>' +
        '</div>' +
      '</div></div>' +
      '<footer class="screen-foot"><button class="btn primary" id="next" disabled>' + B.next + ' ' + ARROW_R + '</button></footer></section>'
    );
    const q2Wrap = document.getElementById('bg-q2-wrap');
    const q2Inputs = [...document.querySelectorAll('#bg-q2-group input')];
    const btn = document.getElementById('next');

    function update() {
      const q1 = checkedVal('bg-q1');
      const needsQ2 = q1 === '1';   // index 1 = "No"
      q2Wrap.classList.toggle('open', needsQ2);
      q2Inputs.forEach(i => {
        i.disabled = !needsQ2;
        if (!needsQ2) i.checked = false;
      });
      btn.disabled = !q1 || (needsQ2 && !checkedVal('bg-q2'));
    }
    app.addEventListener('change', update);
    screenCleanup = () => app.removeEventListener('change', update);

    btn.addEventListener('click', () => {
      const q1 = Number(checkedVal('bg-q1'));
      const q2 = checkedVal('bg-q2');
      // BG1 (q1) index 1 = "No". If BG1 = Yes, BG2 is stored as "First language" (spec §2.1).
      S.session.bg1_english_first = B.q1Options[q1];
      S.session.bg2_reading_level = q1 === 1 ? (q2 != null ? B.q2Options[Number(q2)] : '') : 'First language';
      log('background_done');
      send({ type: 'background', bg1_english_first: S.session.bg1_english_first, bg2_reading_level: S.session.bg2_reading_level });
      next();
    });
  }

  /* ---------- Instructions ---------- */
  function showInstructions() {
    const ins = C.instructions;
    render(
      '<section class="screen"><div class="screen-body"><div class="instr-inner">' +
        '<h2 class="screen-title">' + ins.title + '</h2>' +
        ins.paragraphs.map(p => '<p>' + p + '</p>').join('') +
        '<button class="btn primary" id="ready">' + ins.readyButton + '</button>' +
      '</div></div></section>'
    );
    document.getElementById('ready').addEventListener('click', () => {
      S.session.instructions_ms = Math.round(performance.now() - pageT0);
      log('instructions_done');
      next();
    });
  }

  /* ---------- Artwork ---------- */
  function showArtwork(i) {
    const trial = S.trials[i];
    const a = ARTWORKS[trial.artworkId];
    const P = C.artworkPage;
    const v = trial.version;
    const r = S.results[i];
    const regions = a.regions;

    let labelHtml;
    if (v === 'A') {
      labelHtml = '<div class="label-body">' + a.original.map(p => '<p>' + p + '</p>').join('') + '</div>';
    } else if (v === 'B') {
      labelHtml = '<div class="label-body">' + regions.map(rg =>
        '<div class="segment"><h3>' + rg.heading + '</h3><p>' + rg.text + '</p></div>').join('') + '</div>';
    } else {
      labelHtml =
        '<div class="reveal">' +
          '<button class="arrowbtn" id="prev" aria-label="Previous part">' + SVG_LEFT + '</button>' +
          '<div class="reveal-text" id="reveal-text" aria-live="polite"></div>' +
          '<button class="arrowbtn" id="nextpart" aria-label="Next part">' + SVG_RIGHT + '</button>' +
        '</div>' +
        '<div class="reveal-meta"><div class="dots" aria-hidden="true">' +
          regions.map((rg, k) => '<span class="dot" data-k="' + k + '"></span>').join('') +
        '</div><button class="linkbtn" id="whole" hidden>' + P.showWhole + '</button></div>';
    }

    const regionBtns = v === 'C' ? regions.map((rg, k) => {
      const s = rg.shape;
      const m = rg.marker || { x: s.x + s.w / 2, y: s.y + s.h / 2 };
      const bx = (m.x - s.x) / s.w * 100, by = (m.y - s.y) / s.h * 100;
      return '<button class="region" data-k="' + k + '" style="left:' + s.x + '%;top:' + s.y + '%;width:' + s.w + '%;height:' + s.h + '%" aria-label="' +
        esc(P.revealPart + ' ' + (k + 1) + ': ' + rg.heading.replace(/<[^>]+>/g, '')) + '">' +
        '<span class="badge" style="left:' + bx + '%;top:' + by + '%">' + (k + 1) + '</span></button>';
    }).join('') : '';

    render(
      '<section class="screen screen-art">' + posHeader(trial) +
        '<div class="art-layout">' +
          '<figure class="art-figure" id="figure"><div class="art-frame' + (v === 'C' ? ' frame-idle' : '') + '" id="frame">' +
            '<img id="art-img" src="' + esc(a.image) + '" alt="' + esc(a.imageAlt || '') + '" draggable="false">' +
            (v === 'C' ? '<button class="backdrop-btn" id="backdrop" tabindex="-1" aria-hidden="true"></button><div class="spot" id="spot"></div>' + regionBtns : '') +
          '</div></figure>' +
          '<div class="label-col">' + tombstone(a) + labelHtml +
            (a.learnMore ? '<div class="learn-more-row"><button class="linkbtn" id="learn-more-btn">' + P.learnMore + '</button></div>' : '') +
          '</div>' +
        '</div>' +
        '<footer class="screen-foot"><span class="hint" id="hint"></span><button class="btn primary" id="next">' + P.next + ' ' + ARROW_R + '</button></footer>' +
      '</section>'
    );

    /* --- size the image to fit the screen --- */
    const img = document.getElementById('art-img');
    const frame = document.getElementById('frame');
    const figure = document.getElementById('figure');
    function fit() {
      if (!img.naturalWidth) return;
      const maxW = figure.clientWidth;
      const maxH = Math.max(280, window.innerHeight - 190);
      const k = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
      frame.style.width = Math.floor(img.naturalWidth * k) + 'px';
      frame.style.height = Math.floor(img.naturalHeight * k) + 'px';
    }
    if (img.complete) fit(); else img.addEventListener('load', () => { fit(); log('image_loaded'); });
    window.addEventListener('resize', fit);

    /* --- per-trial measures --- */
    const m = {
      learnClicks: 0, learnMs: 0, learnOpenedAt: null,
      regionOrder: [], regionOpens: 0, regionReopens: 0, firstRegionMs: null,
      dwell: Object.fromEntries(regions.map(rg => [rg.id, 0])),
      active: -1, activeSince: null, seen: new Set(), allSeenMs: null, fullViewReturns: 0
    };
    log('artwork_shown', { artwork_id: a.id, version: v });

    /* --- learn more --- */
    const lmBtn = document.getElementById('learn-more-btn');
    const dlg = document.getElementById('learn-more');
    function onDialogClose() {
      if (m.learnOpenedAt != null) {
        m.learnMs += performance.now() - m.learnOpenedAt;
        m.learnOpenedAt = null;
        log('learn_more_close');
        lmBtn && lmBtn.focus();
      }
    }
    if (lmBtn) {
      lmBtn.addEventListener('click', () => {
        document.getElementById('lm-title').innerHTML = a.learnMore.heading;
        document.getElementById('lm-body').innerHTML = a.learnMore.paragraphs.map(p => '<p>' + p + '</p>').join('');
        m.learnClicks++;
        m.learnOpenedAt = performance.now();
        log('learn_more_open');
        dlg.showModal();
      });
      dlg.addEventListener('close', onDialogClose);
    }

    /* --- version C interaction --- */
    const nextBtn = document.getElementById('next');
    const hint = document.getElementById('hint');
    if (v === 'C') {
      const spot = document.getElementById('spot');
      const textBox = document.getElementById('reveal-text');
      const wholeBtn = document.getElementById('whole');
      const regionEls = [...frame.querySelectorAll('.region')];
      const dots = [...document.querySelectorAll('.dot')];

      function closeDwell() {
        if (m.active >= 0 && m.activeSince != null) {
          m.dwell[regions[m.active].id] += performance.now() - m.activeSince;
        }
        m.activeSince = null;
      }

      function paint() {
        regionEls.forEach((el, k) => {
          el.classList.toggle('active', k === m.active);
          el.classList.toggle('seen', m.seen.has(k));
          el.setAttribute('aria-pressed', k === m.active ? 'true' : 'false');
        });
        dots.forEach((d, k) => { d.classList.toggle('active', k === m.active); d.classList.toggle('seen', m.seen.has(k)); });
        frame.classList.toggle('frame-idle', m.active < 0);
        if (m.active >= 0) {
          const s = regions[m.active].shape;
          Object.assign(spot.style, { left: s.x + '%', top: s.y + '%', width: s.w + '%', height: s.h + '%' });
          spot.classList.add('on');
          const rg = regions[m.active];
          textBox.className = 'reveal-text';
          textBox.innerHTML = '<p class="part-no">' + esc(P.revealPart) + ' ' + (m.active + 1) + ' / ' + regions.length + '</p><h3>' + rg.heading + '</h3><p>' + rg.text + '</p>';
          wholeBtn.hidden = false;
        } else {
          spot.classList.remove('on');
          textBox.className = 'reveal-text prompt';
          textBox.innerHTML = '<h3>' + P.revealPromptTitle + '</h3><p>' + P.revealPrompt + '</p>';
          wholeBtn.hidden = true;
        }
        const locked = CFG.requireAllRegions && m.seen.size < regions.length;
        nextBtn.disabled = locked;
        hint.textContent = locked ? P.revealLocked : '';
      }

      function open(k, method) {
        if (k === m.active) return;
        closeDwell();
        const rid = regions[k].id;
        if (m.firstRegionMs == null) m.firstRegionMs = Math.round(performance.now() - pageT0);
        if (m.seen.has(k)) m.regionReopens++;
        m.regionOpens++;
        m.regionOrder.push(rid);
        m.seen.add(k);
        m.active = k;
        m.activeSince = performance.now();
        if (m.seen.size === regions.length && m.allSeenMs == null) m.allSeenMs = Math.round(performance.now() - pageT0);
        log('region_open', { region: rid, method });
        paint();
      }
      function whole(method) {
        if (m.active < 0) return;
        closeDwell();
        m.active = -1;
        m.fullViewReturns++;
        log('full_view', { method });
        paint();
      }

      regionEls.forEach(el => el.addEventListener('click', (e) => { e.stopPropagation(); open(Number(el.dataset.k), 'image'); }));
      document.getElementById('backdrop').addEventListener('click', () => whole('image_background'));
      wholeBtn.addEventListener('click', () => whole('button'));
      document.getElementById('nextpart').addEventListener('click', () => open(m.active < 0 ? 0 : (m.active + 1) % regions.length, 'arrow_next'));
      document.getElementById('prev').addEventListener('click', () => open(m.active < 0 ? regions.length - 1 : (m.active - 1 + regions.length) % regions.length, 'arrow_prev'));
      paint();
      m.closeDwell = closeDwell;
    }

    screenCleanup = () => {
      window.removeEventListener('resize', fit);
      if (lmBtn) dlg.removeEventListener('close', onDialogClose);
    };

    nextBtn.addEventListener('click', () => {
      if (nextBtn.disabled) return;
      if (m.closeDwell) m.closeDwell();
      if (dlg.open) dlg.close();
      const pageMs = performance.now() - pageT0;
      const hiddenMs = visHiddenNow();
      Object.assign(r, {
        page_ms: Math.round(pageMs),
        dwell_ms: Math.round(pageMs - hiddenMs),
        hidden_ms: Math.round(hiddenMs),
        hidden_count: vis.hiddenCount,
        blur_count: vis.blurCount,
        learn_more_clicked: m.learnClicks,
        learn_more_ms: Math.round(m.learnMs),
        viewport: window.innerWidth + 'x' + window.innerHeight,
        image_px: frame.style.width.replace('px', '') + 'x' + frame.style.height.replace('px', '')
      });
      if (v === 'C') {
        Object.assign(r, {
          regions_order: m.regionOrder.join('>'),
          region_opens: m.regionOpens,
          region_reopens: m.regionReopens,
          time_to_first_region_ms: m.firstRegionMs,
          ms_to_all_regions: m.allSeenMs,
          region_dwell_ms: JSON.stringify(Object.fromEntries(Object.entries(m.dwell).map(([k, val]) => [k, Math.round(val)]))),
          returned_to_full_view: m.fullViewReturns
        });
      }
      log('artwork_done');
      // Send the artwork measures now (so they survive a drop-out);
      // the quiz answers update the same row later.
      sendTrial(i);
      next();
    });
  }

  function sendTrial(i) {
    send(Object.assign({ type: 'trial', sequence: S.sequence, events: takeEvents() }, S.results[i]));
  }

  /* ---------- Quiz (shown right after each artwork) ---------- */
  function showQuiz(i) {
    const trial = S.trials[i];
    const a = ARTWORKS[trial.artworkId];
    const Q = C.quiz;
    const questions = a.quizQuestions || [];
    const isSecond = i === 1;   // the 2nd artwork this participant sees, whichever one that is

    // Option order is shuffled per participant, "Not sure" always last (spec §2.2).
    // The radio VALUE stays the option's original index, so correctness checks
    // below don't need to change — only the display order does.
    const shownOrder = questions.map(q => shuffle(q.options.map((_, oi) => oi)));

    const qHtml = questions.map((q, k) =>
      '<fieldset class="qgroup"><legend>' + (k + 1) + '. ' + q.stem + '</legend>' +
        shownOrder[k].map(oi => radioOpt('q' + k, oi, q.options[oi])).join('') +
        radioOpt('q' + k, 'ns', Q.notSure) +
      '</fieldset>'
    ).join('');

    const ratingHtml =
      '<fieldset class="qgroup rating-group"><legend>' + Q.ratingQuestion + '</legend>' +
        numberScale('rating', Q.ratingLowLabel, Q.ratingHighLabel) +
      '</fieldset>';

    const acHtml = isSecond ?
      '<fieldset class="qgroup"><legend>' + Q.attentionCheckText + '</legend>' +
        likertScale('attn', Q.agreeScaleLabels) +
      '</fieldset>' : '';

    render(
      '<section class="screen">' + posHeader(trial) +
        '<div class="screen-body"><div class="quiz-inner">' +
          '<h2 class="screen-title">' + Q.title + '</h2>' +
          qHtml + ratingHtml + acHtml +
        '</div></div>' +
        '<footer class="screen-foot"><button class="btn primary" id="next" disabled>' + Q.next + ' ' + ARROW_R + '</button></footer>' +
      '</section>'
    );

    const btn = document.getElementById('next');
    const required = questions.map((_, k) => 'q' + k).concat(['rating']).concat(isSecond ? ['attn'] : []);
    let firstKeyMs = null;
    const firstClick = {};   // per-field name: ms from page shown to its first click (rt_ms proxy)

    function update(e) {
      const ms = Math.round(performance.now() - pageT0);
      if (firstKeyMs == null) firstKeyMs = ms;
      const name = e && e.target && e.target.name;
      if (name && firstClick[name] == null) firstClick[name] = ms;
      btn.disabled = !required.every(n => checkedVal(n) != null);
    }
    app.addEventListener('change', update);
    screenCleanup = () => app.removeEventListener('change', update);

    btn.addEventListener('click', () => {
      const quizAnswers = questions.map((q, k) => {
        const val = checkedVal('q' + k);
        const picked = val === 'ns' ? Q.notSure : q.options[Number(val)];
        const correct = val !== 'ns' && Number(val) === q.correct_option;
        return { item_id: q.item_id, type: q.type, picked, correct };
      });
      const r = S.results[i];
      Object.assign(r, {
        quiz_answers: JSON.stringify(quizAnswers),
        quiz_correct_count: quizAnswers.filter(x => x.correct).length,
        quiz_ms: Math.round(performance.now() - pageT0),
        quiz_first_key_ms: firstKeyMs,
        r1_rating: Number(checkedVal('rating'))
      });
      log('quiz_done');
      sendTrial(i);

      // One row per item (M1–M5 + R1) for the Responses table (spec §4.3).
      const responseRows = questions.map((q, k) => {
        const val = checkedVal('q' + k);
        const optionsShown = shownOrder[k].map(oi => q.options[oi]).concat([Q.notSure]);
        return {
          item_id: q.item_id, artwork_id: trial.artworkId, version: trial.version, item_type: q.type,
          options_shown: optionsShown.join('>'),
          selected: val === 'ns' ? Q.notSure : q.options[Number(val)],
          correct: val !== 'ns' && Number(val) === q.correct_option,
          not_sure: val === 'ns',
          rt_ms: firstClick['q' + k] != null ? firstClick['q' + k] : ''
        };
      });
      responseRows.push({
        item_id: 'R1', artwork_id: trial.artworkId, version: trial.version, item_type: 'rating',
        options_shown: '', selected: checkedVal('rating'), correct: '', not_sure: false,
        rt_ms: firstClick.rating != null ? firstClick.rating : ''
      });
      send({ type: 'responses', rows: responseRows });

      if (isSecond) {
        // AC1 is a participant-level exclusion field (spec §4.1), not per-trial.
        const attnVal = Number(checkedVal('attn'));
        S.session.attention_answer = attnVal;
        S.session.attention_pass = attnVal === 3;   // "Somewhat disagree" is point 3 of 7
        send({ type: 'attention', attention_answer: attnVal, attention_pass: S.session.attention_pass });
      }
      next();
    });
  }

  /* ---------- Ending questions (after all three artworks) ---------- */
  function showEndQuestions() {
    const EQ = C.endQuestions;
    const seenNames = S.trials.map(t => 'seen-' + t.artworkId);
    const seenGrid = S.trials.map(t => {
      const a = ARTWORKS[t.artworkId];
      const name = 'seen-' + t.artworkId;
      return '<div class="thumb-card">' +
        '<img src="' + esc(a.image) + '" alt="' + esc(a.imageAlt || '') + '"><span class="thumb-title">' + esc(a.title) + '</span>' +
        '<div class="mini-radios" role="radiogroup" aria-label="' + esc(EQ.seenBeforeTitle + ' — ' + a.title) + '">' +
          EQ.seenBeforeOptions.map((o, idx) => radioOpt(name, idx, o)).join('') +
        '</div>' +
      '</div>';
    }).join('');
    const thumbs = S.trials.map(t => {
      const a = ARTWORKS[t.artworkId];
      return '<label class="thumb-opt"><input type="radio" name="helpful" value="' + esc(t.artworkId) + '">' +
        '<img src="' + esc(a.image) + '" alt="' + esc(a.imageAlt || '') + '"><span>' + esc(a.title) + '</span></label>';
    }).join('');

    render(
      '<section class="screen"><div class="screen-body"><div class="quiz-inner">' +
        '<h2 class="screen-title">' + EQ.title + '</h2>' +
        '<fieldset class="qgroup"><legend>' + EQ.seenBeforeTitle + '</legend>' +
          '<div class="thumb-grid seen-grid">' + seenGrid + '</div>' +
        '</fieldset>' +
        '<fieldset class="qgroup"><legend>' + EQ.helpfulQ + '</legend>' +
          '<div class="thumb-grid">' + thumbs + '</div>' +
          '<label class="field-label" for="helpful-why">' + EQ.helpfulWhyLabel + '</label>' +
          '<textarea id="helpful-why" class="small-area" spellcheck="false"></textarea>' +
        '</fieldset>' +
        '<fieldset class="qgroup"><legend>' + EQ.missingQ + '</legend>' +
          '<textarea id="missing" class="small-area" placeholder="' + esc(EQ.missingPlaceholder) + '" spellcheck="false"></textarea>' +
        '</fieldset>' +
        '<fieldset class="qgroup"><legend>' + EQ.interviewQ + '</legend>' +
          EQ.interviewOptions.map((o, idx) => radioOpt('interview', idx, o)).join('') +
          '<div id="interview-email-wrap" hidden><label class="field-label" for="interview-email">' + EQ.interviewEmailLabel + '</label>' +
            '<input type="email" id="interview-email" autocomplete="off">' +
          '</div>' +
        '</fieldset>' +
      '</div></div>' +
      '<footer class="screen-foot"><button class="btn primary" id="next" disabled>' + EQ.next + ' ' + ARROW_R + '</button></footer></section>'
    );

    const btn = document.getElementById('next');
    const emailWrap = document.getElementById('interview-email-wrap');

    function update() {
      emailWrap.hidden = checkedVal('interview') !== '0';   // index 0 = "Yes"
      btn.disabled = !seenNames.every(n => checkedVal(n) != null) || !checkedVal('helpful');
    }
    app.addEventListener('change', update);
    screenCleanup = () => app.removeEventListener('change', update);

    btn.addEventListener('click', () => {
      // E1 (familiar) is per-artwork, so it's stored on each Trial row
      // (spec §4.2), not bundled into the Session row.
      S.trials.forEach(t => {
        const familiar = EQ.seenBeforeOptions[Number(checkedVal('seen-' + t.artworkId))];
        send({ type: 'trial', artwork_id: t.artworkId, familiar });
      });
      const helpfulId = checkedVal('helpful');
      const helpfulReason = document.getElementById('helpful-why').value.trim();
      const missingText = document.getElementById('missing').value.trim();
      const wantsInterview = checkedVal('interview') === '0';
      const email = document.getElementById('interview-email').value.trim();

      S.session.e2_artwork_id = helpfulId;
      S.session.e2_text = helpfulReason;
      S.session.e3_text = missingText;
      S.session.interview_optin = wantsInterview;

      log('endquestions_done');
      send({
        type: 'endquestions',
        e2_artwork_id: helpfulId,
        e2_text: helpfulReason,
        e3_text: missingText,
        interview_optin: wantsInterview
      });
      if (email) send({ type: 'interview', email });
      next();
    });
  }

  /* ---------- End ---------- */
  function showEnd() {
    const E = C.end;
    if (!S.completed) {
      S.completed = true;
      const totalMs = Date.now() - new Date(S.startedAt).getTime();
      send(Object.assign({
        type: 'complete',
        sequence: S.sequence,
        end_ts: new Date().toISOString(),
        completed: true,
        total_ms: totalMs,
        events: takeEvents()
      }, S.session));
      save();
    }
    render(
      '<section class="screen"><div class="screen-body"><div class="end-inner">' +
        '<h1>' + E.title + '</h1>' +
        E.debriefParagraphs.map(p => '<p class="lede">' + p + '</p>').join('') +
        '<div class="end-section"><h3>' + E.codeLabel + '</h3><div class="code-box">' + esc(S.code) + '</div><p class="small">' + E.codeHelp + '</p></div>' +
        '<div class="end-section"><h3>' + E.contactLabel + '</h3><p>' + CFG.contactEmails.map(e => '<a href="mailto:' + esc(e) + '">' + esc(e) + '</a>').join('<br>') + '</p></div>' +
        (MODE !== 'live' ? '<div class="end-section"><button class="btn" id="download">Download this session’s data (JSON)</button><p class="small">Shown in pilot and preview mode only.</p></div>' : '') +
      '</div></div></section>'
    );
    const dl = document.getElementById('download');
    if (dl) dl.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify({ code: S.code, sequence: S.sequence, trials: S.trials, results: S.results, session: S.session, sent: outbox }, null, 2)], { type: 'application/json' });
      const aEl = document.createElement('a');
      aEl.href = URL.createObjectURL(blob);
      aEl.download = 'session-' + S.code + '.json';
      aEl.click();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Artwork content (loaded from content/artworks/*.md at boot)       */
  /* ------------------------------------------------------------------ */
  /** Parses one content/artworks/*.md file into { original, regions }. */
  function parseArtworkContent(md) {
    const aMatch = md.match(/##\s*Version A[^\n]*\n+([\s\S]*?)(?=\n##\s|$)/);
    const original = aMatch
      ? aMatch[1].split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
      : [];

    const bcMatch = md.match(/##\s*Version B\/C segments[^\n]*\n+([\s\S]*)/);
    const regions = [];
    if (bcMatch) {
      const re = /###\s*(.+?)\s*\(([Rr]\d+)\)\s*\n+([\s\S]*?)(?=\n###\s|$)/g;
      let m;
      while ((m = re.exec(bcMatch[1]))) {
        regions.push({
          heading: m[1].trim(),
          id: m[2].toLowerCase(),
          text: m[3].split(/\n{2,}/).map(p => p.trim()).filter(Boolean).join(' ')
        });
      }
    }
    return { original, regions };
  }

  /** Fetches each artwork's content/artworks/*.md and merges the wording in. */
  async function loadArtworkContent() {
    await Promise.all(C.artworks.map(async a => {
      if (!a.content) return;
      const res = await fetch(a.content);
      if (!res.ok) throw new Error('could not load ' + a.content);
      const parsed = parseArtworkContent(await res.text());
      a.original = parsed.original;
      a.regions.forEach(rg => {
        const found = parsed.regions.find(p => p.id === rg.id);
        if (found) { rg.heading = found.heading; rg.text = found.text; }
      });
    }));
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                               */
  /* ------------------------------------------------------------------ */
  function fatal(msg) {
    render('<section class="screen"><div class="screen-body"><div class="error-box"><h2 class="screen-title">Sorry</h2><p>' + msg + '</p><p>' +
      CFG.contactEmails.map(e => '<a href="mailto:' + esc(e) + '">' + esc(e) + '</a>').join(' · ') + '</p></div></div></section>');
  }

  async function boot() {
    try {
      await loadArtworkContent();
    } catch (err) {
      return fatal('The artwork texts could not be loaded (' + esc(err.message) + '). Please try again.');
    }
    if (MODE === 'live') flush();
    const p = (params.get('p') || '').trim().toUpperCase();

    if (MODE === 'preview') { S = null; return showStart(); }

    // Resume an unfinished session after a reload
    const resumeCode = p || (function () { try { return localStorage.getItem(STORE_PREFIX + 'last'); } catch (e) { return null; } })();
    const saved = resumeCode ? loadSaved(resumeCode) : null;
    if (saved && saved.steps && (saved.code === p || !p)) {
      // Live: a finished participant who reopens the link sees the thank-you page again.
      // Pilot: start over, so the same browser can test several runs.
      if (saved.completed && MODE === 'live') { S = saved; S.step = S.steps.length - 1; return showEnd(); }
      if (saved.step > 0 && !saved.completed) {
        S = saved;
        S.session.resumed_count = (S.session.resumed_count || 0) + 1;
        pageT0 = performance.now();
        log('resumed');
        return show();
      }
    }

    if (p && MODE === 'live') {
      try {
        const j = await backendGet({ action: 'get', p });
        if (j.status === 'completed') return fatal('This link has already been used to complete the study. Thank you for taking part!');
        pendingAssignment = { code: j.code, sequence: Number(j.sequence), order: parseOrder(j.order), source: 'personal link' };
      } catch (err) {
        return fatal('This study link is not valid (' + esc(err.message) + '). Please check that you copied the whole link.');
      }
    }
    showStart();
  }

  boot();
})();
