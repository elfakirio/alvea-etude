/* Navigation, état, validation et envoi. Un écran à la fois, rendu dans <main id="screen">. */
import { CONFIG } from "./config.js";
import { OPTIONS, TEXTS } from "./i18n.js";
import { reviewsHTML, onReviewClick } from "./reviews.js";
import { mountDemo, LAST_CHAPTER } from "./demo.js";
import { loadThree } from "./demo3d.js";

const STORE = "alvea-etude-v2", CODE_KEY = "alvea-code", REF_KEY = "alvea-ref", LANG_KEY = "alvea-lang";
const MIN_SECONDS = 60;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const CALL_YES = "Oui, avec plaisir", CALL_MAIL = "Plutôt par e-mail", NOT_NOW = "Pas pour l'instant";

/* ---------- stockage (protégé : navigation privée, stockage bloqué…) ---------- */
const ls = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sans stockage, le parcours marche quand même */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* idem */ } }
};
ls.del("alvea-etude-v1");   // brouillon de l'ancienne version, incompatible

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

/* order : ordre mélangé des options, tiré une fois par répondant. demoPos : chapitre et étape de la démo. */
function freshState() { return { screen: 0, answers: {}, startedAt: null, order: {}, demoPos: { ch: 0, step: 0 } }; }
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
const has = (k, v) => a => (a[k] || []).includes(v);
const SCREENS = [
  { id: "accueil" },
  { id: "curseur" },
  { id: "avis", form: [
    F("avis_reconnus", "reviews"),
    F("difference_1_5", "single", { req: true, shuffle: true })
  ] },
  { id: "profil", form: [
    F("profil", "single", { req: true }),
    F("type_cabinet", "single", { req: true, compact: true }),
    F("annees_exercice", "single", { compact: true }),
    F("part_implanto", "single", { req: true, compact: true }),
    F("pays", "single", { req: true, compact: true })
  ] },
  { id: "presentation", form: [
    F("supports", "multi", { req: true }),
    F("supports_autre", "text", { show: has("supports", "Autre") }),
    F("qui_presente", "multi"),
    F("temps_explication", "single", { req: true, compact: true }),
    F("patient_repart_avec", "multi"),
    F("logiciel", "text")
  ] },
  { id: "refus", form: [
    F("issue_refus", "single", { req: true }),
    F("raison_principale", "single", { req: true, shuffle: true }),
    F("raison_autre", "text", { show: a => a.raison_principale === "Autre" }),
    F("demande_attentes", "single", { req: true, compact: true }),
    F("dernier_refus", "area", { privacy: true }),
    F("questions_reposees", "area", { privacy: true })
  ] },
  { id: "outils", form: [
    F("outil_essaye", "single", { req: true }),
    F("outil_detail", "area", { show: a => !!a.outil_essaye && a.outil_essaye !== "Non",
      qk: a => (a.outil_essaye === "Oui, mais abandonné" ? "outil_detail_drop" : "outil_detail_use") }),
    F("budget_actuel", "single", { compact: true })
  ] },
  { id: "demo" },
  { id: "idee", form: [
    F("elements_utiles", "multi", { max: 2 }),
    F("elements_autre", "text", { show: has("elements_utiles", "Autre") }),
    F("dicter_realiste", "single"),
    F("prix_abonnement", "single", { req: true, compact: true }),
    F("manque", "area")
  ] },
  { id: "suite", form: [
    F("appel", "single", { req: true, cta: true }),
    F("implication", "multi", { exclusive: NOT_NOW }),
    F("actif_au_dela", "multi", { exclusive: "Non" }),
    F("reseau_compte", "text", { show: has("actif_au_dela", "Actif sur les réseaux sociaux") }),
    F("coords", "note"),
    F("nom", "text", { auto: "name" }),
    F("email", "email", { req: a => a.appel === CALL_YES || a.appel === CALL_MAIL || (a.implication || []).some(v => v !== NOT_NOW) }),
    F("telephone", "tel", { show: a => a.appel === CALL_YES, req: true, hint: "telephone_hint" }),
    F("consentement", "consent", { req: true })
  ] },
  { id: "merci" }
];
const LAST = SCREENS.length - 1;
const DEMO = SCREENS.findIndex(s => s.id === "demo");
if (!(state.screen >= 0 && state.screen < LAST)) state.screen = 0;

