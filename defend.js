// Finale: build Pip's defenses, score them against the attack suite, and share the result.
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const H = window.Heist;
  const LEVELS = window.HeistLevels;
  const S = window.HeistStore;
  if (!H || !LEVELS || !S || !$('defenses')) return;

  const STOP_LABEL = {
    filter: 'keyword filter', allowlist: 'allow-list', confirm: 'Dana’s approval', noImages: 'image block',
    leastPrivilege: 'read-only agent', dataFlow: 'taint tracking', label: 'untrusted label',
  };
  const CHANNEL = { email: 'email', image: 'image request', human: 'Dana' };
  const KIND = { code: 'code-level', model: 'model-level', human: 'human-level', ui: 'UI-level' };

  const sel = { fence: 'off' };
  let touched = false; // only record a score once the player has actually changed something
  const change = () => { touched = true; update(); };

  /* ── controls ── */
  const host = $('defenses');
  const inputs = {};
  H.DEFENSES.forEach((d) => {
    const row = document.createElement('label');
    row.className = 'def';
    let control;
    if (d.id === 'fence') {
      control = document.createElement('select');
      control.setAttribute('aria-label', d.label);
      d.choices.forEach(([v, text, cost]) => {
        const o = document.createElement('option');
        o.value = v;
        o.textContent = text + (cost ? ' (−' + cost + ')' : '');
        control.appendChild(o);
      });
      control.addEventListener('change', () => { sel.fence = control.value; change(); });
    } else {
      control = document.createElement('input');
      control.type = 'checkbox';
      control.addEventListener('change', () => { sel[d.id] = control.checked; change(); });
    }
    inputs[d.id] = control;

    const title = document.createElement('span');
    title.className = 't';
    title.textContent = d.label;
    const kind = document.createElement('span');
    kind.className = 'badge';
    kind.textContent = KIND[d.kind];
    title.appendChild(kind);
    if (d.id !== 'fence') {
      const cost = document.createElement('span');
      cost.className = 'badge cost';
      cost.textContent = '−' + d.cost + ' usability';
      title.appendChild(cost);
    }
    const desc = document.createElement('span');
    desc.className = 'd';
    desc.textContent = d.desc;
    row.append(control, title, desc);
    host.appendChild(row);
  });
  $('hard').addEventListener('change', () => { sel.hard = $('hard').checked; change(); });

  /* ── best possible score (brute force; small search space) ── */
  const bestCache = {};
  function best(hard) {
    const key = hard ? 'h' : 'n';
    if (bestCache[key] !== undefined) return bestCache[key];
    const ids = ['filter', 'allowlist', 'confirm', 'noImages', 'leastPrivilege', 'dataFlow', 'label'];
    let top = -Infinity;
    for (let mask = 0; mask < 1 << ids.length; mask++) {
      ['off', 'fixed', 'random'].forEach((fence) => {
        const s = { fence, hard };
        ids.forEach((id, i) => { s[id] = !!(mask & (1 << i)); });
        top = Math.max(top, H.runSuite(s).score);
      });
    }
    bestCache[key] = top;
    return top;
  }

  /* ── render ── */
  function update() {
    const res = H.runSuite(sel);
    Object.keys(inputs).forEach((id) => {
      const on = id === 'fence' ? sel.fence !== 'off' : !!sel[id];
      inputs[id].closest('.def').classList.toggle('on', on);
    });
    $('d-blocked').textContent = res.blocked + '/' + res.total;
    $('d-cost').textContent = res.cost ? '−' + res.cost : '0';
    $('d-score').textContent = String(res.score);
    const top = best(!!sel.hard);
    $('d-best').textContent = 'best possible: ' + top;

    const body = $('matrix');
    body.textContent = '';
    res.rows.forEach((r) => {
      const tr = document.createElement('tr');
      const a = document.createElement('td');
      a.textContent = r.name;
      const b = document.createElement('td');
      const span = document.createElement('span');
      span.className = 'res ' + (r.leaked ? 'bad' : 'ok');
      if (r.leaked) {
        span.textContent = '✗ leaked via ' + (CHANNEL[r.channel] || 'a side channel');
      } else {
        span.textContent = '✓ blocked';
        const by = [...new Set(r.stoppedBy)].map((x) => STOP_LABEL[x] || x);
        const small = document.createElement('small');
        small.textContent = by.length ? 'by ' + by.join(', ') : 'Pip ignored it (fenced as data)';
        span.appendChild(small);
      }
      b.appendChild(span);
      tr.append(a, b);
      body.appendChild(tr);
    });

    $('d-note').textContent = sel.hard
      ? 'Hard mode: fences don’t help. Defenses that limit what the agent can do, however fooled it is, carry the load.'
      : 'Heads up: in this simulation random fence markers are perfect. Real models still sometimes follow fenced instructions, so try hard mode, and treat fences as risk reduction, not a wall.';

    if (touched) S.setDefender({ score: res.score, blocked: res.blocked, cost: res.cost, hard: !!sel.hard });
  }

  /* ── share card ── */
  const canvas = $('card');
  const FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
  const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function lock(ctx, cx, cy, open, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    rr(ctx, cx - 30, cy - 4, 60, 46, 9);
    ctx.fill();
    ctx.beginPath();
    if (open) { ctx.moveTo(cx - 18, cy - 4); ctx.lineTo(cx - 18, cy - 20); ctx.arc(cx - 2, cy - 20, 16, Math.PI, Math.PI * 1.85); }
    else { ctx.moveTo(cx - 18, cy - 4); ctx.lineTo(cx - 18, cy - 18); ctx.arc(cx, cy - 18, 18, Math.PI, 0); ctx.lineTo(cx + 18, cy - 4); }
    ctx.stroke();
    ctx.fillStyle = '#120a26';
    ctx.beginPath();
    ctx.arc(cx, cy + 18, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function shareData(state) {
    const stars = LEVELS.reduce((n, l) => n + (state.levels[l.id] || 0), 0);
    const cracked = LEVELS.filter((l) => state.levels[l.id]).length;
    const parts = [];
    if (state.defender.normal) parts.push('Defender ' + state.defender.normal.score + '/' + best(false));
    if (state.defender.hard) parts.push('Hard mode ' + state.defender.hard.score + '/' + best(true));
    return { stars, cracked, defLine: parts.join('  ·  ') };
  }

  function drawCard(state) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const Hh = canvas.height;
    const { stars, cracked, defLine } = shareData(state);

    const g = ctx.createLinearGradient(0, 0, W, Hh);
    g.addColorStop(0, '#0b0914');
    g.addColorStop(1, '#22123f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, Hh);
    ctx.strokeStyle = 'rgba(167,139,250,.35)';
    ctx.lineWidth = 4;
    rr(ctx, 14, 14, W - 28, Hh - 28, 26);
    ctx.stroke();

    ctx.fillStyle = '#ece9f6';
    ctx.font = '800 78px ' + FONT;
    ctx.fillText('AGENT HEIST', 70, 150);
    ctx.fillStyle = '#9a92b3';
    ctx.font = '500 28px ' + FONT;
    ctx.fillText('Can you make an AI assistant betray its owner?', 74, 196);

    LEVELS.forEach((l, i) => {
      const x = 70 + i * 176;
      const y = 236;
      const s = state.levels[l.id] || 0;
      ctx.fillStyle = s ? 'rgba(167,139,250,.22)' : 'rgba(255,255,255,.05)';
      rr(ctx, x, y, 152, 190, 20);
      ctx.fill();
      ctx.strokeStyle = s ? '#a78bfa' : 'rgba(255,255,255,.12)';
      ctx.lineWidth = 3;
      rr(ctx, x, y, 152, 190, 20);
      ctx.stroke();
      lock(ctx, x + 76, y + 78, !!s, s ? '#a78bfa' : '#5b5476');
      ctx.fillStyle = s ? '#ffb454' : '#5b5476';
      ctx.font = '700 28px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('★'.repeat(s) + '☆'.repeat(3 - s), x + 76, y + 156);
      ctx.fillStyle = '#9a92b3';
      ctx.font = '600 18px ' + MONO;
      ctx.fillText('LEVEL ' + l.id, x + 76, y + 180);
      ctx.textAlign = 'left';
    });

    ctx.fillStyle = '#ece9f6';
    ctx.font = '700 44px ' + FONT;
    ctx.fillText(cracked + '/' + LEVELS.length + ' cracked  ·  ★ ' + stars + '/' + LEVELS.length * 3, 70, 520);
    ctx.fillStyle = '#a78bfa';
    ctx.font = '600 32px ' + FONT;
    ctx.fillText(defLine || 'Defender: not played yet', 70, 572);

    ctx.fillStyle = '#6f6788';
    ctx.font = '500 22px ' + MONO;
    ctx.textAlign = 'right';
    ctx.fillText((window.location.host || 'agent heist'), W - 60, Hh - 52);
    ctx.textAlign = 'left';
  }

  function shareText(state) {
    const { stars, defLine } = shareData(state);
    const locks = LEVELS.map((l) => (state.levels[l.id] ? '\u{1F513}' : '\u{1F512}')).join('');
    const url = window.location.href.split('#')[0];
    return 'Agent Heist ' + locks + '\n★ ' + stars + '/' + LEVELS.length * 3 +
      (defLine ? ' · ' + defLine.replace('  ·  ', ' · ') : '') + '\n' + url;
  }

  function paintShare(state) {
    drawCard(state);
    $('share-text').value = shareText(state);
  }

  $('copy').addEventListener('click', async () => {
    const note = $('copy-note');
    const text = $('share-text').value;
    try {
      await navigator.clipboard.writeText(text);
      note.textContent = 'Copied to your clipboard.';
    } catch (e) {
      $('share-text').focus();
      $('share-text').select();
      note.textContent = 'Couldn’t copy automatically. The text is selected: press Ctrl/⌘+C.';
    }
  });

  $('dl').addEventListener('click', () => {
    canvas.toBlob((blob) => {
      if (!blob) { $('copy-note').textContent = 'Your browser couldn’t create the image.'; return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'agent-heist.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }, 'image/png');
  });

  let wipeTimer = 0;
  $('wipe').addEventListener('click', () => {
    const b = $('wipe');
    if (!wipeTimer) {
      b.textContent = 'Click again to confirm';
      wipeTimer = setTimeout(() => { b.textContent = 'Reset my progress'; wipeTimer = 0; }, 4000);
      return;
    }
    clearTimeout(wipeTimer);
    wipeTimer = 0;
    b.textContent = 'Reset my progress';
    S.reset();
  });

  S.onChange(paintShare);
  update();
})();
