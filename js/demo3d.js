/* Démo 3D (reprise de alvea-pitch.html), vue patient uniquement.
   Three.js n'est chargé qu'à l'arrivée sur le teaser / la démo. */
import { OPTIONS } from "./i18n.js";

const THREE_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
const ORBIT_URL = "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js";

let threePromise = null;
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.async = true; s.crossOrigin = "anonymous";
    s.onload = res; s.onerror = () => { s.remove(); rej(new Error("load " + src)); };
    document.head.appendChild(s);
  });
}
export function loadThree() {
  if (window.THREE && window.THREE.OrbitControls) return Promise.resolve(window.THREE);
  if (!threePromise) {
    threePromise = (window.THREE ? Promise.resolve() : loadScript(THREE_URL))
      .then(() => loadScript(ORBIT_URL))
      .then(() => window.THREE)
      .catch(e => { threePromise = null; throw e; });
  }
  return threePromise;
}

const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* État des dents 36 et 37 à chaque étape, et couleur de l'étape. */
const STATES = [
  { s36: "fracture", s37: "abimee", c: "--muted" },
  { s36: "extraite", s37: "provisoire", c: "--v1" },
  { s36: "implant", s37: "provisoire", c: "--v2" },
  { s36: "pilier", s37: "provisoire", c: "--v3" },
  { s36: "couronne", s37: "couronne", c: "--v4" }
];
const PRICES = [605, 1100, 350, 1600];
export const money = (n, lang) => lang === "fr" ? n.toLocaleString("fr-BE").replace(/ | /g, " ") + " €" : "€" + n.toLocaleString("en-GB");

