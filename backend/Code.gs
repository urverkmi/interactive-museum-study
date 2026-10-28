/**
 * Backend for the online museum study — a Google Sheet + Apps Script web app.
 * Setup: see README.md, step 2.
 *
 * Tabs it creates in the Sheet:
 *   Assignments  who got which link and sequence (the ONLY tab with names — keep it private)
 *   Sessions     one row per participant: timing, screen size, completion
 *   Trials       one row per participant × artwork: version, times, Learn more, regions, recall answers
 *   Events       raw click-level log (one row per event)
 */

// 1. Change this before deploying. The control panel asks for it.
const ADMIN_KEY = 'CHANGE-ME-to-something-long';

// 2. Keep identical to latinSquare in config.js.
const LATIN_SQUARE = {
  1: { art1: 'A', art2: 'B', art3: 'C' },
  2: { art1: 'B', art2: 'C', art3: 'A' },
  3: { art1: 'C', art2: 'A', art3: 'B' }
};
const ARTWORK_IDS = ['art1', 'art2', 'art3'];

const HEADERS = {
  Assignments: ['code', 'label', 'note', 'sequence', 'art1', 'art2', 'art3', 'source', 'created_at', 'started_at', 'completed_at', 'status', 'order'],
  Sessions: ['code', 'sequence', 'presentation', 'mode', 'started_at', 'completed_at', 'total_ms', 'instructions_ms',
             'consent_link_clicked', 'resumed_count', 'viewport', 'screen', 'language', 'user_agent', 'questionnaire_clicked'],
  Trials: ['received_at', 'code', 'sequence', 'position', 'artwork_id', 'version',
           'page_ms', 'visible_ms', 'hidden_ms', 'hidden_count', 'blur_count',
           'learn_more_clicks', 'learn_more_ms',
           'region_order', 'region_opens', 'region_reopens', 'time_to_first_region_ms', 'all_regions_seen_ms',
           'region_dwell_ms', 'full_view_returns',
           'recall_holistic', 'recall_holistic_ms', 'recall_holistic_first_key_ms',
           'recall_detail', 'recall_detail_ms', 'recall_detail_first_key_ms', 'recall_hidden_ms',
           'viewport', 'image_px'],
  Events: ['received_at', 'code', 'at', 'screen', 't_ms', 'type', 'details']
};

