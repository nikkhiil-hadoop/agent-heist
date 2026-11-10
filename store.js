// Tiny progress store. Browser storage is only a per-viewer convenience: it can be empty or blocked,
// so everything works without it. Stored data is validated on load (never trusted blindly).
(() => {
  'use strict';

  const KEY = 'agentheist.v1';
  const MAX_LEVEL = 6;
  const blank = () => ({ levels: {}, defender: { normal: null, hard: null } });
  let state = blank();
  const subs = [];

  const num = (v, lo, hi) => (typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : null);

  function sanitize(p) {
    const out = blank();
    if (p && typeof p === 'object') {
      const lv = p.levels && typeof p.levels === 'object' ? p.levels : {};
      for (let i = 1; i <= MAX_LEVEL; i++) {
        const s = num(lv[i], 1, 3);
        if (s) out.levels[i] = s;
      }
      const d = p.defender && typeof p.defender === 'object' ? p.defender : {};
      ['normal', 'hard'].forEach((k) => {
        const x = d[k];
        if (!x || typeof x !== 'object') return;
        const score = num(x.score, -50, 30);
        const blocked = num(x.blocked, 0, 6);
        const cost = num(x.cost, 0, 50);
        if (score !== null && blocked !== null && cost !== null) out.defender[k] = { score, blocked, cost };
      });
    }
    return out;
  }

  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = sanitize(JSON.parse(raw));
  } catch (e) { /* storage unavailable or corrupt: start fresh */ }

  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    subs.forEach((f) => f(state));
  }

  window.HeistStore = {
    get: () => state,
    setStars(id, stars) {
      if (!(state.levels[id] >= stars)) state.levels[id] = stars;
      save();
    },
    // Each mode keeps its own best, so a normal-mode score never hides a hard-mode result.
    setDefender(d) {
      const k = d.hard ? 'hard' : 'normal';
      const cur = state.defender[k];
      if (!cur || d.score >= cur.score) state.defender[k] = { score: d.score, blocked: d.blocked, cost: d.cost };
      save();
    },
    onChange(f) { subs.push(f); f(state); },
    reset() {
      state = blank();
      try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      subs.forEach((f) => f(state));
    },
  };
})();
