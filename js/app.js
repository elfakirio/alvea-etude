/* Navigation, état, validation et envoi. Un écran à la fois, rendu dans <main id="screen">. */
import { CONFIG } from "./config.js";
import { OPTIONS, TEXTS } from "./i18n.js";
import { mountReviews } from "./reviews.js";
import { mountTeaser } from "./teaser.js";
import { mountDemo, loadThree } from "./demo3d.js";

const STORE = "alvea-etude-v1", CODE_KEY = "alvea-code", REF_KEY = "alvea-ref", LANG_KEY = "alvea-lang";
const MIN_SECONDS = 60;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const DEMO_KEYS = ["demo_3d", "demo_attentes", "demo_prix_visite", "demo_envoi_patient"];

/* ---------- stockage (protégé : navigation privée, stockage bloqué…) ---------- */
const ls = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sans stockage, le parcours marche quand même */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* idem */ } }
};

function randomCode() {
  const abc = "abcdefghijklmnopqrstuvwxyz0123456789", b = new Uint8Array(6);
  crypto.getRandomValues(b);
  return Array.from(b, x => abc[x % 36]).join("");
}

const params = new URLSearchParams(location.search);
let code = ls.get(CODE_KEY);
if (!/^[a-z0-9]{6}$/.test(code || "")) { code = randomCode(); ls.set(CODE_KEY, code); }

const refParam = (params.get("ref") || "").toLowerCase();
if (/^[a-z0-9]{3,32}$/.test(refParam) && refParam !== code) ls.set(REF_KEY, refParam);
const ref = ls.get(REF_KEY) || "";

function freshState() { return { screen: 0, answers: {}, startedAt: null }; }
let state = Object.assign(freshState(), ls.get(STORE) || {});
const save = () => ls.set(STORE, state);

let lang = (params.get("lang") || ls.get(LANG_KEY) || ((navigator.language || "").toLowerCase().startsWith("en") ? "en" : "fr"));
if (!TEXTS[lang]) lang = "fr";
let t = TEXTS[lang];
const opt = v => (lang === "fr" ? v : (t.opt[v] || v));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);

/* ---------- définition des écrans ---------- */
const F = (k, type, o = {}) => ({ k, type, ...o });
const SCREENS = [
  { id: "accueil" },
  { id: "curseur" },
  { id: "avis" },
  { id: "profil", form: [
    F("profil", "single", { req: true }),
    F("type_cabinet", "single", { req: true, compact: true }),
    F("nb_fauteuils", "counter", { min: 1, max: 30 }),
    F("annees_exercice", "single", { compact: true }),
    F("part_implanto", "single", { req: true, compact: true }),
    F("pays", "single", { req: true, compact: true }),
    F("ville", "text", { auto: "address-level2" })
  ] },
  { id: "presentation", form: [
    F("supports", "multi", { req: true }),
    F("qui_presente", "multi"),
    F("temps_explication", "single", { req: true, compact: true }),
    F("patient_repart_avec", "multi"),
    F("logiciel", "text")
  ] },
  { id: "refus", form: [
    F("raisons_refus", "multi", { req: true }),
    F("dernier_refus", "area", { privacy: true }),
    F("questions_reposees", "area", { privacy: true })
  ] },
  { id: "outils", form: [
    F("outil_essaye", "single", { req: true }),
    F("outil_detail", "area", { show: a => !!a.outil_essaye && a.outil_essaye !== "Non" }),
    F("budget_actuel", "single", { compact: true })
  ] },
  { id: "teaser" },
  { id: "demo" },
  { id: "idee", form: [
    F("interet", "stars", { req: true }),
    F("elements_utiles", "multi"),
    F("dicter_realiste", "single", { compact: true }),
    F("manque", "area")
  ] },
  { id: "suite", form: [
    F("rester_informe", "check"),
    F("pilote", "single", { req: true, compact: true }),
    F("appel", "check"),
    F("nom", "text", { auto: "name" }),
    F("email", "email", { req: a => !!(a.rester_informe || a.appel || a.pilote === "Oui" || a.pilote === "Peut-être") }),
    F("telephone", "tel", { show: a => !!a.appel }),
    F("confreres", "area"),
    F("consentement", "consent", { req: true })
  ] },
  { id: "merci" }
];
const LAST = SCREENS.length - 1;
if (!(state.screen >= 0 && state.screen < LAST)) state.screen = 0;

