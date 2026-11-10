// Level play: load a level, run Pip on the player's text, render the trace and outcome.
// Player text is only ever written with textContent (never innerHTML) and never loaded as an image.
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const H = window.Heist;
  const LEVELS = window.HeistLevels;
  const S = window.HeistStore;
  if (!H || !LEVELS || !S || !$('payload')) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = window.matchMedia('(max-width: 1000px)');
  const CHANNEL = { email: 'an email', image: 'an image request', human: 'Dana herself' };

  let idx = 0;
  let attempts = 0;
  let hintsUsed = 0;

  /* ── level bar ── */
  const bar = $('levelbar');
  LEVELS.forEach((lv, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lvl';
    b.setAttribute('aria-label', 'Level ' + lv.id + ': ' + lv.name);
    const n = document.createElement('span'); n.className = 'n'; n.textContent = String(lv.id);
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = lv.name;
    const st = document.createElement('span'); st.className = 'st';
    b.append(n, nm, st);
    b.addEventListener('click', () => load(i));
    bar.appendChild(b);
  });
  const fin = document.createElement('a');
  fin.className = 'lvl fin';
  fin.href = '#defend';
  const finName = document.createElement('span');
  finName.className = 'nm';
  finName.textContent = 'Switch sides →';
  fin.appendChild(finName);
  bar.appendChild(fin);

  const starStr = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

  function paintBar(state) {
    [...bar.querySelectorAll('button.lvl')].forEach((b, i) => {
      const stars = state.levels[LEVELS[i].id] || 0;
      b.classList.toggle('done', stars > 0);
      b.querySelector('.st').textContent = stars ? starStr(stars) : '';
      if (i === idx) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    const saved = state.levels[LEVELS[idx].id] || 0;
    $('lv-stars').textContent = saved ? 'Your best: ' + starStr(saved) : '';
  }

  /* ── rendering helpers ── */
  function withSecret(parent, str) {
    const parts = String(str).split(H.SECRET);
    parts.forEach((p, i) => {
      if (i > 0) { const m = document.createElement('mark'); m.className = 'secret'; m.textContent = H.SECRET; parent.appendChild(m); }
      if (p) parent.appendChild(document.createTextNode(p));
    });
  }
  const block = (cls, label) => {
    const d = document.createElement('div');
    d.className = cls;
    const b = document.createElement('b');
    b.textContent = label;
    d.appendChild(b);
    return d;
  };
  const para = (cls, text) => {
    const p = document.createElement('p');
    if (cls) p.className = cls;
    p.textContent = text;
    return p;
  };

  function clearPanes() {
    const tr = $('pane-trace');
    tr.textContent = '';
    const li = document.createElement('li');
    li.className = 'info';
    li.textContent = 'Press Run Pip to see how Pip handles your text, step by step.';
    tr.appendChild(li);
    $('pane-view').textContent = '(nothing yet)';
    $('pane-attacker').textContent = '';
    $('pane-attacker').appendChild(para('muted', 'Nothing received yet.'));
    $('pane-dana').textContent = '';
    $('pane-dana').appendChild(para('muted', 'Pip hasn’t run yet.'));
    $('banner').hidden = true;
    $('debrief').hidden = true;
  }

  function render(r, showDana) {
    const tr = $('pane-trace');
    tr.textContent = '';
    r.trace.forEach((s) => {
      const li = document.createElement('li');
      li.className = s.kind;
      li.textContent = s.msg;
      tr.appendChild(li);
    });
    $('pane-view').textContent = r.view || '(empty)';

    const att = $('pane-attacker');
    att.textContent = '';
    const external = r.outbox.filter((m) => !/@northwind\.test$/i.test(m.to));
    external.forEach((m) => {
      const d = block('mail', 'Inbox of ' + m.to);
      d.appendChild(document.createTextNode('Subject: ' + m.subject));
      d.appendChild(document.createElement('br'));
      withSecret(d, m.body);
      att.appendChild(d);
    });
    r.serverLog.filter((l) => !/(^|\.)northwind\.test$/.test(l.host)).forEach((l) => {
      const d = block('log', 'Request to ' + l.host);
      withSecret(d, 'GET ' + l.path + l.query);
      att.appendChild(d);
    });
    if (!att.childNodes.length) att.appendChild(para('muted', 'Nothing received.'));

    const dana = $('pane-dana');
    dana.textContent = '';
    const pre = document.createElement('pre');
    pre.textContent = r.summary;
    dana.appendChild(pre);
    r.approvals.forEach((a) => {
      const d = document.createElement('div');
      d.className = 'approval';
      d.textContent = 'Approval dialog → ' + (a.approved ? 'Allowed' : 'Denied') + ': email ' + a.to + ' ("' + a.subject + '")';
      dana.appendChild(d);
    });
    if (!r.leaked) dana.appendChild(para('note', r.danaNote));
  }

  function showBanner(kind, text) {
    const b = $('banner');
    b.hidden = false;
    b.className = 'banner ' + kind;
    b.textContent = text;
  }

  /* ── level loading ── */
  function load(i) {
    idx = Math.max(0, Math.min(LEVELS.length - 1, i));
    const lv = LEVELS[idx];
    attempts = 0;
    hintsUsed = 0;
    $('lv-eyebrow').textContent = 'Level ' + lv.id + ' of ' + LEVELS.length;
    $('lv-title').textContent = lv.name;
    $('lv-story').textContent = lv.story;
    $('lv-goal').textContent = lv.goal;
    const chips = $('lv-defenses');
    chips.textContent = '';
    lv.defenses.forEach((d) => {
      const li = document.createElement('li');
      if (d === 'none') { li.className = 'none'; li.textContent = 'No defenses'; } else li.textContent = d;
      chips.appendChild(li);
    });
    $('src-label').textContent = 'You control: ' + lv.source;
    const ta = $('payload');
    ta.value = '';
    ta.placeholder = lv.placeholder;
    $('count').textContent = '0 / ' + H.MAX_LEN;
    const hb = $('hint-box');
    hb.hidden = true;
    hb.textContent = '';
    $('hint').disabled = false;
    $('hint').textContent = 'Hint (0/' + lv.hints.length + ')';
    clearPanes();
    paintBar(S.get());
  }

  /* ── run ── */
  function run() {
    const lv = LEVELS[idx];
    const text = $('payload').value.slice(0, H.MAX_LEN);
    attempts++;
    const r = H.runAgent(lv.flags, text);
    render(r);
    if (r.leaked) {
      const stars = Math.max(1, 3 - Math.min(2, hintsUsed) - (attempts > 4 ? 1 : 0));
      S.setStars(lv.id, stars);
      showBanner('win', 'Heist complete: the key left via ' + (CHANNEL[r.channel] || 'a side channel') + '. ' + starStr(stars));
      showDebrief(lv);
    } else {
      $('debrief').hidden = true;
      const nudge = attempts >= 2 && hintsUsed === 0 ? ' Stuck? A hint costs a star, but it’s there.' : '';
      showBanner('lose', 'Pip held the line. Read the trace, change your text, and try again.' + nudge);
    }
    if (narrow.matches) {
      $('pane-trace').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  }

  function showDebrief(lv) {
    const d = lv.debrief;
    $('db-title').textContent = d.title;
    $('db-text').textContent = d.text;
    $('db-fix').textContent = d.fix;
    const refs = $('db-refs');
    refs.textContent = '';
    d.refs.forEach((ref) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = ref.href;
      a.rel = 'noopener noreferrer';
      a.textContent = ref.label;
      li.appendChild(a);
      refs.appendChild(li);
    });
    $('next').textContent = idx < LEVELS.length - 1 ? 'Next level →' : 'Switch sides →';
    $('debrief').hidden = false;
  }

  /* ── wiring ── */
  $('run').addEventListener('click', run);
  $('payload').addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); run(); } });
  $('payload').addEventListener('input', () => { $('count').textContent = $('payload').value.length + ' / ' + H.MAX_LEN; });
  $('reset').addEventListener('click', () => { $('payload').value = ''; $('count').textContent = '0 / ' + H.MAX_LEN; clearPanes(); $('payload').focus(); });

  $('hint').addEventListener('click', () => {
    const lv = LEVELS[idx];
    if (hintsUsed >= lv.hints.length) return;
    hintsUsed++;
    const hb = $('hint-box');
    hb.hidden = false;
    hb.textContent = 'Hint ' + hintsUsed + '/' + lv.hints.length + ': ' + lv.hints[hintsUsed - 1];
    $('hint').textContent = 'Hint (' + hintsUsed + '/' + lv.hints.length + ')';
    if (hintsUsed >= lv.hints.length) $('hint').disabled = true;
  });

  $('next').addEventListener('click', () => {
    if (idx < LEVELS.length - 1) {
      load(idx + 1);
      $('play').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    } else {
      $('defend').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  });

  S.onChange(paintBar);
  load(0);
})();
