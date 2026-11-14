// Prompt Refiner website: the live demo in the hero, scroll reveals and count-ups. No tracking, no network calls.
// Loaded in <head> without defer so the "js" class is set before the first paint (no flash of hidden content).
document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {
  // "Reduce motion" drops sliding, zooming and drifting (in the CSS). Typing, fading and counting don't move
  // anything around the screen, so they stay: the page still shows what the extension does.
  const reduce = false;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Header: frosted once the page scrolls.
  const header = document.querySelector('header');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Sections glide in once, as they come into view.
  const reveal = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); reveal.unobserve(e.target); }
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('[data-reveal]').forEach((el) => reveal.observe(el));

  // Numbers count up (or down) when they appear.
  const counter = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      counter.unobserve(e.target);
      const el = e.target, to = Number(el.dataset.count), from = Number(el.dataset.from ?? 0), suffix = el.dataset.suffix ?? '';
      if (reduce) { el.textContent = to + suffix; continue; }
      const t0 = performance.now(), dur = 1400;
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / dur), ease = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(from + (to - from) * ease) + suffix;
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach((el) => counter.observe(el));

  // ---------- Hero demo: a prompt types itself, then the marks, chip and card appear ----------
  // The marks and card texts are what the extension shows for these prompts.
  const EXAMPLES = [
    {
      chip: 'Buying question', red: 2, yellow: 1,
      parts: [['Hi! Could you possibly', 'r'], [' tell me '], ['which is the best phone', 'y'], [' to buy? '], ['Thanks so much!', 'r']],
      card: { tone: 'y', title: 'Missing detail', head: 'which is the best phone', body: 'Add: your budget; what you will use it for; your country (prices and shops differ).' },
    },
    {
      chip: 'Email draft', red: 0, yellow: 3,
      parts: [['Write an email', 'y'], [" to my boss that I can't come in tomorrow. Let her "], ['no', 'y'], [" I'll answer urgent emails by the end of the "], ['weak', 'y'], ['.']],
      card: { tone: 'y', title: 'Wrong word?', head: 'weak → week', body: 'Probably "week". Check before applying.' },
    },
    {
      chip: 'Coding task', red: 0, yellow: 3,
      parts: [['Make me a python script', 'y'], [' that renames all my photos by the date they '], ['where', 'y'], [' taken. Make it very detailed but '], ['also short', 'y'], ['.']],
      card: { tone: 'y', title: 'Instructions clash', head: 'also short', body: "Both can't be followed. Pick one, or say when each applies." },
    },
  ];

  const demo = document.querySelector('.demo');
  if (!demo) return;
  const text = demo.querySelector('.text');
  const chip = demo.querySelector('.chip');
  const card = demo.querySelector('.card');
  const tabs = [...document.querySelectorAll('.tabs button')];
  let run = 0, current = 0, auto = !reduce, visible = true;

  const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
  function setChip(ex) {
    chip.replaceChildren(el('b', '', ex.chip));
    for (const [n, color] of [[ex.red, '#F40009'], [ex.yellow, '#F2B705']]) {
      if (!n) continue;
      const s = el('span'); const dot = el('i'); dot.style.background = color; s.append(dot, String(n)); chip.append(s);
    }
  }
  function setCard(c) {
    card.replaceChildren(el('div', 't pixel', c.title), el('strong', '', c.head), el('p', '', c.body));
  }

  async function play(i) {
    const id = ++run;
    current = i;
    tabs.forEach((t, k) => t.setAttribute('aria-selected', String(k === i)));
    const ex = EXAMPLES[i];
    card.classList.remove('on'); chip.classList.remove('on');
    text.classList.add('fade');
    await sleep(reduce ? 0 : 220); if (id !== run) return;
    text.replaceChildren(); text.classList.remove('fade');
    setChip(ex); setCard(ex.card);
    const marks = [];
    const caret = el('span', 'caret');
    for (const [t, tone] of ex.parts) {
      const span = el('span', tone ? `m ${tone}` : '');
      if (tone) marks.push(span);
      text.append(span);
      if (reduce) { span.textContent = t; continue; }
      span.after(caret);
      for (const ch of t) { span.textContent += ch; await sleep(ch === ' ' ? 12 : 22); if (id !== run) return; }
    }
    caret.remove();
    await sleep(reduce ? 0 : 250); if (id !== run) return;
    for (const m of marks) { m.classList.add('on'); await sleep(reduce ? 0 : 230); if (id !== run) return; }
    chip.classList.add('on');
    await sleep(reduce ? 0 : 450); if (id !== run) return;
    card.classList.add('on');
    if (!auto) return;
    await sleep(5200); if (id !== run) return;
    while (!visible || document.hidden) { await sleep(400); if (id !== run) return; }
    play((i + 1) % EXAMPLES.length);
  }

  tabs.forEach((t, k) => t.addEventListener('click', () => { auto = false; play(k); }));
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.2 }).observe(demo);
  play(0);
});