const isShown = f => !f.show || f.show(state.answers);
const isReq = f => isShown(f) && (typeof f.req === "function" ? f.req(state.answers) : !!f.req);

/* ---------- éléments fixes ---------- */
const $ = s => document.querySelector(s);
const main = $("#screen"), navbar = $("#navbar"), backBtn = $("#back"), nextBtn = $("#next"),
  navStatus = $("#navStatus"), restartBtn = $("#restart"), progress = $("#progress");
let cleanup = null;
let thanksInfo = null;      // gardé en mémoire seulement, après un envoi réussi
let sending = false;

/* ---------- rendu des champs ---------- */
const optTag = f => `<span class="opt-tag" data-opt="${f.k}"${isReq(f) ? " hidden" : ""}>(${t.ui.optional})</span>`;
const errP = f => `<p class="err" id="e_${f.k}" aria-live="polite"></p>`;

function fieldHTML(f) {
  const a = state.answers, k = f.k, q = esc(t.q[k]);
  const hid = isShown(f) ? "" : " hidden";
  switch (f.type) {
    case "single":
    case "multi": {
      const multi = f.type === "multi";
      const cls = f.compact ? "opts row" : "opts two";
      const items = OPTIONS[k].map((v, i) => {
        const on = multi ? (a[k] || []).includes(v) : a[k] === v;
        return `<label class="opt${multi ? " multi" : ""}"><input type="${multi ? "checkbox" : "radio"}" name="${k}" value="${esc(v)}" data-k="${k}"${on ? " checked" : ""} id="${k}_${i}"><span class="box" aria-hidden="true"></span><span>${esc(opt(v))}</span></label>`;
      }).join("");
      return `<fieldset class="field" data-field="${k}"${hid} aria-describedby="e_${k}"><legend>${q} ${optTag(f)}</legend>
        ${multi ? `<p class="hint">${t.ui.multi}</p>` : ""}<div class="${cls}">${items}</div>${errP(f)}</fieldset>`;
    }
    case "counter": {
      const v = a[k];
      return `<div class="field" data-field="${k}"${hid}><span class="q" id="l_${k}">${q} ${optTag(f)}</span>
        <div class="counter" role="group" aria-labelledby="l_${k}">
          <button type="button" data-step="-1" data-k="${k}" aria-label="${t.ui.minus}">−</button>
          <output id="o_${k}" aria-live="polite">${v ?? "–"}</output>
          <button type="button" data-step="1" data-k="${k}" aria-label="${t.ui.plus}">+</button>
        </div>${errP(f)}</div>`;
    }
    case "stars": {
      const v = a[k] || 0;
      const star = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" stroke-linejoin="round"/></svg>`;
      const items = [1, 2, 3, 4, 5].map(n => `<label class="${n <= v ? "on" : ""}"><input type="radio" name="${k}" value="${n}" data-k="${k}"${n === v ? " checked" : ""}><span class="sr-only">${n} / 5</span>${star}</label>`).join("");
      return `<fieldset class="field" data-field="${k}"${hid} aria-describedby="e_${k}"><legend>${q} ${optTag(f)}</legend>
        <p class="hint">${esc(t.q.interet_hint)}</p><div class="stars">${items}</div>${errP(f)}</fieldset>`;
    }
    case "check":
      return `<div class="field" data-field="${k}"${hid}><label class="check"><input type="checkbox" data-k="${k}" id="i_${k}"${a[k] ? " checked" : ""}><span>${q}</span></label>${errP(f)}</div>`;
    case "consent":
      return `<div class="field" data-field="${k}"${hid}><label class="check consent"><input type="checkbox" data-k="${k}" id="i_${k}" aria-describedby="e_${k}"${a[k] ? " checked" : ""}><span>${q}</span></label>
        <a href="confidentialite.html${lang === "en" ? "?lang=en" : ""}" target="_blank" rel="noopener">${esc(t.q.consent_link)}</a>${errP(f)}</div>`;
    case "area":
      return `<div class="field" data-field="${k}"${hid}><label class="q" for="i_${k}">${q} ${optTag(f)}</label>
        <textarea class="area" id="i_${k}" data-k="${k}" rows="4" maxlength="3000" aria-describedby="e_${k}${f.privacy ? " h_" + k : ""}">${esc(a[k] || "")}</textarea>
        ${f.privacy ? `<p class="hint" id="h_${k}">${t.ui.privacyHint}</p>` : ""}${errP(f)}</div>`;
    default: {
      const type = f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text";
      const ac = f.auto || (type === "email" ? "email" : type === "tel" ? "tel" : "off");
      return `<div class="field" data-field="${k}"${hid}><label class="q" for="i_${k}">${q} ${optTag(f)}</label>
        <input class="text" type="${type}" id="i_${k}" data-k="${k}" autocomplete="${ac}" maxlength="200"${type === "email" ? ' inputmode="email" spellcheck="false" autocapitalize="off"' : ""} value="${esc(a[k] || "")}" aria-describedby="e_${k}">${errP(f)}</div>`;
    }
  }
}