/** Run once from the editor (select "setup" ▸ Run) to create the tabs. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
  const def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Blad1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);
}

/* ------------------------------------------------------------------ */
/* HTTP entry points                                                  */
/* ------------------------------------------------------------------ */
function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    switch (p.action) {
      case 'ping':   return json({ ok: true });
      case 'get':    return json(getAssignment_(String(p.p || '').toUpperCase()));
      case 'assign': return json(createAssignment_('(open link)', '', 'auto', 'open link'));
      case 'create': requireKey_(p.key); return json(createAssignment_(p.label || '', p.note || '', p.seq || 'auto', 'control panel'));
      case 'list':   requireKey_(p.key); return json(list_());
      case 'void':   requireKey_(p.key); return json(setStatus_(String(p.p || '').toUpperCase(), 'void'));
      default:       return json({ ok: false, error: 'unknown action' });
    }
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents);
    const code = String(d.code || '').toUpperCase();
    const row = findRow_('Assignments', code);
    if (!row) return json({ ok: false, error: 'unknown code' });
    const now = new Date().toISOString();

    if (d.type === 'start') {
      const a = getRowObject_('Assignments', row);
      if (a.status !== 'completed') {
        updateRow_('Assignments', row, { started_at: a.started_at || now, status: 'in progress' });
      }
      upsert_('Sessions', code, Object.assign({}, d, { code: code }));
    } else if (d.type === 'trial') {
      // Sent once after the artwork page and again with the recall answers: update the same row.
      const obj = Object.assign({}, d, { code: code, received_at: now });
      const tr = findTrialRow_(code, d.artwork_id);
      if (tr) updateRow_('Trials', tr, obj); else append_('Trials', obj);
    } else if (d.type === 'complete') {
      updateRow_('Assignments', row, { completed_at: d.completed_at || now, status: 'completed' });
      upsert_('Sessions', code, Object.assign({}, d, { code: code }));
    } else if (d.type === 'event') {
      if ((d.events || []).some(function (ev) { return ev.type === 'questionnaire_click'; })) {
        upsert_('Sessions', code, { code: code, questionnaire_clicked: true });
      }
    }

    if (d.events && d.events.length) {
      const sh = sheet_('Events');
      const rows = d.events.map(function (ev) {
        const details = Object.assign({}, ev);
        ['at', 'screen', 't_ms', 'type'].forEach(function (k) { delete details[k]; });
        return [now, code, ev.at, ev.screen, ev.t_ms, ev.type, Object.keys(details).length ? JSON.stringify(details) : ''].map(safe_);
      });
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }
    return json({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

/* ------------------------------------------------------------------ */
/* Assignment                                                         */
/* ------------------------------------------------------------------ */
function createAssignment_(label, note, seq, source) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_('Assignments');
    const rows = readAll_('Assignments');
    let sequence;
    if (seq === 'auto' || !seq) {
      sequence = nextSequence_(rows);
    } else {
      sequence = Number(seq);
      if (!LATIN_SQUARE[sequence]) throw new Error('bad sequence');
    }
    const existing = {};
    rows.forEach(function (r) { existing[r.code] = true; });
    let code;
    do { code = randomCode_(6); } while (existing[code]);
    const map = LATIN_SQUARE[sequence];
    const order = nextOrder_(rows, sequence);
    const obj = {
      code: code, label: label, note: note, sequence: sequence,
      art1: map.art1, art2: map.art2, art3: map.art3,
      source: source, created_at: new Date().toISOString(), status: 'not started',
      order: order.join(' > ')
    };
    sh.appendRow(HEADERS.Assignments.map(function (h) { return safe_(obj[h]); }));
    return { ok: true, code: code, sequence: sequence, versions: map, order: obj.order, label: label };
  } finally {
    lock.releaseLock();
  }
}

/** Balanced rotation: the sequence with the fewest non-void assignments; ties → lowest number. */
function nextSequence_(rows) {
  const counts = {};
  Object.keys(LATIN_SQUARE).forEach(function (s) { counts[s] = 0; });
  rows.forEach(function (r) {
    if (r.status !== 'void' && counts[r.sequence] !== undefined) counts[r.sequence]++;
  });
  return Number(Object.keys(counts).sort(function (a, b) { return counts[a] - counts[b] || a - b; })[0]);
}

/**
 * Balanced random page order: among the 6 possible orders of the artworks,
 * pick one of those used least often so far within this sequence (non-void links),
 * breaking ties at random.
 */