/* ---------- la bouche en 3D ---------- */
/* opts : { interactive, orbit (rotation auto), reduced, labels: {l36, l37} } */
export function createMouth(box, opts = {}) {
  const THREE = window.THREE;
  const reduced = !!opts.reduced;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 600 ? 1.75 : 2));
  box.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(38, 4 / 3, 0.1, 100);
  cam.position.set(0, 7.5, 8.5);
  let controls = null;
  if (opts.interactive) {
    controls = new THREE.OrbitControls(cam, renderer.domElement);
    controls.enableDamping = true; controls.enablePan = false; controls.enableZoom = false; // la molette fait défiler la page
    controls.minDistance = 4; controls.maxDistance = 16;
    controls.target.set(0, 0.3, -2.2);
  } else {
    renderer.domElement.style.touchAction = "auto";
    renderer.domElement.setAttribute("aria-hidden", "true");
  }
  const target = controls ? controls.target : new THREE.Vector3(0, 0.3, -2.2);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8aa6a0, 0.85));
  const dl = new THREE.DirectionalLight(0xffffff, 0.8); dl.position.set(3, 8, 6); scene.add(dl);
  const dl2 = new THREE.DirectionalLight(0xbfe9e1, 0.35); dl2.position.set(-5, 3, -4); scene.add(dl2);

  const WID = [0.55, 0.5, 0.62, 0.66, 0.66, 1.0, 0.94, 0.86];
  const total = WID.reduce((a, b) => a + b, 0);
  const Rx = 3.1, Rz = 4.4, SPAN = 1.5;
  function archPos(i, side) {
    let cum = 0; for (let k = 0; k < i - 1; k++) cum += WID[k]; cum += WID[i - 1] / 2;
    const t = cum / total * SPAN;
    return { x: side * Rx * Math.sin(t), z: -Rz * (1 - Math.cos(t)), t };
  }
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .45, metalness: 0 }, o));
  const ENAMEL = 0xEEF2EE;
  const teeth = {};
  function makeArch(upper) {
    const pts = [];
    for (let i = 8; i >= 1; i--) { const p = archPos(i, -1); pts.push(new THREE.Vector3(p.x, 0, p.z)); }
    for (let i = 1; i <= 8; i++) { const p = archPos(i, 1); pts.push(new THREE.Vector3(p.x, 0, p.z)); }
    const curve = new THREE.CatmullRomCurve3(pts);
    const gum = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.46, 16, false),
      mat(0xE59AA3, { roughness: .7, transparent: true, opacity: upper ? 0.25 : 0.82, depthWrite: false }));
    const g = new THREE.Group(); g.add(gum);
    [[-1, upper ? 1 : 4], [1, upper ? 2 : 3]].forEach(([side, q]) => {
      for (let i = 1; i <= 8; i++) {
        const p = archPos(i, side), w = WID[i - 1], h = i <= 3 ? 0.95 : (i <= 5 ? 0.8 : 0.72), d = i <= 3 ? 0.42 : (i <= 5 ? 0.62 : 0.82);
        const tg = new THREE.Group(); tg.position.set(p.x, 0, p.z); tg.rotation.y = -side * p.t;
        const crown = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 18), mat(ENAMEL, { transparent: upper, opacity: upper ? 0.3 : 1 }));
        crown.scale.set(w * 0.92, h, d); crown.position.y = 0.62; tg.add(crown);
        g.add(tg);
        if (!upper) teeth[q * 10 + i] = { g: tg, crown, w, d, h };
      }
    });
    if (upper) { g.rotation.z = Math.PI; g.position.set(0, 2.0, 0); }
    scene.add(g); return g;
  }
  makeArch(false); makeArch(true);

  const T36 = teeth[36], T37 = teeth[37];
  const crack = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.75, 0.9), mat(0x5a2a22)); crack.position.y = 0.65; crack.rotation.z = 0.25; T36.g.add(crack);
  const socket = new THREE.Mesh(new THREE.CircleGeometry(0.34, 32), mat(0x9b3a3a, { side: THREE.DoubleSide })); socket.rotation.x = -Math.PI / 2; socket.position.y = 0.47; T36.g.add(socket);
  const graft = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), mat(0xD9B38C, { roughness: .9 })); graft.scale.y = 0.45; graft.position.y = 0.42; T36.g.add(graft);
  const implant = new THREE.Group();
  const metal = mat(0x9AA5B1, { metalness: .85, roughness: .3 });
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.12, 0.8, 24), metal); screw.position.y = 0.1; implant.add(screw);
  for (let k = 0; k < 5; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.17 - k * 0.008, 0.025, 8, 24), metal); r.rotation.x = Math.PI / 2; r.position.y = -0.2 + k * 0.14; implant.add(r); }
  T36.g.add(implant);
  const abut = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.32, 24), mat(0xC3CCD4, { metalness: .7, roughness: .25 })); abut.position.y = 0.62; T36.g.add(abut);
  const decay = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), mat(0x6b4a2a)); decay.position.set(0.12, 0.9, 0); decay.scale.y = 0.4; T37.g.add(decay);
  function ring() {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.68, 40), new THREE.MeshBasicMaterial({ color: 0x14B8A6, transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.5; return m;
  }
  const r36 = ring(), r37 = ring(); T36.g.add(r36); T37.g.add(r37);

  function setTooth(T, st) {
    const c = T.crown; c.visible = true; c.scale.set(T.w * 0.92, T.h, T.d); c.position.y = 0.62;
    c.material.emissive = new THREE.Color(0x000000);
    c.material.color.setHex({ fracture: 0xE9B8AE, abimee: 0xE3D3A3, provisoire: 0xF1E1C6, couronne: 0xFBFBF8 }[st] || ENAMEL);
    if (st === "fracture") { c.material.emissive.setHex(0x5a1206); c.material.emissiveIntensity = .35; }
    if (st === "abimee") { c.scale.y = T.h * 0.82; c.position.y = 0.56; }
    if (st === "couronne") { c.material.emissive.setHex(0x0b4d45); c.material.emissiveIntensity = .12; }
    if (["extraite", "implant", "pilier"].includes(st)) c.visible = false;
  }
  let focus = 0;
  /* i = -1 : bouche intacte, sans repère (début du teaser) */
  function setStep(i) {
    const s = STATES[i] || { s36: "", s37: "", c: "--teal" };
    setTooth(T36, s.s36); setTooth(T37, s.s37);
    crack.visible = s.s36 === "fracture"; socket.visible = s.s36 === "extraite"; graft.visible = s.s36 === "extraite";
    implant.visible = ["implant", "pilier", "couronne"].includes(s.s36); abut.visible = s.s36 === "pilier";
    decay.visible = s.s37 === "abimee";
    const col = new THREE.Color(css(i === 0 ? "--teal" : s.c) || "#14B8A6");
    r36.material.color.copy(col); r37.material.color.copy(col);
    r36.visible = r37.visible = i >= 0;
    focus = i <= 0 ? 0 : 1;
  }

  const labels = opts.labels || {};
  const v = new THREE.Vector3();
  function place(el, T) {
    if (!el) return;
    T.g.getWorldPosition(v); v.y += 1.25; v.project(cam);
    el.style.left = ((v.x + 1) / 2 * box.clientWidth) + "px"; el.style.top = ((1 - v.y) / 2 * box.clientHeight) + "px"; el.hidden = v.z > 1 || !r36.visible;
  }
  function resize() {
    const w = box.clientWidth, h = box.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(box); resize();
  const tgt36 = new THREE.Vector3(); T36.g.getWorldPosition(tgt36);
  const home = new THREE.Vector3(0, 0.3, -2.2), near = new THREE.Vector3(tgt36.x * 0.7, 0.5, tgt36.z * 0.8);
  let clock = 0, userMoved = false, raf = 0, visible = true, orbitAngle = 0.0;
  if (controls) controls.addEventListener("start", () => { userMoved = true; opts.onUserMove && opts.onUserMove(); });
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; }); io.observe(box);
  const desired = new THREE.Vector3();
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    clock += 0.016;
    // Sur un écran étroit (téléphone), on recule la caméra pour garder toute l'arcade.
    const k = Math.max(1, 1.3 / cam.aspect);
    target.lerp(focus ? near : home, reduced ? 1 : 0.04);
    if (opts.orbit) {
      if (!reduced) orbitAngle += 0.0035;
      const dist = 10.8 * k;
      desired.set(target.x + Math.sin(orbitAngle) * dist * 0.75, 7.6, target.z + Math.cos(orbitAngle) * dist * 0.75);
      cam.position.lerp(desired, reduced ? 1 : 0.05);
      cam.lookAt(target);
    } else if (!userMoved) {
      const ang = focus ? 0.55 : 0, dist = (focus ? 6.6 : 10.5) * k;
      desired.set(target.x + Math.sin(ang) * dist * 0.75, (focus ? 5.2 : 7.2) * Math.min(k, 1.25), target.z + Math.cos(ang) * dist * 0.75);
      cam.position.lerp(desired, reduced ? 1 : 0.035);
    }
    const pulse = 0.55 + 0.35 * Math.sin(clock * 3); r36.material.opacity = r37.material.opacity = reduced ? .8 : pulse;
    if (controls) controls.update(); else cam.lookAt(target);
    renderer.render(scene, cam); place(labels.l36, T36); place(labels.l37, T37);
  }
  setStep(opts.step ?? 0);
  loop();

  return {
    setStep,
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      if (controls) controls.dispose();
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      renderer.dispose(); renderer.domElement.remove();
    }
  };
}

