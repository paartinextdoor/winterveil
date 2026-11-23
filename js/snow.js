// ===========================================================
// Gentle ambient snowfall on a canvas behind the UI.
// Pauses when the tab is hidden; disabled for reduced-motion users.
// ===========================================================

export function startSnow(canvas) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = canvas.getContext("2d");
  let w, h, dpr, flakes = [], raf = null, last = 0;

  const make = (anyY) => ({
    x: Math.random() * w,
    y: anyY ? Math.random() * h : -10,
    r: 1 + Math.random() * 2.4,
    vy: 12 + Math.random() * 22,          // px per second
    drift: 6 + Math.random() * 14,
    phase: Math.random() * Math.PI * 2,
    a: 0.35 + Math.random() * 0.45,
  });

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const target = Math.round(Math.min(90, (w * h) / 9000));
    flakes = Array.from({ length: target }, () => make(true));
  }

  function frame(t) {
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;
    ctx.clearRect(0, 0, w, h);
    for (const f of flakes) {
      f.y += f.vy * dt;
      f.phase += dt * 0.8;
      const x = f.x + Math.sin(f.phase) * f.drift;
      if (f.y > h + 10) Object.assign(f, make(false));
      ctx.beginPath();
      ctx.arc(x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(126, 172, 208, ${f.a})`;
      ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  }

  function play() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function pause() { cancelAnimationFrame(raf); raf = null; }

  resize();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => (document.hidden ? pause() : play()));
  play();
}
