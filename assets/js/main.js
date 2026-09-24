/* Simone Cervesato · animazioni della pagina e modulo contatti */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ss = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const mqMobile = matchMedia('(max-width: 760px)');

  // browser senza import map (Safari < 16.4): il 3D non può partire, mostra subito la foto
  if (!(HTMLScriptElement.supports && HTMLScriptElement.supports('importmap'))) {
    document.documentElement.classList.add('no-webgl');
  }
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PHONE = '393491375208';
  const EMAIL = 'simonecervesato@libero.it';

  $('#year').textContent = new Date().getFullYear();

  /* ---------- nav ---------- */
  const nav = $('#nav');
  const burger = $('#burger');
  const setMenu = open => {
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  $$('#nav-links a, .nav-cta, .brand').forEach(a => a.addEventListener('click', () => setMenu(false)));
  matchMedia('(max-width: 980px)').addEventListener('change', e => { if (!e.matches) setMenu(false); });
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); burger.focus(); }
  });

  const navLinks = $$('#nav-links a[href^="#"]:not(.nav-links-cta)');
  const sections = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);

  /* ---------- STAGE: hero + panca esplosa ---------- */
  const stage = $('#stage');
  const layer = n => $(`[data-layer="${n}"]`);
  const L = { hero: layer('hero'), cue: layer('cue'), title: layer('title'), outro: layer('outro') };
  const chapters = $$('.chapter');
  const rail = $('.stage-rail');
  const railItems = $$('li', rail);
  const C0 = 0.22, C1 = 0.80, N = chapters.length, SPAN = (C1 - C0) / N;

  window.STAGE = { p: 0, e: 0, k: -1, h: 0, local: 0, chapters: { C0, C1, N, SPAN } };

  // hide=true solo per i livelli con link (hero, finale): gli altri restano leggibili dai lettori vocali
  const show = (el, o, y, hide = true) => {
    el.style.opacity = o.toFixed(3);
    el.style.transform = `translateY(${y.toFixed(1)}px)`;
    if (hide) el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
  };

  function updateStage() {
    const r = stage.getBoundingClientRect();
    const total = stage.offsetHeight - innerHeight;
    const p = clamp(-r.top / total);

    const heroO = 1 - ss(0.012, 0.065, p);
    show(L.hero, heroO, -(1 - heroO) * 60);
    show(L.cue, 1 - ss(0, 0.025, p), 0, false);

    const tIn = ss(0.085, 0.125, p), tOut = ss(0.185, 0.215, p);
    show(L.title, tIn * (1 - tOut), (1 - tIn) * 40 - tOut * 40, false);

    const e = p < 0.5 ? ss(0.07, 0.2, p) : 1 - ss(0.815, 0.9, p);

    let k = -1, local = 0;
    if (p >= C0 && p < C1) {
      k = Math.min(N - 1, Math.floor((p - C0) / SPAN));
      local = (p - C0 - k * SPAN) / SPAN;
    }
    const mobile = mqMobile.matches;
    chapters.forEach((c, i) => {
      let o = 0, y = 0;
      if (i === k) {
        const a = ss(0.02, 0.2, local), b = ss(0.82, 0.98, local);
        o = a * (1 - b);
        y = (1 - a) * 44 - b * 44;
      }
      c.style.opacity = o.toFixed(3);
      c.style.transform = mobile ? `translateY(${y.toFixed(1)}px)` : `translateY(calc(-50% + ${y.toFixed(1)}px))`;
    });
    const h = ss(C0 - 0.012, C0 + 0.01, p) * (1 - ss(C1 - 0.01, C1 + 0.012, p));
    rail.classList.toggle('show', h > 0.5);
    railItems.forEach((li, i) => li.classList.toggle('on', i === k));

    const oIn = ss(0.87, 0.925, p);
    show(L.outro, oIn, (1 - oIn) * 40);
    L.outro.classList.toggle('live', oIn > 0.5);

    Object.assign(window.STAGE, { p, e, k, h, local });
  }

  /* ---------- manifesto: parole che si accendono ---------- */
  const manifesto = $('#manifesto');
  const mText = $('#manifesto-text');
  const words = mText.textContent.trim().split(/\s+/);
  const HL = /^(metodo,|costanza|insieme,)$/i;
  mText.innerHTML = words.map(w => `<span class="w${HL.test(w) ? ' hl' : ''}">${w}</span>`).join(' ');
  const wordEls = $$('.w', mText);
  let lit = -1;
  function updateManifesto() {
    const r = manifesto.getBoundingClientRect();
    const total = manifesto.offsetHeight - innerHeight;
    const p = clamp((-r.top + innerHeight * 0.35) / (total + innerHeight * 0.1));
    const n = Math.round(p * wordEls.length);
    if (n === lit) return;
    lit = n;
    wordEls.forEach((w, i) => w.classList.toggle('on', i < n));
  }

  /* ---------- parallasse foto ---------- */
  const para = $$('[data-parallax]');
  function updateParallax() {
    const vh = innerHeight;
    para.forEach(el => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const f = parseFloat(el.dataset.parallax);
      const c = r.top + r.height / 2 - vh / 2;
      el.style.transform = `translateY(${(c * f).toFixed(1)}px)`;
    });
  }

  /* ---------- nav attiva + bottone flottante ---------- */
  const floatCta = $('#float-cta');
  const contact = $('#contatti');
  function updateNav() {
    nav.classList.toggle('scrolled', scrollY > 8);
    const y = innerHeight * 0.4;
    let current = null;
    sections.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      if (s.id === 'metodo') {
        const sr = stage.getBoundingClientRect();
        if (sr.top <= y && sr.bottom > y && window.STAGE.p > 0.06) current = i;
      } else if (r.top <= y && r.bottom > y) current = i;
    });
    navLinks.forEach((a, i) => a.classList.toggle('active', i === current));

    const sr = stage.getBoundingClientRect();
    const cr = contact.getBoundingClientRect();
    floatCta.classList.toggle('show', sr.bottom < innerHeight * 0.5 && cr.top > innerHeight * 0.8);
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      updateStage();
      updateManifesto();
      updateParallax();
      updateNav();
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- comparsa elementi ---------- */
  $$('[data-reveal-group] > *').forEach(el => el.setAttribute('data-reveal', ''));
  $$('[data-reveal]').forEach(el => {
    const sibs = [...el.parentElement.children].filter(c => c.hasAttribute('data-reveal'));
    el.style.setProperty('--d', `${Math.min(sibs.indexOf(el), 6) * 0.08}s`);
  });
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  $$('[data-reveal]').forEach(el => io.observe(el));

  /* ---------- numeri che salgono + grafico ---------- */
  $$('.bar').forEach((b, i) => b.style.setProperty('--i', i));
  // il valore vero resta nel testo per i lettori vocali; quello animato parte da 0
  $$('[data-count]').forEach(el => {
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = el.dataset.count;
    el.after(sr);
    el.setAttribute('aria-hidden', 'true');
    if (!reduceMotion) el.textContent = '0';
  });
  const countUp = el => {
    if (reduceMotion) return;
    const to = +el.dataset.count;
    const t0 = performance.now();
    const dur = 1500 + to * 2;
    const step = now => {
      const t = clamp((now - t0) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io2 = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      if (el.id === 'chart') el.classList.add('in');
      $$('[data-count]', el).forEach(countUp);
      io2.unobserve(el);
    });
  }, { threshold: 0.35 });
  io2.observe($('#chart'));
  $$('.stat').forEach(s => io2.observe(s));

  /* ---------- galleria ---------- */
  const strip = $('#strip');
  $$('.gallery-nav .round').forEach(btn => btn.addEventListener('click', () => {
    strip.scrollBy({ left: +btn.dataset.dir * strip.clientWidth * 0.75, behavior: 'smooth' });
  }));

  /* ---------- FAQ: una aperta alla volta ---------- */
  const faqs = $$('.faq-list details');
  faqs.forEach(d => d.addEventListener('toggle', () => {
    if (d.open) faqs.forEach(o => { if (o !== d) o.open = false; });
  }));

  /* ---------- modulo contatti → WhatsApp o email ---------- */
  const form = $('#contact-form');
  const nameIn = $('#f-name');
  const err = $('#form-error');
  const picked = name => $$(`.chips[data-name="${name}"] input:checked`, form).map(i => i.value);

  nameIn.addEventListener('input', () => { nameIn.classList.remove('invalid'); err.textContent = ''; });

  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const via = (ev.submitter && ev.submitter.dataset.via) || 'wa';
    const name = nameIn.value.trim();
    if (!name) {
      nameIn.classList.add('invalid');
      err.textContent = 'Scrivi il tuo nome, così Simone sa chi sei.';
      nameIn.focus();
      return;
    }
    const goals = picked('goal');
    const modes = picked('mode');
    const msg = $('#f-msg').value.trim();
    const lines = [`Ciao Simone! Sono ${name}.`];
    if (goals.length) lines.push(`${goals.length > 1 ? 'Obiettivi' : 'Obiettivo'}: ${goals.join(', ').toLowerCase()}.`);
    if (modes.length) lines.push(`Preferisco allenarmi: ${modes.join(', ').toLowerCase()}.`);
    if (msg) lines.push('', msg);
    lines.push('', '(Messaggio inviato dal sito)');
    const text = lines.join('\n');

    if (via === 'mail') {
      const subject = `Richiesta consulenza dal sito – ${name}`;
      location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    } else {
      window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    }
  });

  /* ---------- se il 3D non parte, mostra la foto ---------- */
  setTimeout(() => {
    const root = document.documentElement;
    if (!root.classList.contains('webgl-ready')) root.classList.add('no-webgl');
  }, 7000);
})();