function formScreen(s) {
  const st = t.screens[s.id];
  main.innerHTML = `<section class="screen">
    <div class="head"><h2 tabindex="-1">${esc(st.title)}</h2>${st.sub ? `<p class="lead">${esc(st.sub)}</p>` : ""}</div>
    <form class="fields" novalidate onsubmit="return false">${s.form.map(fieldHTML).join("")}
    ${s.id === "suite" ? `<div class="hp" aria-hidden="true"><label for="website">Website</label><input id="website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
      <p class="notice bad" id="submitMsg" role="alert" hidden></p>` : ""}
    </form></section>`;
}

/* Met à jour ce qui dépend des réponses (champs conditionnels, mention « facultatif »). */
function refreshConditionals() {
  const s = SCREENS[state.screen];
  if (!s.form) return;
  s.form.forEach(f => {
    const el = main.querySelector(`[data-field="${f.k}"]`);
    if (!el) return;
    el.hidden = !isShown(f);
    const tag = el.querySelector(`[data-opt="${f.k}"]`);
    if (tag) tag.hidden = isReq(f);
  });
}

/* ---------- validation ---------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function setErr(k, msg) {
  const p = main.querySelector("#e_" + k), field = main.querySelector(`[data-field="${k}"]`);
  if (p) p.textContent = msg || "";
  if (field) {
    field.classList.toggle("invalid", !!msg);
    field.querySelectorAll("input,textarea").forEach(i => msg ? i.setAttribute("aria-invalid", "true") : i.removeAttribute("aria-invalid"));
  }
}
function errorFor(f) {
  const v = state.answers[f.k];
  if (!isShown(f)) return "";
  if (f.type === "email" && v && !EMAIL_RE.test(String(v).trim())) return t.ui.errEmail;
  if (!isReq(f)) return "";
  const empty = v === undefined || v === null || v === "" || v === false || (Array.isArray(v) && !v.length);
  if (!empty) return "";
  if (f.type === "consent") return t.ui.errConsent;
  if (f.type === "email") return t.ui.errEmailNeeded;
  return t.ui.errRequired;
}
function validate() {
  const s = SCREENS[state.screen];
  if (!s.form) return true;
  let first = null;
  s.form.forEach(f => { const e = errorFor(f); setErr(f.k, e); if (e && !first) first = f; });
  if (first) {
    const el = main.querySelector(`[data-field="${first.k}"]`);
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    const focusable = el.querySelector("input:not([type=hidden]),textarea,button");
    if (focusable) setTimeout(() => focusable.focus({ preventScroll: true }), reduced ? 0 : 300);
    return false;
  }
  return true;
}

/* ---------- saisie (délégation) ---------- */
function onFieldChange(e) {
  const el = e.target, k = el.dataset && el.dataset.k;
  if (!k) return;
  const a = state.answers;
  if (el.type === "radio") a[k] = k === "interet" ? Number(el.value) : el.value;
  else if (el.type === "checkbox" && el.name === k) a[k] = OPTIONS[k].filter(v => main.querySelector(`input[name="${k}"][value="${CSS.escape(v)}"]`)?.checked);
  else if (el.type === "checkbox") a[k] = el.checked;
  else a[k] = el.value;
  if (k === "interet") main.querySelectorAll(".stars label").forEach((l, i) => l.classList.toggle("on", i < a[k]));
  save();
  if (e.type === "change" || el.type === "checkbox" || el.type === "radio") setErr(k, "");
  refreshConditionals();
}
main.addEventListener("change", onFieldChange);
main.addEventListener("input", e => { if (e.target.matches(".text,.area")) onFieldChange(e); });
main.addEventListener("focusout", e => {
  // Signale un email mal formé dès qu'on quitte le champ
  if (e.target.matches('input[type="email"]')) {
    const f = SCREENS[state.screen].form?.find(x => x.k === e.target.dataset.k);
    if (f && state.answers[f.k]) setErr(f.k, errorFor(f));
  }
});
main.addEventListener("click", e => {
  const b = e.target.closest("[data-step]");
  if (!b) return;
  const k = b.dataset.k, f = SCREENS[state.screen].form.find(x => x.k === k);
  const cur = state.answers[k];
  const next = cur == null ? (Number(b.dataset.step) > 0 ? 1 : null) : Math.min(f.max, Math.max(f.min, cur + Number(b.dataset.step)));
  state.answers[k] = next;
  main.querySelector("#o_" + k).textContent = next ?? "–";
  save();
});

