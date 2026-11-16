// AL Art Craft — o JavaScript do site (sem dependências). Sem ele tudo funciona: as ligações levam às páginas e o
// botão do WhatsApp abre com a mensagem base; com ele, a mensagem leva a quantidade, as escolhas e as medidas.
(() => {
  const doc = document.documentElement;
  const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const guardar = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const ler = (k) => { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch { return null; } };
  const apagar = (k) => { try { sessionStorage.removeItem(k); } catch {} };

  // ── Menu do telemóvel (ecrã inteiro debaixo do cabeçalho; só a raiz tranca) ─────────────────────
  const botaoMenu = document.querySelector('.topo__menu');
  const menu = document.getElementById('menu');
  if (botaoMenu && menu) {
    const abrir = (sim) => {
      menu.hidden = !sim;
      doc.classList.toggle('menu-aberto', sim);
      botaoMenu.setAttribute('aria-expanded', String(sim));
      if (sim) menu.querySelector('a')?.focus({ preventScroll: true });
    };
    botaoMenu.addEventListener('click', () => abrir(menu.hidden));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { abrir(false); botaoMenu.focus(); } });
    matchMedia('(min-width: 1024px)').addEventListener('change', (m) => { if (m.matches) abrir(false); });
  }

  // ── Vídeos: tocam só quando se veem (e nunca com «reduzir movimento») ─────────────────────────────
  const videos = [...document.querySelectorAll('video[data-video]:not(.carrossel__video)')];
  if (reduzir) {
    videos.forEach((v) => { v.removeAttribute('autoplay'); v.pause(); });
  } else if (videos.length) {
    const tocar = (v) => { if (v.offsetWidth > 0 && v.paused) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(() => {}); } };
    const io = new IntersectionObserver((entradas) => {
      for (const e of entradas) { if (e.isIntersecting) tocar(e.target); else e.target.pause(); }
    }, { threshold: 0.15 });
    videos.forEach((v) => io.observe(v));
    addEventListener('resize', () => videos.forEach((v) => { const r = v.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) tocar(v); }), { passive: true });
  }

  // ── O carrossel da capa: três à vista; só o do meio toca; passa sozinho a cada 8 s se ninguém lhe mexer ──
  const car = document.querySelector('[data-carrossel]');
  if (car) {
    const itens = [...car.querySelectorAll('.carrossel__item')];
    const n = itens.length;
    const conta = car.querySelector('[data-conta]');
    let atual = 0, relogio = null, parado = false, fora = false, arrastou = false;
    const lugar = (i) => {
      const d = (i - atual + n) % n;
      if (d === 0) return 'atual';
      if (d === 1) return 'seguinte';
      if (d === n - 1) return 'anterior';
      return d <= n / 2 ? 'fora-dir' : 'fora-esq';
    };
    const mostrar = () => {
      itens.forEach((li, i) => {
        li.dataset.pos = lugar(i);
        const v = li.querySelector('video');
        if (!v) return;
        if (li.dataset.pos === 'atual' && !reduzir && !fora) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(() => {}); }
        else v.pause();
        if ((li.dataset.pos === 'anterior' || li.dataset.pos === 'seguinte') && v.preload === 'none') v.preload = 'metadata';
      });
      if (conta) conta.textContent = String(atual + 1);
    };
    const andar = () => { clearInterval(relogio); if (!reduzir) relogio = setInterval(() => { if (!parado && !fora && !document.hidden) ir(1); }, 8000); };
    const ir = (passo) => { atual = (atual + passo + n) % n; mostrar(); };
    const mexer = (passo) => { ir(passo); andar(); };
    car.querySelectorAll('[data-passo]').forEach((b) => b.addEventListener('click', () => mexer(Number(b.dataset.passo))));
    itens.forEach((li) => li.addEventListener('click', () => {
      if (arrastou) { arrastou = false; return; }
      if (li.dataset.pos === 'anterior') mexer(-1); else if (li.dataset.pos === 'seguinte') mexer(1);
    }));
    let x0 = null;
    car.addEventListener('pointerdown', (e) => { x0 = e.clientX; arrastou = false; }, { passive: true });
    car.addEventListener('pointerup', (e) => {
      if (x0 == null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) { arrastou = true; mexer(dx < 0 ? 1 : -1); }
    }, { passive: true });
    car.addEventListener('mouseenter', () => { parado = true; });
    car.addEventListener('mouseleave', () => { parado = false; });
    car.addEventListener('focusin', () => { parado = true; });
    car.addEventListener('focusout', () => { parado = false; });
    new IntersectionObserver(([e]) => { fora = !e.isIntersecting; mostrar(); }, { threshold: 0.2 }).observe(car);
    mostrar();
    andar();
  }

  // ── Separadores das categorias: são páginas, mas a fila fica no mesmo sítio do ecrã ───────────────
  const seps = document.querySelector('[data-separadores]');
  if (seps) {
    const CHAVE = 'alartcraft:separadores';
    const lugar = ler(CHAVE);
    const atual = seps.querySelector('[aria-current]');
    if (lugar && lugar.para === location.pathname && Date.now() - lugar.t < 15000) {
      doc.dataset.lugarDaLoja = '';
      const repor = () => {
        const topo = seps.getBoundingClientRect().top;
        doc.style.scrollBehavior = 'auto';
        scrollTo(0, scrollY + topo - lugar.topo);
        seps.scrollLeft = lugar.esq;
      };
      repor();
      let mexeu = false;
      const parar = () => { mexeu = true; apagar(CHAVE); };
      ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((ev) => addEventListener(ev, parar, { once: true, passive: true }));
      ['load'].forEach((ev) => addEventListener(ev, () => { if (!mexeu) repor(); }, { once: true }));
      document.fonts?.ready.then(() => { if (!mexeu) repor(); });
    } else if (atual && seps.scrollWidth > seps.clientWidth) {
      seps.scrollLeft = atual.offsetLeft - (seps.clientWidth - atual.offsetWidth) / 2;
    }
    seps.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const para = new URL(a.href).pathname;
      if (para === location.pathname) return;
      guardar(CHAVE, { para, topo: seps.getBoundingClientRect().top, esq: seps.scrollLeft, t: Date.now() });
    });
  }

  // ── Galeria da ficha e do trabalho: deslizar, miniaturas, o vídeo só toca à vista ─────────────────
  for (const g of document.querySelectorAll('[data-galeria]')) {
    const fila = g.querySelector('.galeria__slides');
    const minis = [...g.querySelectorAll('.galeria__miniaturas a')];
    if (!fila) continue;
    const marcar = (id) => minis.forEach((m) => { if (m.dataset.alvo === id) m.setAttribute('aria-current', 'true'); else m.removeAttribute('aria-current'); });
    minis.forEach((m) => m.addEventListener('click', (e) => {
      e.preventDefault();
      const alvo = document.getElementById(m.dataset.alvo);
      if (!alvo) return;
      fila.scrollTo({ left: [...fila.children].indexOf(alvo) * fila.clientWidth, behavior: reduzir ? 'auto' : 'smooth' });
      marcar(m.dataset.alvo);
    }));
    const io = new IntersectionObserver((entradas) => {
      for (const e of entradas) if (e.isIntersecting && e.intersectionRatio > 0.6) marcar(e.target.id);
    }, { root: fila, threshold: [0.6] });
    [...fila.children].forEach((s) => io.observe(s));
  }

  // ── A encomenda pelo WhatsApp ────────────────────────────────────────────────────────────────────
  const euros = (v) => {
    const inteiro = Math.round(v * 100) % 100 === 0;
    let n = inteiro ? String(Math.round(v)) : v.toFixed(2).replace('.', ',');
    n = n.replace(/^(\d+)(\d{3})(?=,|$)/, (m, a, b) => (a.length + b.length >= 5 ? `${a}\u00A0${b}` : m));
    return `${n}\u00A0€`;
  };
  for (const f of document.querySelectorAll('[data-encomenda]')) {
    const q = f.querySelector('input[name="quantidade"]');
    const notas = f.querySelector('textarea[name="notas"]');
    const total = f.querySelector('[data-total]');
    const enviar = f.querySelector('[data-enviar]');
    const base = Number(f.dataset.preco);
    const desde = f.dataset.desde === '1';
    const unidade = f.dataset.unidade;
    const temEscolhas = !!f.querySelector('fieldset.escolha');
    const exato = !desde || temEscolhas; // «desde» por causa das escolhas: escolhida, o preço é certo
    const quantidade = () => Math.min(999, Math.max(1, Math.round(Number(q.value) || 1)));
    const atualizar = () => {
      const n = quantidade();
      const escolhidas = [...f.querySelectorAll('fieldset.escolha input:checked')];
      const unit = base + escolhidas.reduce((s, i) => s + Number(i.dataset.mais || 0), 0);
      const esc = escolhidas.length ? ` (${escolhidas.map((i) => i.value).join(', ')})` : '';
      const precoUn = exato ? euros(unit) : `desde ${euros(unit)}`;
      const cada = unidade ? ` / ${unidade}` : (n > 1 ? ' cada' : '');
      const soma = exato && n > 1 ? ` · ${euros(unit * n)}` : '';
      const linhas = [f.dataset.abertura, `• ${n} × ${f.dataset.nome}${esc} — ${precoUn}${cada}${soma}`];
      const t = (notas?.value || '').trim();
      if (t) linhas.push(`Medidas ou gravação: ${t}`);
      linhas.push(f.dataset.endereco || location.href.split('#')[0]);
      enviar.href = `https://wa.me/${f.dataset.whatsapp}?text=${encodeURIComponent(linhas.join('\n'))}`;
      if (total) {
        const mostrar = exato && (n > 1 || escolhidas.length);
        total.hidden = !mostrar;
        if (mostrar) total.textContent = n > 1 ? `Total: ${euros(unit * n)} (${n} × ${euros(unit)})` : `Preço: ${euros(unit)}`;
      }
    };
    f.querySelectorAll('[data-passo]').forEach((b) => b.addEventListener('click', () => { q.value = String(Math.min(999, Math.max(1, quantidade() + Number(b.dataset.passo)))); atualizar(); }));
    q.addEventListener('change', () => { q.value = String(quantidade()); atualizar(); });
    f.addEventListener('input', atualizar);
    f.addEventListener('submit', (e) => e.preventDefault());
    atualizar();
  }
})();