/* ---------- écran 8 : la démo interactive ---------- */
const DEMO_KEYS = ["demo_3d", "demo_attentes", "demo_prix_visite", "demo_envoi_patient"];

export function mountDemo(host, { t, lang, reduced, answers, onReact }) {
  const d = t.demo, STEPS = d.steps, OPTS = OPTIONS;
  const lab = v => (lang === "fr" ? v : (t.opt[v] || v));

  host.innerHTML = `
    <h2 class="demo-intro">${d.intro}</h2>
    <div class="demo">
      <div class="stage">
        <div class="canvas-box" id="canvasBox">
          <div class="stage-caption"><span class="k" id="capK"></span><span class="t" id="capT" aria-live="polite"></span></div>
          <div class="tlabel" id="l36" hidden>36</div><div class="tlabel" id="l37" hidden>37</div>
          <div class="hint3d">${d.hint}</div>
        </div>
        <div class="scrub" id="scrub" role="group" aria-label="${d.stepsLabel}"></div>
      </div>
      <div class="panel">
        <div class="phone">
          <div class="from">${d.from}</div>
          <h3>${d.hello}</h3>
          <div class="stats">
            <div class="stat"><b>4</b><span>${d.stats[0]}</span></div>
            <div class="stat"><b>~6</b><span>${d.stats[1]}</span></div>
            <div class="stat"><b>3h45</b><span>${d.stats[2]}</span></div>
            <div class="stat"><b>2</b><span>${d.stats[3]}</span></div>
          </div>
          <div class="tl" id="tl"></div>
          <div class="quote" id="quote"></div>
          <div id="acceptBox"><button class="btn" type="button" id="accept" style="width:100%">${d.accept}</button></div>
        </div>
      </div>
    </div>
    <p class="fictive">${d.fictive}</p>
    <div class="bubble" id="bubble" role="region" aria-live="polite" hidden></div>`;

  const $ = s => host.querySelector(s);
  const scrub = $("#scrub"), tl = $("#tl"), bubble = $("#bubble");
  document.body.appendChild(bubble);   // hors de l'écran animé, pour que « position: fixed » reste collé au bas de la fenêtre
  let cur = 0, mouth = null, alive = true, playing = false;
  const timers = [];
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };

  /* frise + chronologie patient */
  STEPS.forEach((s, i) => {
    const color = `var(${STATES[i].c})`;
    const b = document.createElement("button");
    b.type = "button"; b.className = "step"; b.style.setProperty("--c", color);
    b.innerHTML = `<span class="dot"></span><span class="n">${s.k}</span><span class="d">${s.lab}</span>`;
    b.onclick = () => { stop(); go(i); if (i === 0) trigger("demo_3d"); };
    scrub.appendChild(b);
    if (s.w) {
      const w = document.createElement("button");
      w.type = "button"; w.className = "wait";
      w.innerHTML = `<span>${s.w.n}</span><span>${s.w.s}</span>`;
      w.setAttribute("aria-label", `${d.waitWord} : ${s.w.n}, ${s.w.s}. ${s.w.why}`);
      w.onclick = () => { stop(); go(i + 1); trigger("demo_attentes"); };
      w.onmouseenter = () => trigger("demo_attentes");
      scrub.appendChild(w);
    }
    if (i > 0) {
      const vb = document.createElement("button");
      vb.type = "button"; vb.className = "vis"; vb.dataset.i = i; vb.style.setProperty("--c", color);
      vb.innerHTML = `<span class="top"><span>${s.k}</span><small>${s.lab}</small></span><p>${s.p}</p>`;
      vb.onclick = () => { stop(); go(i); };
      tl.appendChild(vb);
      if (s.w) {
        const pw = document.createElement("div");
        pw.className = "pw";
        pw.innerHTML = `${d.waitWord} · <b>${s.w.n}, ${s.w.s}</b><br>${s.w.why}`;
        tl.appendChild(pw);
      }
    }
  });
  const ctrl = document.createElement("div"); ctrl.className = "ctrl";
  ctrl.innerHTML = `<button class="btn ghost" type="button" id="play">${d.play}</button>`;
  scrub.appendChild(ctrl);
  const playBtn = $("#play");
  const quote = $("#quote");
  quote.innerHTML = d.prices.map((p, i) => `<div class="qrow"><span>${p}</span><span>${money(PRICES[i], lang)}</span></div>`).join("")
    + `<div class="qrow total"><span>${d.total}</span><span>${money(PRICES.reduce((a, b) => a + b, 0), lang)}</span></div>`;

  function go(i) {
    cur = i;
    scrub.querySelectorAll(".step").forEach((b, k) => b.setAttribute("aria-pressed", String(k === i)));
    tl.querySelectorAll(".vis").forEach(v => v.classList.toggle("on", Number(v.dataset.i) === i));
    $("#capK").textContent = STEPS[i].k;
    $("#capT").textContent = STEPS[i].t;
    if (mouth) mouth.setStep(i);
    if (i >= 2) trigger("demo_attentes");   // on vient de passer une attente
  }

  /* ---------- bulles de réaction : une seule à la fois ---------- */
  const queue = [];
  let open = null;
  function trigger(k) {
    if (!alive || answers[k] || open === k || queue.includes(k)) return;
    queue.push(k);
    queue.sort((a, b) => DEMO_KEYS.indexOf(a) - DEMO_KEYS.indexOf(b));
    showNext();
  }
  function showNext() {
    if (open || !queue.length || !alive) return;
    open = queue.shift();
    const k = open;
    bubble.className = "bubble";
    bubble.innerHTML = `<span class="k"><span>${d.bubbleKicker}</span><span>${DEMO_KEYS.filter(x => answers[x]).length + 1}/4</span></span>
      <p id="bq">${t.q[k]}</p>
      <div class="chips" role="group" aria-labelledby="bq">${OPTS[k].map(v => `<button type="button" class="chip" data-v="${v}" aria-pressed="false">${lab(v)}</button>`).join("")}</div>`;
    bubble.hidden = false;
    bubble.querySelectorAll(".chip").forEach(c => c.onclick = () => {
      c.setAttribute("aria-pressed", "true");
      answers[k] = c.dataset.v;
      onReact(k, c.dataset.v);
      bubble.classList.add("done");
      bubble.innerHTML = `<div class="ok">${d.thanks}</div>`;
      later(() => { bubble.hidden = true; open = null; later(showNext, 250); }, reduced ? 400 : 750);
    });
  }

  /* ---------- déclencheurs ---------- */
  later(() => { if (cur === 0) trigger("demo_3d"); }, reduced ? 300 : 1500);
  let scrolled = false;
  const onScroll = () => { if (scrollY > 60) scrolled = true; };
  addEventListener("scroll", onScroll, { passive: true });
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    if (e.target.classList.contains("pw") && scrolled) trigger("demo_attentes");
    if (e.target === quote && (scrolled || cur === STEPS.length - 1)) trigger("demo_prix_visite");
  }), { threshold: 0.9 });
  tl.querySelectorAll(".pw").forEach(p => io.observe(p));
  io.observe(quote);
  quote.addEventListener("click", () => trigger("demo_prix_visite"));
  $("#accept").onclick = () => {
    $("#acceptBox").innerHTML = `<div class="accepted" role="status">${d.accepted}</div>`;
    trigger("demo_envoi_patient");
  };

  /* ---------- Lecture : guide pas à pas et déclenche les bulles ---------- */
  const wait = ms => new Promise(r => later(r, ms));
  const untilClosed = async () => { while (alive && playing && (open || queue.length)) await wait(200); };
  const scrollTo = el => el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  function stop() { playing = false; playBtn.textContent = d.play; }
  async function guide() {
    playing = true; playBtn.textContent = d.pause; playBtn.classList.remove("pulse");
    for (let i = 0; i < STEPS.length; i++) {
      if (!playing) return;
      go(i);
      if (i === 0) trigger("demo_3d");
      await wait(reduced ? 1200 : 2200);
      await untilClosed();
    }
    if (!playing) return;
    scrollTo(quote); await wait(600);
    trigger("demo_prix_visite");
    await untilClosed();
    if (!playing) return;
    const acc = $("#accept");
    if (acc) { scrollTo(acc); acc.classList.add("pulse"); }
    stop();
  }
  playBtn.onclick = () => (playing ? stop() : guide());
  // Si rien ne bouge, on attire l'œil sur « Lecture »
  later(() => { if (!playing && DEMO_KEYS.some(k => !answers[k])) playBtn.classList.add("pulse"); }, 6000);
  host.addEventListener("pointerdown", () => playBtn.classList.remove("pulse"), { once: true });

  /* ---------- 3D ---------- */
  go(0);
  $("#capT").textContent = STEPS[0].t;
  loadThree().then(() => {
    if (!alive) return;
    try {
      mouth = createMouth($("#canvasBox"), {
        interactive: true, reduced, step: cur,
        labels: { l36: $("#l36"), l37: $("#l37") }
      });
    } catch (e) { $("#capT").textContent = d.noWebgl; }
  }).catch(() => { if (alive) $("#capT").textContent = d.noWebgl; });

  return () => {
    alive = false; playing = false;
    timers.forEach(clearTimeout);
    io.disconnect();
    removeEventListener("scroll", onScroll);
    if (mouth) mouth.dispose();
    bubble.remove();
  };
}
