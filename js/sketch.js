// Sing N Sketch demo on the research page.
// With the microphone on, the pitch you sing sets the stroke color
// (low = red, high = blue) and how loud you sing sets the brush size.
// Without the microphone, the height of the stroke stands in for pitch.
// Audio is analyzed in the browser and never recorded or sent anywhere.
{
  const demo = document.querySelector(".demo");
  const band = demo && demo.querySelector(".canvas-band");
  const canvas = band && band.querySelector("canvas");
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    const clearBtn = document.getElementById("clear-drawing");
    const micBtn = document.getElementById("mic-toggle");
    const status = document.getElementById("mic-status");
    const scale = demo.querySelector(".pitch-scale");
    const marker = demo.querySelector(".pitch-marker");
    const noteOut = demo.querySelector(".voice-note");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, size = 1;
    let auto = [];            // opening strokes; points are {x, y, w, t} with x, y in 0..1
    let user = [];            // visitor strokes, same format
    let progress = reduce ? 1 : 0;
    let active = null, last = null;

    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

    // ---- Pitch to color -------------------------------------------------
    // t runs 0..1 across the singing range, low to high, on a log scale.
    const LOW_HZ = 100, HIGH_HZ = 900;
    const pitchT = (hz) => clamp(Math.log2(hz / LOW_HZ) / Math.log2(HIGH_HZ / LOW_HZ), 0, 1);
    // Red through orange, yellow and green to blue, light enough to read on
    // the site's dark page. Yellows and greens are dimmed a little.
    const color = (t) => {
      if (t == null) return "hsl(220 4% 52%)";
      const h = t * 230;
      const dip = Math.exp(-(((h - 95) / 45) ** 2));
      const l = 64 - 4 * dip;
      return `hsl(${h.toFixed(1)} 80% ${l.toFixed(1)}%)`;
    };
    const NOTES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
    const noteName = (hz) => {
      const m = Math.round(69 + 12 * Math.log2(hz / 440));
      return NOTES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
    };

    function paintScale() {
      if (!scale) return;
      const stops = [];
      for (let i = 0; i <= 12; i++) stops.push(`${color(i / 12)} ${(i / 12 * 100).toFixed(1)}%`);
      scale.style.backgroundImage = `linear-gradient(to right, ${stops.join(", ")})`;
    }

    // ---- Drawing --------------------------------------------------------
    // Small seeded random so the opening sketch is the same on every visit.
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    function makeAuto() {
      seed = 7;
      const narrow = W < 640;
      const out = [];
      // Spread the strokes from top (high, blue) to bottom (low, red).
      const bases = narrow ? [0.12, 0.38, 0.66, 0.88] : [0.13, 0.36, 0.6, 0.84];
      bases.forEach((base, s) => {
        const pts = [];
        const n = 280;
        const x0 = 0.03 + rand() * 0.03;
        const span = 0.97 - x0 - rand() * 0.03;
        const f1 = 0.8 + rand() * 1.2, f2 = 2.5 + rand() * 2.5, loops = 5 + Math.floor(rand() * 5);
        const p1 = rand() * 6.28, p2 = rand() * 6.28;
        const amp = narrow ? 0.05 : 0.07;
        for (let i = 0; i <= n; i++) {
          const k = i / n;
          const r = (narrow ? 0.022 : 0.03) + 0.014 * Math.sin(k * 9 + p2);
          const x = x0 + k * span + r * 0.6 * Math.cos(k * loops * 6.283);
          const y = clamp(base + amp * Math.sin(6.283 * f1 * k + p1) + 0.025 * Math.sin(6.283 * f2 * k + p2) + r * Math.sin(k * loops * 6.283), 0.03, 0.97);
          const w = 2.5 + 9 * (0.5 + 0.5 * Math.sin(6.283 * (1.2 + s * 0.35) * k + p1));
          pts.push({ x, y, w, t: heightT(y) });
        }
        out.push(pts);
      });
      return out;
    }
    const heightT = (y) => clamp((0.97 - y) / 0.94, 0, 1);

    function seg(a, b) {
      ctx.strokeStyle = color(b.t == null || a.t == null ? b.t : (a.t + b.t) / 2);
      ctx.lineWidth = ((a.w + b.w) / 2) * size;
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
        const local = clamp(progress * auto.length * 0.8 - s * 0.8 + 0.2, 0, 1);
        const upto = Math.floor(local * (pts.length - 1));
        for (let i = 1; i <= upto; i++) seg(pts[i - 1], pts[i]);
      });
      user.forEach((pts) => { for (let i = 1; i < pts.length; i++) seg(pts[i - 1], pts[i]); });
    }

    function resize() {
      const r = band.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      size = Math.max(0.6, Math.min(1, W / 1200));
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
      return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, time: e.timeStamp };
    }

    // Color and size for a new point, from the voice when listening,
    // otherwise from height (pitch) and speed (volume).
    function brush(p, prev) {
      let target;
      if (audio) {
        p.t = voice.t;
        target = voice.t == null ? 1.6 : 3 + voice.level * 19;
      } else {
        p.t = heightT(p.y);
        if (!prev) target = 12;
        else {
          const dist = Math.hypot((p.x - prev.x) * W, (p.y - prev.y) * H);
          const speed = dist / Math.max(1, p.time - prev.time); // px per ms
          target = clamp(18 - speed * 6, 2.5, 18);
        }
      }
      p.w = prev ? prev.w * 0.6 + target * 0.4 : target;
      return p;
    }

    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      progress = 1;
      const p = brush(point(e), null);
      active = [p];
      user.push(active);
      last = p;
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!active) return;
      const p = point(e);
      if (Math.hypot((p.x - last.x) * W, (p.y - last.y) * H) < 2) return;
      brush(p, last);
      active.push(p);
      setStyle();
      seg(last, p);
      last = p;
    });
    const end = () => { active = null; last = null; };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);

    if (clearBtn) clearBtn.addEventListener("click", () => { auto = []; user = []; progress = 1; draw(); });

    // ---- Listening ------------------------------------------------------
    let audio = null;                 // { ac, stream, analyser, buf }
    const voice = { t: null, hz: 0, level: 0 };
    let history = [], quiet = 0, logHz = 0, shownNote = "";
    let dec, diff, cmnd;              // reusable work buffers

    // YIN pitch detection (de Cheveigné and Kawahara, 2002) on a 2x
    // downsampled frame. Returns a frequency in Hz, or 0 if no clear pitch.
    function detectPitch(buf, rate) {
      const n = buf.length >> 1;
      if (!dec || dec.length !== n) dec = new Float32Array(n);
      for (let i = 0; i < n; i++) dec[i] = (buf[2 * i] + buf[2 * i + 1]) * 0.5;
      const sr = rate / 2;
      const win = n >> 1;
      const minLag = Math.max(2, Math.floor(sr / 1100));
      const maxLag = Math.min(n - win - 1, Math.ceil(sr / 75));
      if (!diff || diff.length !== maxLag + 2) { diff = new Float32Array(maxLag + 2); cmnd = new Float32Array(maxLag + 2); }
      for (let tau = 1; tau <= maxLag + 1; tau++) {
        let s = 0;
        for (let i = 0; i < win; i++) { const d = dec[i] - dec[i + tau]; s += d * d; }
        diff[tau] = s;
      }
      cmnd[0] = 1;
      let run = 0;
      for (let tau = 1; tau <= maxLag + 1; tau++) {
        run += diff[tau];
        cmnd[tau] = run ? (diff[tau] * tau) / run : 1;
      }
      let tau = -1;
      for (let k = minLag; k <= maxLag; k++) {
        if (cmnd[k] < 0.15) {
          while (k + 1 <= maxLag && cmnd[k + 1] < cmnd[k]) k++;
          tau = k;
          break;
        }
      }
      if (tau < 0) return 0;
      const a = cmnd[tau - 1], b = cmnd[tau], c = cmnd[tau + 1];
      const den = a - 2 * b + c;
      const shift = den ? clamp((0.5 * (a - c)) / den, -1, 1) : 0;
      return sr / (tau + shift);
    }

    let tick = 0;
    function listen() {
      if (!audio) return;
      requestAnimationFrame(listen);
      if (tick++ % 2) return;                      // about 30 readings a second
      const { analyser, buf, ac } = audio;
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      const hz = rms > 0.01 ? detectPitch(buf, ac.sampleRate) : 0;

      if (hz >= 70 && hz <= 1200) {
        quiet = 0;
        history.push(Math.log2(hz));
        if (history.length > 3) history.shift();
        const med = [...history].sort((x, y) => x - y)[history.length >> 1];
        // follow quickly, but jump straight to a new note instead of sliding
        logHz = voice.t == null || Math.abs(med - logHz) > 0.25 ? med : logHz * 0.5 + med * 0.5;
        voice.hz = 2 ** logHz;
        voice.t = pitchT(voice.hz);
        const level = clamp((20 * Math.log10(rms) + 42) / 30, 0, 1);
        voice.level = voice.level * 0.6 + level * 0.4;
      } else if (++quiet > 3) {
        voice.t = null;
        voice.level = 0;
        history = [];
      }
      showVoice();
    }

    function showVoice() {
      const singing = voice.t != null;
      demo.classList.toggle("singing", singing);
      if (singing && marker) {
        marker.style.left = `${(voice.t * 100).toFixed(2)}%`;
        marker.style.backgroundColor = color(voice.t);
      }
      const label = singing ? noteName(voice.hz) : "Sing a note";
      if (noteOut && label !== shownNote) { noteOut.textContent = label; shownNote = label; }
    }

    const MESSAGES = {
      off: "Turn on the microphone and sing while you draw. Low notes paint red and high notes paint blue. Sing louder for a thicker line. Until then, the height of your stroke stands in for pitch. Your audio stays in your browser and is never recorded or sent.",
      asking: "Waiting for permission to use the microphone.",
      on: "Listening. Sing and draw at the same time. When you stop singing, the line turns thin and gray. Your audio stays in your browser and is never recorded or sent.",
      blocked: "Microphone access is blocked, so height stands in for pitch. To sing instead, allow the microphone for this site in your browser settings, then try again.",
      unsupported: "This browser can't use the microphone here, so height stands in for pitch.",
      failed: "The microphone didn't start, so height stands in for pitch. Check that one is connected, then try again.",
    };
    const PROBLEMS = ["blocked", "unsupported", "failed"];
    function setState(state) {
      const on = state === "on";
      const problem = PROBLEMS.includes(state);
      demo.classList.toggle("listening", on);
      if (!on) demo.classList.remove("singing");
      if (status) {
        status.textContent = MESSAGES[state];
        status.classList.toggle("problem", problem);
      }
      if (micBtn) {
        micBtn.disabled = state === "asking" || state === "unsupported";
        micBtn.textContent = on ? "Turn off microphone" : state === "asking" ? "Starting microphone" : problem ? "Try microphone again" : "Turn on microphone";
        micBtn.classList.toggle("solid", !on);
        micBtn.setAttribute("aria-pressed", String(on));
      }
    }

    async function startMic() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { setState("unsupported"); return; }
      // Create the audio context inside the click so mobile Safari allows it.
      let ac;
      try {
        ac = new AC();
        ac.resume();
      } catch (err) {
        console.warn("Sing N Sketch: audio could not start.", err);
        setState("failed");
        return;
      }
      setState("asking");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
        await ac.resume();
        const analyser = ac.createAnalyser();
        analyser.fftSize = 2048;
        ac.createMediaStreamSource(stream).connect(analyser);
        audio = { ac, stream, analyser, buf: new Float32Array(analyser.fftSize) };
        voice.t = null; voice.level = 0; history = []; quiet = 0; shownNote = "";
        setState("on");
        showVoice();
        listen();
      } catch (err) {
        console.warn("Sing N Sketch: microphone did not start.", err);
        ac.close();
        const name = err && err.name;
        setState(name === "NotAllowedError" || name === "SecurityError" ? "blocked" : "failed");
      }
    }

    function stopMic(state = "off") {
      if (audio) {
        audio.stream.getTracks().forEach((track) => track.stop());
        audio.ac.close();
        audio = null;
      }
      voice.t = null;
      setState(state);
    }

    if (micBtn) {
      micBtn.addEventListener("click", () => (audio ? stopMic() : startMic()));
      // Let go of the microphone when the visitor leaves the tab.
      document.addEventListener("visibilitychange", () => { if (document.hidden && audio) stopMic(); });
      setState("off");
    }

    // ---- Start ----------------------------------------------------------
    const ro = new ResizeObserver(() => resize());
    ro.observe(band);
    paintScale();
    resize();
    if (!reduce) animate(performance.now());
  }
}