/* ---------- écrans particuliers ---------- */
function welcomeScreen() {
  main.innerHTML = `<section class="screen welcome">
    <svg class="mark" viewBox="0 0 40 40" aria-hidden="true"><path d="M7 10v9a13 13 0 0 0 26 0v-9" fill="none" stroke="url(#lg)" stroke-width="4.5" stroke-linecap="round"/><circle cx="20" cy="17" r="6" fill="url(#lg)"/></svg>
    <h1 tabindex="-1">${esc(t.welcome.title)}</h1>
    <p class="lead">${esc(t.welcome.sub)}</p>
    <button class="btn big start" type="button" id="startBtn">${t.ui.start}</button>
    <p class="small">${esc(t.welcome.small)}</p>
  </section>`;
  main.querySelector("#startBtn").onclick = () => {
    if (!state.startedAt) state.startedAt = Date.now();
    go(1);
  };
}

function sliderScreen() {
  const v = state.answers.plans_signes_sur_10;
  const doc = `<svg viewBox="0 0 20 26" aria-hidden="true"><path class="pg" d="M2 1.5h11l5 5v18H2z" stroke-linejoin="round"/><path class="ln" d="M5.5 11h9M5.5 15h9M5.5 19h6"/></svg>`;
  main.innerHTML = `<section class="screen">
    <div class="head"><h2 tabindex="-1" id="sq">${esc(t.slider.q)}</h2></div>
    <div class="slider-box" data-field="plans_signes_sur_10">
      <div class="big-num" aria-hidden="true"><span id="bn"></span><small>${t.slider.of}</small></div>
      <div class="docs" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<span data-i="${i}">${doc}</span>`).join("")}</div>
      <input class="range" type="range" min="0" max="10" step="1" id="rng" aria-labelledby="sq" aria-describedby="e_plans_signes_sur_10" value="${v ?? 5}">
      <div class="range-ends" aria-hidden="true"><span>0</span><span>10</span></div>
      <p class="err" id="e_plans_signes_sur_10" aria-live="polite"></p>
    </div></section>`;
  const rng = main.querySelector("#rng"), bn = main.querySelector("#bn"), num = main.querySelector(".big-num");
  const paint = () => {
    const val = state.answers.plans_signes_sur_10;
    const has = typeof val === "number";
    bn.textContent = has ? val : t.slider.unset;
    num.classList.toggle("unset", !has);
    main.querySelectorAll(".docs > span").forEach((s, i) => s.classList.toggle("on", has && i < val));
    rng.style.setProperty("--pct", (Number(rng.value) * 10) + "%");
    rng.setAttribute("aria-valuetext", has ? `${val} ${t.slider.of}` : t.slider.label);
  };
  const set = () => { state.answers.plans_signes_sur_10 = Number(rng.value); save(); setErr("plans_signes_sur_10", ""); paint(); };
  rng.addEventListener("input", set);
  rng.addEventListener("pointerup", set);
  rng.addEventListener("keyup", e => { if (/Arrow|Home|End|Page/.test(e.key)) set(); });
  paint();
}

function teaserScreen() {
  main.innerHTML = `<section class="screen" id="teaserHost"></section>`;
  return mountTeaser(main.querySelector("#teaserHost"), { t, lang, reduced });
}

function demoScreen() {
  main.innerHTML = `<section class="screen wide" id="demoHost" style="padding-bottom:calc(var(--nav-h) + 230px)"></section>`;
  return mountDemo(main.querySelector("#demoHost"), {
    t, lang, reduced,
    answers: state.answers,
    onReact(k, v) { state.answers[k] = v; save(); updateNav(); }
  });
}

function thanksScreen() {
  const link = CONFIG.SITE_URL + "?ref=" + code;
  const msg = fill(t.thanks.message, { link });
  const info = thanksInfo || {};
  main.innerHTML = `<section class="screen thanks">
    <svg class="mark" viewBox="0 0 40 40" aria-hidden="true"><path d="M7 10v9a13 13 0 0 0 26 0v-9" fill="none" stroke="url(#lg)" stroke-width="4.5" stroke-linecap="round"/><circle cx="20" cy="17" r="6" fill="url(#lg)"/></svg>
    <div class="head"><h1 tabindex="-1">${esc(t.thanks.title)}</h1><p class="lead">${esc(t.thanks.line)}</p></div>
    ${info.email ? `<p class="notice">${esc(fill(t.thanks.informed, { email: info.email }))}</p>` : ""}
    <div class="share">
      <h2>${esc(t.thanks.shareTitle)}</h2>
      <div class="linkbox"><label class="small" for="shareLink">${esc(t.thanks.shareSub)}</label>
        <input class="text" id="shareLink" readonly value="${esc(link)}"></div>
      <div class="btns">
        <button class="btn" type="button" id="copyBtn">${esc(t.thanks.copy)}</button>
        <a class="btn ghost" id="waBtn" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${esc(t.thanks.whatsapp)}</a>
        <a class="btn ghost" id="mailBtn" href="mailto:?subject=${encodeURIComponent(t.thanks.mailSubject)}&body=${encodeURIComponent(msg)}">${esc(t.thanks.email)}</a>
      </div>
      <p class="live" id="copyLive" aria-live="polite"></p>
      <p class="msg">${esc(msg)}</p>
    </div>
  </section>`;
  const input = main.querySelector("#shareLink"), live = main.querySelector("#copyLive");
  main.querySelector("#copyBtn").onclick = async () => {
    try {
      await navigator.clipboard.writeText(link);
      live.textContent = t.thanks.copied;
    } catch {
      input.focus(); input.select(); input.setSelectionRange(0, link.length);
      live.textContent = t.thanks.copyFallback;
    }
  };
}

/* ---------- envoi ---------- */
const PAYLOAD_KEYS = ["plans_signes_sur_10", "profil", "type_cabinet", "nb_fauteuils", "annees_exercice", "part_implanto", "pays", "ville",
  "supports", "qui_presente", "temps_explication", "patient_repart_avec", "logiciel", "raisons_refus", "dernier_refus", "questions_reposees",
  "outil_essaye", "outil_detail", "budget_actuel", ...DEMO_KEYS, "interet", "elements_utiles", "dicter_realiste", "manque",
  "rester_informe", "pilote", "appel", "nom", "email", "telephone", "confreres", "consentement"];
const ARRAYS = new Set(["supports", "qui_presente", "patient_repart_avec", "raisons_refus", "elements_utiles"]);
const BOOLS = new Set(["rester_informe", "appel", "consentement"]);
const NUMBERS = new Set(["plans_signes_sur_10", "nb_fauteuils", "interet"]);
const ALL_FIELDS = SCREENS.flatMap(s => s.form || []);

function buildPayload() {
  const a = state.answers;
  const p = {
    langue: lang.toUpperCase(),
    envoye_par: ref,
    code_partage: code,
    duree_secondes: Math.round((Date.now() - (state.startedAt || Date.now())) / 1000)
  };
  PAYLOAD_KEYS.forEach(k => {
    const f = ALL_FIELDS.find(x => x.k === k);
    const shown = !f || isShown(f);   // un champ masqué part vide
    let v = shown ? a[k] : undefined;
    if (ARRAYS.has(k)) v = Array.isArray(v) ? v : [];
    else if (BOOLS.has(k)) v = !!v;
    else if (NUMBERS.has(k)) v = typeof v === "number" ? v : null;
    else v = typeof v === "string" ? v.trim() : "";
    p[k] = v;
  });
  return p;
}

function submitMsg(text) {
  const m = main.querySelector("#submitMsg");
  if (!m) return;
  m.hidden = !text; m.textContent = text || "";
}

async function submit() {
  if (sending) return;
  submitMsg("");
  if (!validate()) return;
  const payload = buildPayload();
  if (main.querySelector("#website")?.value) { finish(payload, false); return; }   // honeypot : on ne transmet rien
  if (payload.duree_secondes < MIN_SECONDS) { submitMsg(t.submit.tooFast); return; }
  if (!/^(https:\/\/|http:\/\/localhost[:/])/.test(CONFIG.WEBHOOK_URL)) {
    console.info("[Alvea] Webhook non configuré. Payload :", payload);
    submitMsg(t.submit.notConfigured);
    return;
  }
  sending = true;
  nextBtn.textContent = t.submit.sending; nextBtn.setAttribute("aria-busy", "true");
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(CONFIG.WEBHOOK_URL, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: ctrl.signal
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    finish(payload, true);
  } catch (err) {
    console.warn("[Alvea] Envoi échoué", err);
    submitMsg(t.submit.error);
    nextBtn.textContent = t.submit.retry;
  } finally {
    clearTimeout(timer); sending = false; nextBtn.removeAttribute("aria-busy");
  }
}

function finish(payload) {
  thanksInfo = { email: payload.rester_informe && payload.email ? payload.email : "" };
  ls.del(STORE);
  state = freshState();
  render(LAST);
}

/* ---------- navigation ---------- */
function demoCount() { return DEMO_KEYS.filter(k => state.answers[k]).length; }

function updateNav() {
  const id = SCREENS[state.screen].id;
  restartBtn.hidden = !(state.screen > 0 && state.screen < LAST);
  navbar.hidden = id === "accueil" || id === "merci";
  navbar.classList.toggle("wide", id === "demo");
  navStatus.innerHTML = "";
  nextBtn.removeAttribute("aria-disabled");
  nextBtn.removeAttribute("aria-describedby");
  const label = { curseur: t.ui.validate, teaser: t.teaser.cta, suite: t.submit.send }[id] || t.ui.next;
  nextBtn.textContent = label;
  if (id === "demo") {
    const n = demoCount();
    navStatus.innerHTML = `<span id="rxText">${esc(fill(t.demo.reactions, { n }))}</span><span class="rx-dots" aria-hidden="true">${DEMO_KEYS.map(k => `<i class="${state.answers[k] ? "on" : ""}"></i>`).join("")}</span>`;
    if (n < 4) { nextBtn.setAttribute("aria-disabled", "true"); nextBtn.setAttribute("aria-describedby", "rxText"); }
  }
  const pct = Math.round(state.screen / LAST * 100);
  progress.firstElementChild.style.width = pct + "%";
  progress.setAttribute("aria-valuenow", pct);
}

function onNext() {
  const id = SCREENS[state.screen].id;
  if (id === "curseur" && typeof state.answers.plans_signes_sur_10 !== "number") {
    setErr("plans_signes_sur_10", t.ui.errSlider);
    main.querySelector("#rng").focus();
    return;
  }
  if (id === "demo" && demoCount() < 4) {
    navStatus.querySelector("#rxText").textContent = t.demo.locked;
    return;
  }
  if (id === "suite") { submit(); return; }
  if (!validate()) return;
  go(state.screen + 1);
}

function go(n) {
  state.screen = n;
  save();
  render(n);
}

function render(n = state.screen) {
  if (cleanup) { try { cleanup(); } catch { /* écran déjà démonté */ } cleanup = null; }
  const s = SCREENS[n];
  if (n === LAST) state.screen = LAST;
  window.scrollTo(0, 0);
  if (s.form) formScreen(s);
  else cleanup = ({ accueil: welcomeScreen, curseur: sliderScreen, avis: () => mountReviews(renderShell(t.reviews.title), { t, lang, reduced }),
    teaser: teaserScreen, demo: demoScreen, merci: thanksScreen })[s.id]() || null;
  updateNav();
  const h = main.querySelector("h1,h2,.demo-intro");
  if (h && n > 0) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  // On prépare la 3D pendant l'écran 6, pour qu'elle soit prête au teaser.
  if (s.id === "outils") setTimeout(() => loadThree().catch(() => {}), 1500);
}

function renderShell(title) {
  main.innerHTML = `<section class="screen"><div class="head"><h2 tabindex="-1">${esc(title)}</h2></div><div id="host"></div></section>`;
  return main.querySelector("#host");
}

/* ---------- langue ---------- */
function applyLang() {
  t = TEXTS[lang];
  document.documentElement.lang = lang;
  document.title = t.meta.title;
  backBtn.textContent = t.ui.back;
  const rl = restartBtn.querySelector(".rs-label");
  if (rl) rl.textContent = t.ui.restart;
  restartBtn.title = t.ui.restart;
  $("#langs").setAttribute("aria-label", t.ui.lang);
  progress.setAttribute("aria-label", t.ui.progress);
  document.querySelectorAll("#langs button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
}
document.querySelectorAll("#langs button").forEach(b => b.addEventListener("click", () => {
  if (b.dataset.lang === lang) return;
  lang = b.dataset.lang; ls.set(LANG_KEY, lang);
  applyLang();
  render(state.screen === LAST || thanksInfo ? LAST : state.screen);
}));

backBtn.addEventListener("click", () => { if (state.screen > 0) go(state.screen - 1); });
nextBtn.addEventListener("click", onNext);
restartBtn.addEventListener("click", () => {
  if (!confirm(t.ui.restartConfirm)) return;
  ls.del(STORE);
  state = freshState();
  render(0);
});

applyLang();
render();