const isShown = f => !f.show || f.show(state.answers);
const isReq = f => isShown(f) && (typeof f.req === "function" ? f.req(state.answers) : !!f.req);
const ALL_FIELDS = SCREENS.flatMap(s => s.form || []);
const fieldOf = k => ALL_FIELDS.find(f => f.k === k);
const qText = f => t.q[f.qk ? f.qk(state.answers) : f.k];

/* Ordre des options : mélangé une fois par répondant (« Autre » reste en dernier), puis gardé. */
function optionsFor(f) {
  const base = OPTIONS[f.k];
  if (!f.shuffle) return base;
  const saved = state.order[f.k];
  if (Array.isArray(saved) && saved.length === base.length && base.every(v => saved.includes(v))) return saved;
  const rest = base.filter(v => v !== "Autre"), tail = base.filter(v => v === "Autre");
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  state.order[f.k] = [...rest, ...tail];
  save();
  return state.order[f.k];
}

/* ---------- éléments fixes ---------- */
const $ = s => document.querySelector(s);
const main = $("#screen"), navbar = $("#navbar"), backBtn = $("#back"), nextBtn = $("#next"),
  navStatus = $("#navStatus"), restartBtn = $("#restart"), progress = $("#progress");
let cleanup = null;
let demo = null;            // contrôleur de la démo quand elle est à l'écran
let thanksInfo = null;      // gardé en mémoire seulement, après un envoi réussi
let sending = false;

/* ---------- rendu des champs ---------- */
const optTag = f => `<span class="opt-tag" data-opt="${f.k}"${isReq(f) ? " hidden" : ""}>(${t.ui.optional})</span>`;
const errP = f => `<p class="err" id="e_${f.k}" aria-live="polite"></p>`;

function fieldHTML(f) {
  const a = state.answers, k = f.k, q = `<span data-q="${k}">${esc(qText(f))}</span>`;
  const hid = isShown(f) ? "" : " hidden";
  switch (f.type) {
    case "reviews":
      return reviewsHTML(f, { a, t, lang, esc });
    case "note":
      return `<div class="field note" data-field="${k}"><p class="q">${esc(t.q[k])}</p><p class="hint">${esc(t.q[k + "_hint"])}</p></div>`;
    case "single":
    case "multi": {
      const multi = f.type === "multi";
      const cls = f.cta ? "opts cta" : f.compact ? "opts row" : "opts two";
      const items = optionsFor(f).map((v, i) => {
        const on = multi ? (a[k] || []).includes(v) : a[k] === v;
        return `<label class="opt${multi ? " multi" : ""}"><input type="${multi ? "checkbox" : "radio"}" name="${k}" value="${esc(v)}" data-k="${k}"${on ? " checked" : ""} id="${k}_${i}"><span class="box" aria-hidden="true"></span><span>${esc(opt(v))}</span></label>`;
      }).join("");
      const hint = multi ? `<p class="hint">${f.max ? t.ui.max2 : t.ui.multi}</p>` : "";
      return `<fieldset class="field" data-field="${k}"${hid} aria-describedby="e_${k}"><legend>${q} ${optTag(f)}</legend>
        ${hint}<div class="${cls}">${items}</div>${f.max ? `<p class="soft" id="m_${k}" aria-live="polite"></p>` : ""}${errP(f)}</fieldset>`;
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
      const hint = f.hint ? `<p class="hint" id="h_${k}">${esc(t.q[f.hint])}</p>` : "";
      return `<div class="field" data-field="${k}"${hid}><label class="q" for="i_${k}">${q} ${optTag(f)}</label>${hint}
        <input class="text" type="${type}" id="i_${k}" data-k="${k}" autocomplete="${ac}" maxlength="200"${type === "email" ? ' inputmode="email" spellcheck="false" autocapitalize="off"' : ""} value="${esc(a[k] || "")}" aria-describedby="e_${k}${f.hint ? " h_" + k : ""}">${errP(f)}</div>`;
    }
  }
}

