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
    const steps = ['start', 'instructions'];
    const placement = recallPlacement();
    trials.forEach((t, i) => {
      steps.push('artwork:' + i);
      if (placement === 'afterEach') { steps.push('recallH:' + i); steps.push('recallD:' + i); }
    });
    if (placement === 'end') {
      trials.forEach((t, i) => { steps.push('recallH:' + i); steps.push('recallD:' + i); });
    }
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

  function recallPlacement() {
    if (CFG.recallPlacement) return CFG.recallPlacement;
    return CFG.recallAfterEach === false ? 'none' : 'afterEach';   // older config files
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
    if (kind === 'instructions') return showInstructions();
    if (kind === 'artwork') return showArtwork(Number(idx));
    if (kind === 'recallH') return showRecall(Number(idx), 'holistic');
    if (kind === 'recallD') return showRecall(Number(idx), 'detail');
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
        '<p><a class="consent-link" id="consent-link" href="' + esc(CFG.consentFormUrl) + '" target="_blank" rel="noopener">' + st.consentLinkText + ' ↗</a></p>' +
        '<label class="check"><input type="checkbox" id="consent"><span>' + st.consentCheckbox + '</span></label>' +
        '<div id="width-notice" class="notice" hidden>' + st.desktopOnly + '</div>' +
        '<div id="start-error" class="notice" hidden></div>' +
        '<p class="byline">' + st.researchers.map(esc).join('<br>') + '</p>' +
      '</div></div>' +
      '<footer class="screen-foot"><button class="btn primary" id="start" disabled>' + st.startButton + ' ' + ARROW_R + '</button></footer></section>'
    );
    const box = document.getElementById('consent');
    const btn = document.getElementById('start');
    const notice = document.getElementById('width-notice');
    let consentClicked = false;
    document.getElementById('consent-link').addEventListener('click', () => { consentClicked = true; });

    function update() {
      const narrow = window.innerWidth < CFG.minViewportWidth && MODE === 'live';
      notice.hidden = !narrow;
      btn.disabled = !box.checked || narrow;
    }
    box.addEventListener('change', update);
    window.addEventListener('resize', update);
    screenCleanup = () => window.removeEventListener('resize', update);
    update();

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const errBox = document.getElementById('start-error');
      try {
        const a = pendingAssignment || await assign();
        S = freshState(a.code, a.sequence, a.source, a.order);
        S.session.consent_link_clicked = consentClicked;
        S.session.start_ms_on_screen = Math.round(performance.now() - pageT0);
        log('consent_given', { consent_link_clicked: consentClicked });
        send({
          type: 'start',
          sequence: S.sequence,
          presentation: S.trials.map(t => t.artworkId + '=' + t.version).join(' > '),
          started_at: S.startedAt,
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
        visible_ms: Math.round(pageMs - hiddenMs),
        hidden_ms: Math.round(hiddenMs),
        hidden_count: vis.hiddenCount,
        blur_count: vis.blurCount,
        learn_more_clicks: m.learnClicks,
        learn_more_ms: Math.round(m.learnMs),
        viewport: window.innerWidth + 'x' + window.innerHeight,
        image_px: frame.style.width.replace('px', '') + 'x' + frame.style.height.replace('px', '')
      });
      if (v === 'C') {
        Object.assign(r, {
          region_order: m.regionOrder.join('>'),
          region_opens: m.regionOpens,
          region_reopens: m.regionReopens,
          time_to_first_region_ms: m.firstRegionMs,
          all_regions_seen_ms: m.allSeenMs,
          region_dwell_ms: JSON.stringify(Object.fromEntries(Object.entries(m.dwell).map(([k, val]) => [k, Math.round(val)]))),
          full_view_returns: m.fullViewReturns
        });
      }
      log('artwork_done');
      // Send the artwork measures now (so they survive a drop-out);
      // the recall answers update the same row later.
      sendTrial(i);
      next();
    });
  }

  function sendTrial(i) {
    send(Object.assign({ type: 'trial', sequence: S.sequence, events: takeEvents() }, S.results[i]));
  }

  /* ---------- Recall ---------- */
  function showRecall(i, which) {
    const trial = S.trials[i];
    const a = ARTWORKS[trial.artworkId];
    const R = C.recall;
    const prompt = which === 'holistic' ? R.holistic : R.detail;
    render(
      '<section class="screen">' + posHeader(trial) +
        '<div class="screen-body"><div class="recall-inner">' +
          '<img class="recall-thumb" src="' + esc(a.image) + '" alt="' + esc(a.imageAlt || '') + '">' +
          '<div><p class="recall-intro">' + R.intro + '</p>' +
            '<label class="recall-q" for="answer">' + prompt + '</label>' +
            '<textarea id="answer" spellcheck="false" autocomplete="off"></textarea>' +
          '</div>' +
        '</div></div>' +
        '<footer class="screen-foot"><button class="btn primary" id="next" disabled>' + R.next + ' ' + ARROW_R + '</button></footer>' +
      '</section>'
    );
    const ta = document.getElementById('answer');
    const btn = document.getElementById('next');
    ta.focus();
    let firstKeyMs = null;
    ta.addEventListener('input', () => {
      if (firstKeyMs == null) firstKeyMs = Math.round(performance.now() - pageT0);
      btn.disabled = ta.value.trim().length === 0;
    });
    btn.addEventListener('click', () => {
      const r = S.results[i];
      const ms = Math.round(performance.now() - pageT0);
      if (which === 'holistic') {
        r.recall_holistic = ta.value.trim();
        r.recall_holistic_ms = ms;
        r.recall_holistic_first_key_ms = firstKeyMs;
      } else {
        r.recall_detail = ta.value.trim();
        r.recall_detail_ms = ms;
        r.recall_detail_first_key_ms = firstKeyMs;
      }
      r.recall_hidden_ms = (r.recall_hidden_ms || 0) + Math.round(visHiddenNow());
      log('recall_' + which + '_done');
      if (which === 'detail') sendTrial(i);
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
        completed_at: new Date().toISOString(),
        total_ms: totalMs,
        events: takeEvents()
      }, S.session));
      save();
    }
    const qUrl = CFG.questionnaireUrl.replace('{code}', encodeURIComponent(S.code));
    render(
      '<section class="screen"><div class="screen-body"><div class="end-inner">' +
        '<h1>' + E.title + '</h1>' +
        '<p class="lede">' + E.body + '</p>' +
        '<a class="btn primary" id="q-link" href="' + esc(qUrl) + '" target="_blank" rel="noopener">' + E.questionnaireButton + ' ' + ARROW_R + '</a>' +
        '<div class="end-section"><h3>' + E.codeLabel + '</h3><div class="code-box">' + esc(S.code) + '</div><p class="small">' + E.codeHelp + '</p></div>' +
        '<div class="end-section"><h3>' + E.contactLabel + '</h3><p>' + CFG.contactEmails.map(e => '<a href="mailto:' + esc(e) + '">' + esc(e) + '</a>').join('<br>') + '</p></div>' +
        (MODE !== 'live' ? '<div class="end-section"><button class="btn" id="download">Download this session’s data (JSON)</button><p class="small">Shown in pilot and preview mode only.</p></div>' : '') +
      '</div></div></section>'
    );
    document.getElementById('q-link').addEventListener('click', () => {
      log('questionnaire_click');
      send({ type: 'event', events: takeEvents() });
    });
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
  /* Boot                                                               */
  /* ------------------------------------------------------------------ */
  function fatal(msg) {
    render('<section class="screen"><div class="screen-body"><div class="error-box"><h2 class="screen-title">Sorry</h2><p>' + msg + '</p><p>' +
      CFG.contactEmails.map(e => '<a href="mailto:' + esc(e) + '">' + esc(e) + '</a>').join(' · ') + '</p></div></div></section>');
  }

  async function boot() {
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