function nextOrder_(rows, sequence) {
  const perms = permutations_(ARTWORK_IDS);
  const used = {};
  perms.forEach(function (p) { used[p.join(' > ')] = 0; });
  rows.forEach(function (r) {
    if (r.status !== 'void' && Number(r.sequence) === Number(sequence) && used[r.order] !== undefined) used[r.order]++;
  });
  let min = Infinity;
  Object.keys(used).forEach(function (k) { min = Math.min(min, used[k]); });
  const candidates = perms.filter(function (p) { return used[p.join(' > ')] === min; });
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function permutations_(a) {
  if (a.length <= 1) return [a.slice()];
  const out = [];
  a.forEach(function (x, i) {
    const rest = a.slice(0, i).concat(a.slice(i + 1));
    permutations_(rest).forEach(function (p) { out.push([x].concat(p)); });
  });
  return out;
}

function getAssignment_(code) {
  if (!code) throw new Error('missing code');
  const row = findRow_('Assignments', code);
  if (!row) throw new Error('unknown code');
  const a = getRowObject_('Assignments', row);
  if (a.status === 'void') throw new Error('this link has been withdrawn');
  return { ok: true, code: a.code, sequence: Number(a.sequence), order: a.order, status: a.status };
}

function setStatus_(code, status) {
  const row = findRow_('Assignments', code);
  if (!row) throw new Error('unknown code');
  updateRow_('Assignments', row, { status: status });
  return { ok: true };
}

function list_() {
  const rows = readAll_('Assignments');
  const summary = {};
  Object.keys(LATIN_SQUARE).forEach(function (s) { summary[s] = { assigned: 0, started: 0, completed: 0, void: 0 }; });
  rows.forEach(function (r) {
    const s = summary[r.sequence];
    if (!s) return;
    if (r.status === 'void') { s.void++; return; }
    s.assigned++;
    if (r.status === 'in progress') s.started++;
    if (r.status === 'completed') s.completed++;
  });
  return {
    ok: true,
    sheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl(),
    latinSquare: LATIN_SQUARE,
    nextSequence: nextSequence_(rows),
    summary: summary,
    assignments: rows
  };
}

function requireKey_(key) {
  if (ADMIN_KEY.indexOf('CHANGE-ME') === 0) throw new Error('set ADMIN_KEY in Code.gs and redeploy');
  if (!key || key !== ADMIN_KEY) throw new Error('wrong admin key');
}

/* ------------------------------------------------------------------ */
/* Sheet helpers                                                      */
/* ------------------------------------------------------------------ */
function sheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function readAll_(name) {
  const sh = sheet_(name);
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  const vals = sh.getRange(2, 1, n, HEADERS[name].length).getValues();
  return vals.map(function (v) {
    const o = {};
    HEADERS[name].forEach(function (h, i) { o[h] = v[i] instanceof Date ? v[i].toISOString() : v[i]; });
    return o;
  });
}

/** Row number (1-based, incl. header) whose first column equals key, or 0. */
function findRow_(name, key) {
  if (!key) return 0;
  const sh = sheet_(name);
  const n = sh.getLastRow() - 1;
  if (n < 1) return 0;
  const col = sh.getRange(2, 1, n, 1).getValues();
  for (let i = 0; i < col.length; i++) if (String(col[i][0]) === key) return i + 2;
  return 0;
}

function findTrialRow_(code, artworkId) {
  const sh = sheet_('Trials');
  const n = sh.getLastRow() - 1;
  if (n < 1 || !artworkId) return 0;
  const ci = HEADERS.Trials.indexOf('code'), ai = HEADERS.Trials.indexOf('artwork_id');
  const vals = sh.getRange(2, 1, n, HEADERS.Trials.length).getValues();
  for (let i = 0; i < vals.length; i++) if (String(vals[i][ci]) === code && String(vals[i][ai]) === String(artworkId)) return i + 2;
  return 0;
}

function getRowObject_(name, row) {
  const v = sheet_(name).getRange(row, 1, 1, HEADERS[name].length).getValues()[0];
  const o = {};
  HEADERS[name].forEach(function (h, i) { o[h] = v[i] instanceof Date ? v[i].toISOString() : v[i]; });
  return o;
}

function updateRow_(name, row, patch) {
  const sh = sheet_(name);
  Object.keys(patch).forEach(function (k) {
    const c = HEADERS[name].indexOf(k);
    if (c >= 0 && patch[k] !== undefined && patch[k] !== null) sh.getRange(row, c + 1).setValue(safe_(patch[k]));
  });
}

function append_(name, obj) {
  sheet_(name).appendRow(HEADERS[name].map(function (h) { return safe_(obj[h]); }));
}

function upsert_(name, key, obj) {
  const row = findRow_(name, key);
  if (row) updateRow_(name, row, obj);
  else append_(name, obj);
}

/** Stops participant text like "=..." from being run as a spreadsheet formula. */
function safe_(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'object') v = JSON.stringify(v);
  if (typeof v === 'string' && /^[=+\-@]/.test(v)) return "'" + v;
  return v;
}

function randomCode_(n) {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < n; i++) s += abc.charAt(Math.floor(Math.random() * abc.length));
  return s;
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