function formScreen(s) {
  const st = t.screens[s.id];
  main.innerHTML = `<section class="screen">
    <div class="head">${st.kicker ? `<p class="kicker">${esc(st.kicker)}</p>` : ""}<h2 tabindex="-1">${esc(st.title)}</h2>${st.sub ? `<p class="lead">${esc(st.sub)}</p>` : ""}</div>
    <form class="fields" novalidate onsubmit="return false">${s.form.map(fieldHTML).join("")}
    ${s.id === "suite" ? `<div class="hp" aria-hidden="true"><label for="website">Website</label><input id="website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
      <p class="notice bad" id="submitMsg" role="alert" hidden></p>` : ""}
    </form></section>`;
}

/* Met à jour ce qui dépend des réponses (champs conditionnels, mention « facultatif », libellés variables). */
function refreshConditionals() {
  const s = SCREENS[state.screen];
  if (!s.form) return;
  s.form.forEach(f => {
    const el = main.querySelector(`[data-field="${f.k}"]`);
    if (!el) return;
    el.hidden = !isShown(f);
    const tag = el.querySelector(`[data-opt="${f.k}"]`);
    if (tag) tag.hidden = isReq(f);
    const q = el.querySelector(`[data-q="${f.k}"]`);
    if (q && f.qk) q.textContent = qText(f);
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
  if (f.type === "tel" && v && String(v).replace(/\D/g, "").length < 8) return t.ui.errPhone;
  if (!isReq(f)) return "";
  const empty = v === undefined || v === null || v === "" || v === false || (Array.isArray(v) && !v.length);
  if (!empty) return "";
  if (f.type === "consent") return t.ui.errConsent;
  if (f.type === "email") return t.ui.errEmailNeeded;
  if (f.type === "tel") return t.ui.errPhoneNeeded;
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
function onMultiChange(el, k) {
  const f = fieldOf(k), a = state.answers;
  const boxes = [...main.querySelectorAll(`input[name="${k}"]`)];
  let list = OPTIONS[k].filter(v => boxes.find(b => b.value === v)?.checked);
  // Option exclusive (« Pas pour l'instant », « Non ») : elle décoche les autres, et inversement.
  if (f.exclusive && el.checked) list = el.value === f.exclusive ? [f.exclusive] : list.filter(v => v !== f.exclusive);
  const soft = main.querySelector("#m_" + k);
  if (soft) soft.textContent = "";
  if (f.max && list.length > f.max) {
    list = list.filter(v => v !== el.value);
    if (soft) soft.textContent = t.ui.errMax;
  }
  a[k] = list;
  boxes.forEach(b => { b.checked = list.includes(b.value); });
}

function onFieldChange(e) {
  const el = e.target, k = el.dataset && el.dataset.k;
  if (!k) return;
  const a = state.answers;
  if (el.type === "radio") a[k] = el.value;
  else if (el.type === "checkbox" && el.name === k) onMultiChange(el, k);
  else if (el.type === "checkbox") a[k] = el.checked;
  else a[k] = el.value;
  save();
  if (e.type === "change" || el.type === "checkbox" || el.type === "radio") setErr(k, "");
  refreshConditionals();
}
main.addEventListener("change", onFieldChange);
main.addEventListener("input", e => { if (e.target.matches(".text,.area")) onFieldChange(e); });
main.addEventListener("focusout", e => {
  // Signale un e-mail ou un numéro mal formé dès qu'on quitte le champ
  if (e.target.matches('input[type="email"],input[type="tel"]')) {
    const f = fieldOf(e.target.dataset.k);
    if (f && state.answers[f.k]) setErr(f.k, errorFor(f));
  }
});
main.addEventListener("click", e => {
  if (SCREENS[state.screen].id === "avis" && onReviewClick(e, state.answers, main)) save();
});

/* ---------- écrans particuliers ---------- */
const MARK = `<svg class="mark" viewBox="0 0 40 40" aria-hidden="true"><path d="M7 10v9a13 13 0 0 0 26 0v-9" fill="none" stroke="url(#lg)" stroke-width="4.5" stroke-linecap="round"/><circle cx="20" cy="17" r="6" fill="url(#lg)"/></svg>`;
const mailLink = () => `<a href="mailto:${esc(CONFIG.CONTACT_EMAIL)}">${esc(CONFIG.CONTACT_EMAIL)}</a>`;
const IN_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>`;
const linkedIn = () => CONFIG.LINKEDIN_URL
  ? `<a class="in-link" href="${esc(CONFIG.LINKEDIN_URL)}" target="_blank" rel="noopener" aria-label="LinkedIn · ${esc(CONFIG.CONTACT_NAME)}">${IN_ICON}</a>` : "";

function welcomeScreen() {
  const photo = CONFIG.PHOTO_URL
    ? `<img class="avatar" src="${esc(CONFIG.PHOTO_URL)}" alt="" width="56" height="56">`
    : `<span class="avatar" aria-hidden="true">${esc(CONFIG.CONTACT_NAME.charAt(0))}</span>`;
  main.innerHTML = `<section class="screen welcome">
    ${MARK}
    <h1 tabindex="-1">${esc(t.welcome.title)}</h1>
    <p class="lead">${esc(t.welcome.sub)}</p>
    <div class="intro">${photo}<p>${esc(t.welcome.intro).replace("{email}", mailLink())}</p>${linkedIn()}</div>
    <button class="btn big start" type="button" id="startBtn">${t.ui.start}</button>
    <p class="small">${esc(t.welcome.small)}</p>
  </section>`;
  main.querySelector("#startBtn").onclick = () => {
    if (!state.startedAt) state.startedAt = Date.now();
    go(1);
  };
}

function sliderScreen() {
  const K = "plans_acceptes_sur_10", v = state.answers[K];
  const doc = `<svg viewBox="0 0 20 26" aria-hidden="true"><path class="pg" d="M2 1.5h11l5 5v18H2z" stroke-linejoin="round"/><path class="ln" d="M5.5 11h9M5.5 15h9M5.5 19h6"/></svg>`;
  main.innerHTML = `<section class="screen">
    <div class="head"><h2 tabindex="-1" id="sq">${esc(t.slider.q)}</h2><p class="lead" id="sh">${esc(t.slider.hint)}</p></div>
    <div class="slider-box" data-field="${K}">
      <div class="big-num" aria-hidden="true"><span id="bn"></span><small>${t.slider.of}</small></div>
      <div class="docs" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<span data-i="${i}">${doc}</span>`).join("")}</div>
      <input class="range" type="range" min="0" max="10" step="1" id="rng" aria-labelledby="sq" aria-describedby="sh e_${K}" value="${v ?? 5}">
      <div class="range-ends" aria-hidden="true"><span>0</span><span>10</span></div>
      <p class="err" id="e_${K}" aria-live="polite"></p>
    </div></section>`;
  const rng = main.querySelector("#rng"), bn = main.querySelector("#bn"), num = main.querySelector(".big-num");
  const paint = () => {
    const val = state.answers[K];
    const ok = typeof val === "number";
    bn.textContent = ok ? val : t.slider.unset;
    num.classList.toggle("unset", !ok);
    main.querySelectorAll(".docs > span").forEach((s, i) => s.classList.toggle("on", ok && i < val));
    rng.style.setProperty("--pct", (Number(rng.value) * 10) + "%");
    rng.setAttribute("aria-valuetext", ok ? `${val} ${t.slider.of}` : t.slider.label);
  };
  const set = () => { state.answers[K] = Number(rng.value); save(); setErr(K, ""); paint(); };
  rng.addEventListener("input", set);
  rng.addEventListener("pointerup", set);
  rng.addEventListener("keyup", e => { if (/Arrow|Home|End|Page/.test(e.key)) set(); });
  paint();
}

function demoScreen() {
  main.innerHTML = `<section class="screen demo-screen" id="demoHost"></section>`;
  const t0 = Date.now();
  demo = mountDemo(main.querySelector("#demoHost"), {
    t, lang, reduced, opt, esc,
    answers: state.answers,
    pos: state.demoPos || { ch: 0, step: 0 },
    onChange(p) {
      const a = state.answers;
      state.demoPos = p;
      a.demo_chapitre_max = Math.max(a.demo_chapitre_max ?? 0, p.ch);
      save();
      if (demo) updateNav();
    },
    onScore(v) { state.answers.demo_score = v; save(); }
  });
  const answers = state.answers;   // « Recommencer » remplace state : on ne compte que pour ce parcours-ci
  return () => {
    if (state.answers === answers) {
      answers.demo_duree_secondes = (answers.demo_duree_secondes || 0) + Math.round((Date.now() - t0) / 1000);
      save();
    }
    demo.dispose();
    demo = null;
  };
}

/* Cal.com attend un numéro international sans espaces (+32470123456). Un numéro local (0470…)
   reçoit l'indicatif du pays choisi plus haut ; sinon on le laisse tel quel, sans espaces. */
const DIAL = { "Belgique": "32", "France": "33", "Luxembourg": "352", "Suisse": "41", "Pays-Bas": "31" };
function intlPhone(raw, pays) {
  let n = String(raw || "").replace(/[\s.\-()\/]/g, "");
  if (n.startsWith("00")) n = "+" + n.slice(2);
  if (/^0\d/.test(n) && DIAL[pays]) n = "+" + DIAL[pays] + n.slice(1);
  return n;
}

function calURL(info) {
  try {
    const u = new URL(CONFIG.CAL_LINK);
    if (info.nom) u.searchParams.set("name", info.nom);
    if (info.email) u.searchParams.set("email", info.email);
    if (info.telephone) u.searchParams.set(CONFIG.CAL_PHONE_PARAM, intlPhone(info.telephone, info.pays));
    return u;
  } catch { return null; }
}

function thanksScreen() {
  const link = CONFIG.SITE_URL + "?ref=" + code;
  const msg = fill(t.thanks.message, { link });
  const info = thanksInfo || {};
  let booking = "";
  if (info.appel === CALL_YES) {
    const u = calURL(info);
    if (u) {
      const frame = new URL(u); frame.searchParams.set("embed", "true"); frame.searchParams.set("layout", "month_view");
      booking = `<div class="booking"><h2>${esc(t.thanks.calTitle)}</h2>
        <iframe src="${esc(frame.href)}" title="${esc(t.thanks.calFrame)}" loading="lazy"></iframe>
        <a class="small" href="${esc(u.href)}" target="_blank" rel="noopener">${esc(t.thanks.calOpen)} ↗</a></div>`;
    } else booking = `<p class="notice">${esc(t.thanks.calMissing)}</p>`;
  } else if (info.appel === CALL_MAIL && info.email) {
    booking = `<p class="notice">${esc(fill(t.thanks.byEmail, { email: info.email }))}</p>`;
  }
  main.innerHTML = `<section class="screen thanks">
    ${MARK}
    <div class="head"><h1 tabindex="-1">${esc(t.thanks.title)}</h1><p class="lead">${esc(t.thanks.line)}</p></div>
    ${booking}
    <div class="share">
      <h2>${esc(t.thanks.shareTitle)}</h2>
      <div class="linkbox"><label class="small" for="shareLink">${esc(t.thanks.shareText)}</label>
        <input class="text" id="shareLink" readonly value="${esc(link)}"></div>
      <div class="btns">
        <button class="btn" type="button" id="copyBtn">${esc(t.thanks.copy)}</button>
        <a class="btn ghost" id="waBtn" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${esc(t.thanks.whatsapp)}</a>
        <a class="btn ghost" id="mailBtn" href="mailto:?subject=${encodeURIComponent(t.thanks.mailSubject)}&body=${encodeURIComponent(msg)}">${esc(t.thanks.email)}</a>
      </div>
      <p class="live" id="copyLive" aria-live="polite"></p>
      <p class="msg">${esc(msg)}</p>
    </div>
    <p class="foot">${esc(CONFIG.CONTACT_NAME)} · ${mailLink()}</p>
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
const PAYLOAD_KEYS = ["plans_acceptes_sur_10", "avis_reconnus", "avis_aucun", "difference_1_5",
  "profil", "type_cabinet", "annees_exercice", "part_implanto", "pays",
  "supports", "supports_autre", "qui_presente", "temps_explication", "patient_repart_avec", "logiciel",
  "issue_refus", "raison_principale", "raison_autre", "demande_attentes", "dernier_refus", "questions_reposees",
  "outil_essaye", "outil_detail", "budget_actuel",
  "demo_score", "demo_chapitre_max", "demo_duree_secondes",
  "elements_utiles", "elements_autre", "dicter_realiste", "prix_abonnement", "manque",
  "appel", "implication", "actif_au_dela", "reseau_compte",
  "nom", "email", "telephone", "consentement"];
const ARRAYS = new Set(["avis_reconnus", "supports", "qui_presente", "patient_repart_avec", "elements_utiles", "implication", "actif_au_dela"]);
const BOOLS = new Set(["avis_aucun", "consentement"]);
const NUMBERS = new Set(["plans_acceptes_sur_10", "demo_score", "demo_chapitre_max", "demo_duree_secondes"]);

function buildPayload() {
  const a = state.answers;
  const p = {
    langue: lang.toUpperCase(),
    envoye_par: ref,
    code_partage: code,
    duree_secondes: Math.round((Date.now() - (state.startedAt || Date.now())) / 1000),
    website: main.querySelector("#website")?.value || ""   // honeypot : le scénario Make ne garde que les envois où il est vide
  };
  PAYLOAD_KEYS.forEach(k => {
    const f = fieldOf(k);
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
  if (main.querySelector("#website")?.value) { finish(payload); return; }   // honeypot : on ne transmet rien
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
    finish(payload);
  } catch (err) {
    console.warn("[Alvea] Envoi échoué", err);
    submitMsg(t.submit.error);
    nextBtn.textContent = t.submit.retry;
  } finally {
    clearTimeout(timer); sending = false; nextBtn.removeAttribute("aria-busy");
  }
}

function finish(payload) {
  thanksInfo = { appel: payload.appel, nom: payload.nom, email: payload.email, telephone: payload.telephone, pays: payload.pays };
  ls.del(STORE);
  state = freshState();
  render(LAST);
}

/* ---------- navigation ---------- */
function updateNav() {
  const id = SCREENS[state.screen].id;
  restartBtn.hidden = !(state.screen > 0 && state.screen < LAST);
  navbar.hidden = id === "accueil" || id === "merci";
  navStatus.innerHTML = "";
  const label = { curseur: t.ui.validate, demo: demo ? demo.label() : t.ui.next, suite: t.submit.send }[id] || t.ui.next;
  nextBtn.textContent = label;
  const pct = Math.round(state.screen / LAST * 100);
  progress.firstElementChild.style.width = pct + "%";
  progress.setAttribute("aria-valuenow", pct);
}

function onNext() {
  const id = SCREENS[state.screen].id;
  if (id === "curseur" && typeof state.answers.plans_acceptes_sur_10 !== "number") {
    setErr("plans_acceptes_sur_10", t.ui.errSlider);
    main.querySelector("#rng").focus();
    return;
  }
  if (id === "demo" && demo && demo.next()) return;
  if (id === "suite") { submit(); return; }
  if (!validate()) return;
  if (state.screen + 1 === DEMO) state.demoPos = { ch: 0, step: 0 };
  go(state.screen + 1);
}

function onBack() {
  if (state.screen <= 0) return;
  if (demo && demo.back()) return;
  if (state.screen - 1 === DEMO) state.demoPos = { ch: LAST_CHAPTER, step: 0 };
  go(state.screen - 1);
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
  else cleanup = ({ accueil: welcomeScreen, curseur: sliderScreen, demo: demoScreen, merci: thanksScreen })[s.id]() || null;
  updateNav();
  const h = main.querySelector("h1,h2");
  if (h && n > 0) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  // On prépare la 3D pendant l'écran 7, pour qu'elle soit prête au chapitre 3 de la démo.
  if (s.id === "outils") setTimeout(() => loadThree().catch(() => {}), 1500);
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

backBtn.addEventListener("click", onBack);
nextBtn.addEventListener("click", onNext);
restartBtn.addEventListener("click", () => {
  if (!confirm(t.ui.restartConfirm)) return;
  ls.del(STORE);
  state = freshState();
  render(0);
});

applyLang();
render();
