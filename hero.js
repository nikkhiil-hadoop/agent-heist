// Hero: a short animated chat showing the whole attack in one glance. All text is static; no user input.
(() => {
  'use strict';

  const host = document.getElementById('chat');
  if (!host) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));

  const el = (cls, text) => {
    const d = document.createElement('div');
    d.className = cls;
    if (text !== undefined) d.textContent = text;
    return d;
  };
  const bubble = (who, cls, text) => {
    const b = el('bubble ' + cls);
    const w = document.createElement('span');
    w.className = 'who';
    w.textContent = who;
    b.appendChild(w);
    b.appendChild(document.createTextNode(text));
    return b;
  };
  const typing = () => {
    const b = el('bubble pip');
    const t = el('typing');
    t.append(document.createElement('i'), document.createElement('i'), document.createElement('i'));
    b.appendChild(t);
    return b;
  };

  async function run() {
    host.textContent = '';
    host.appendChild(bubble('Dana', 'user', 'Summarise my new items.'));
    await sleep(700);

    const dots = typing();
    host.appendChild(dots);
    await sleep(1100);
    dots.replaceWith(bubble('Pip', 'pip', 'You have 3 new items: an invoice reminder, lunch on Thursday, and a message from an unknown sender.'));
    await sleep(900);

    host.appendChild(el('toolline', '› tool: read_notes → vault key'));
    await sleep(700);
    host.appendChild(el('toolline bad', '› tool: send_email → mallory@evil.test'));
    await sleep(900);

    host.appendChild(bubble('Pip', 'pip', 'All done. Anything else?'));
    await sleep(500);
    host.appendChild(el('caption', 'Pip never noticed that item 3 was giving the orders.'));
  }

  run();
})();
