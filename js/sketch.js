// Drawing demo on the research page, after Sing N Sketch.
// In the app, pitch sets a stroke's color and volume sets its size.
// Here, height stands in for pitch (low = red, high = blue) and speed for volume.
{
  const band = document.querySelector(".canvas-band");
  const canvas = band && band.querySelector("canvas");
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    const clearBtn = document.getElementById("clear-drawing");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
    let W = 0, H = 0, scale = 1;
    let auto = [];            // generated strokes, points normalized to 0..1
    let user = [];            // visitor strokes, same format
    let progress = reduce ? 1 : 0;
    let active = null, last = null;

    const isDark = () => {
      const t = document.documentElement.dataset.theme;
      return t ? t === "dark" : prefersDark.matches;
    };
    // y: 0 at top, 1 at bottom. Top is blue (228), bottom is red (350), through violet.
    const color = (y) => `hsl(${228 + Math.min(1, y / 0.86) * 122} 76% ${isDark() ? 64 : 49}%)`;

    // Small seeded random so the opening sketch is the same on every visit.
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    function makeAuto() {
      seed = 7;
      const narrow = W < 640;
      const out = [];
      // Spread the strokes from top (blue) to bottom (red) so the whole scale shows.
      const bases = narrow ? [0.12, 0.38, 0.66, 0.88] : [0.13, 0.36, 0.6, 0.84];
      bases.forEach((base, s) => {
        const pts = [];
        const n = 280;
        const wide = narrow || band.closest(".demo");
        const x0 = wide ? 0.03 + rand() * 0.03 : 0.3 + rand() * 0.12;
        const span = wide ? 0.97 - x0 - rand() * 0.03 : 0.97 - x0 - rand() * 0.04;
        const f1 = 0.8 + rand() * 1.2, f2 = 2.5 + rand() * 2.5, loops = 5 + Math.floor(rand() * 5);
        const p1 = rand() * 6.28, p2 = rand() * 6.28;
        const amp = narrow ? 0.05 : 0.07;
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          const r = (narrow ? 0.022 : 0.03) + 0.014 * Math.sin(t * 9 + p2);
          const x = x0 + t * span + r * 0.6 * Math.cos(t * loops * 6.283);
          const y = base + amp * Math.sin(6.283 * f1 * t + p1) + 0.025 * Math.sin(6.283 * f2 * t + p2) + r * Math.sin(t * loops * 6.283);
          const w = 2.5 + 9 * (0.5 + 0.5 * Math.sin(6.283 * (1.2 + s * 0.35) * t + p1));
          pts.push({ x, y: Math.min(0.97, Math.max(0.03, y)), w });
        }
        out.push(pts);
      });
      return out;
    }

    function seg(a, b) {
      ctx.strokeStyle = color((a.y + b.y) / 2);
      ctx.lineWidth = ((a.w + b.w) / 2) * scale;
      ctx.beginPath();
      ctx.moveTo(a.x * W, a.y * H);
      ctx.lineTo(b.x * W, b.y * H);
      ctx.stroke();
    }

    function setStyle() {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      setStyle();
      auto.forEach((pts, s) => {
        // strokes start one after another, overlapping a little
        const local = Math.min(1, Math.max(0, progress * auto.length * 0.8 - s * 0.8 + 0.2));
        const upto = Math.floor(local * (pts.length - 1));
        for (let i = 1; i <= upto; i++) seg(pts[i - 1], pts[i]);
      });
      user.forEach((pts) => { for (let i = 1; i < pts.length; i++) seg(pts[i - 1], pts[i]); });
    }

    function resize() {
      const r = band.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      scale = Math.max(0.6, Math.min(1, W / 1200));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      auto = makeAuto();
      draw();
    }

    function animate(start) {
      const step = (now) => {
        progress = Math.min(1, (now - start) / 2600);
        draw();
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    function point(e) {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, t: e.timeStamp };
    }

    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      progress = 1;
      const p = point(e);
      p.w = 12;
      active = [p];
      user.push(active);
      last = p;
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!active) return;
      const p = point(e);
      const dx = (p.x - last.x) * W, dy = (p.y - last.y) * H;
      const dist = Math.hypot(dx, dy);
      if (dist < 2) return;
      const speed = dist / Math.max(1, p.t - last.t); // px per ms
      const target = Math.max(2.5, Math.min(18, 18 - speed * 6));
      p.w = last.w * 0.7 + target * 0.3;
      active.push(p);
      setStyle();
      seg(last, p);
      last = p;
    });
    const end = () => { active = null; last = null; };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);

    if (clearBtn) clearBtn.addEventListener("click", () => { auto = []; user = []; progress = 1; draw(); });

    const ro = new ResizeObserver(() => resize());
    ro.observe(band);
    prefersDark.addEventListener("change", draw);
    const themeWatch = new MutationObserver(draw);
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    resize();
    if (!reduce) animate(performance.now());
  }
}
