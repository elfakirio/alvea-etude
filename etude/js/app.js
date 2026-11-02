/* Navigation, état, validation et envoi. Un écran à la fois, rendu dans <main id="screen">. */
import { CONFIG } from "./config.js";
import { OPTIONS, TEXTS } from "./i18n.js";
import { reviewsHTML, onReviewClick } from "./reviews.js";
import { mountDemo, LAST_CHAPTER } from "./demo.js";
import { loadThree } from "./demo3d.js";
import { ls, LANG_KEY, pickLang, setMeta, captureUtm, utmString } from "./site.js";
import { countryFieldHTML, mountCountry, frenchName, codeFromFrench, guessCountry, OTHER } from "./country.js";

const STORE = "alvea-etude-v2", CODE_KEY = "alvea-code", REF_KEY = "alvea-ref", OUTBOX = "alvea-outbox";
const MIN_SECONDS = 60;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const CALL_YES = "Oui, avec plaisir", CALL_MAIL = "Plutôt par e-mail", NOT_NOW = "Pas pour l'instant";

/* ls (stockage protégé : navigation privée, stockage bloqué…) vient de site.js */
captureUtm();
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

let lang = pickLang(Object.keys(TEXTS));
let t = TEXTS[lang];
const opt = v => (lang === "fr" ? v : (t.opt[v] || v));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);

/* ---------- définition des écrans ---------- */
// « Oui, avec plaisir » ou « Plutôt par e-mail » : prénom, nom et e-mail obligatoires. « Non merci » : tout est facultatif.
const wantsContact = a => a.appel === CALL_YES || a.appel === CALL_MAIL;
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
    F("pays", "country", { req: true })
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
    F("coords", "note", { hk: a => (a.appel === CALL_YES ? "coords_hint_call" : a.appel === CALL_MAIL ? "coords_hint_mail" : "coords_hint") }),
    F("prenom", "text", { auto: "given-name", half: true, star: true, req: wantsContact, err: "errFirstNeeded" }),
    F("nom_famille", "text", { auto: "family-name", half: true, star: true, req: wantsContact, err: "errLastNeeded" }),
    F("email", "email", { star: true, req: wantsContact }),
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
const optTag = f => `<span class="opt-tag" data-opt="${f.k}"${isReq(f) ? " hidden" : ""}>(${t.ui.optional})</span>`
  + (f.star ? `<span class="req-star" data-star="${f.k}" aria-hidden="true"${isReq(f) ? "" : " hidden"}>*</span>` : "");
const errP = f => `<p class="err" id="e_${f.k}" aria-live="polite"></p>`;

function fieldHTML(f) {
  const a = state.answers, k = f.k, q = `<span data-q="${k}">${esc(qText(f))}</span>`;
  const hid = isShown(f) ? "" : " hidden";
  switch (f.type) {
    case "reviews":
      return reviewsHTML(f, { a, t, lang, esc });
    case "note":
      return `<div class="field note" data-field="${k}"><p class="q">${esc(t.q[k])}</p><p class="hint" data-hint="${k}">${esc(t.q[f.hk ? f.hk(a) : k + "_hint"])}</p></div>`;
    case "country":
      return countryFieldHTML({ k, label: q, code: a.pays_iso || "", lang, esc, ui: t.ui, optTag: optTag(f), errP: errP(f) });
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
      const type = f.type === "email" ? "email" : "text";
      const ac = f.auto || (type === "email" ? "email" : "off");
      const hint = f.hint ? `<p class="hint" id="h_${k}">${esc(t.q[f.hint])}</p>` : "";
      return `<div class="field" data-field="${k}"${hid}><label class="q" for="i_${k}">${q} ${optTag(f)}</label>${hint}
        <input class="text" type="${type}" id="i_${k}" data-k="${k}" autocomplete="${ac}" maxlength="200"${type === "email" ? ' inputmode="email" spellcheck="false" autocapitalize="off"' : ""}${isReq(f) ? ' aria-required="true"' : ""} value="${esc(a[k] || "")}" aria-describedby="e_${k}${f.hint ? " h_" + k : ""}">${errP(f)}</div>`;
    }
  }
}

/* Les champs « half » consécutifs (prénom, nom) partagent une ligne. */
function fieldsHTML(form) {
  let out = "";
  for (let i = 0; i < form.length; i++) {
    if (form[i].half && form[i + 1] && form[i + 1].half) { out += `<div class="pair">${fieldHTML(form[i])}${fieldHTML(form[i + 1])}</div>`; i++; }
    else out += fieldHTML(form[i]);
  }
  return out;
}

/* Pays : pré-rempli une seule fois (fuseau horaire, puis langue du navigateur). Une ancienne réponse en texte retrouve son code. */
function prefillCountry() {
  const a = state.answers;
  if (a.pays && !a.pays_iso) a.pays_iso = codeFromFrench(a.pays);
  if (a.pays === undefined) {
    const c = guessCountry();
    a.pays_iso = c; a.pays = c ? frenchName(c) : "";
    save();
  }
}

function formScreen(s) {
  const st = t.screens[s.id];
  main.innerHTML = `<section class="screen">
    <div class="head">${st.kicker ? `<p class="kicker">${esc(st.kicker)}</p>` : ""}<h2 tabindex="-1">${esc(st.title)}</h2>${st.sub ? `<p class="lead">${esc(st.sub)}</p>` : ""}</div>
    <form class="fields" novalidate onsubmit="return false">${fieldsHTML(s.form)}
    ${s.id === "suite" ? `<div class="hp" aria-hidden="true"><label for="website">Website</label><input id="website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
      <p class="notice bad" id="submitMsg" role="alert" hidden></p>` : ""}
    </form></section>`;
  if (s.form.some(f => f.type === "country")) {
    mountCountry(main, { k: "pays", lang, esc, ui: t.ui, getCode: () => state.answers.pays_iso || "",
      onPick(c) {
        state.answers.pays_iso = c;
        state.answers.pays = c ? frenchName(c) : "";
        save();
        if (c) setErr("pays", "");
      } });
  }
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
    const star = el.querySelector(`[data-star="${f.k}"]`);
    if (star) star.hidden = !isReq(f);
    const input = el.querySelector(`#i_${f.k}`);
    if (input && f.star) isReq(f) ? input.setAttribute("aria-required", "true") : input.removeAttribute("aria-required");
    const hint = el.querySelector(`[data-hint="${f.k}"]`);
    if (hint && f.hk) hint.textContent = t.q[f.hk(state.answers)];
    // Un champ redevenu facultatif perd son erreur « obligatoire »
    if (el.classList.contains("invalid") && !errorFor(f)) setErr(f.k, "");
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
  if (f.type === "email" && v && !EMAIL_RE.test(String(v).replace(/\s/g, ""))) return t.ui.errEmail;
  if (!isReq(f)) return "";
  const empty = v === undefined || v === null || (typeof v === "string" && !v.trim()) || v === false || (Array.isArray(v) && !v.length);
  if (!empty) return "";
  if (f.err) return t.ui[f.err];
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
    const focusable = el.querySelector("input:not([type=hidden]):not([tabindex='-1']),textarea,button:not([tabindex='-1'])");
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
  // Pendant la frappe, l'erreur disparaît dès que la valeur devient correcte
  else if (main.querySelector(`[data-field="${k}"]`)?.classList.contains("invalid") && fieldOf(k) && !errorFor(fieldOf(k))) setErr(k, "");
  refreshConditionals();
}
main.addEventListener("change", onFieldChange);
main.addEventListener("input", e => { if (e.target.matches(".text,.area")) onFieldChange(e); });
main.addEventListener("focusout", e => {
  // Signale un e-mail mal formé dès qu'on quitte le champ
  if (e.target.matches('input[type="email"]')) {
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
const IN_PATH = `<path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/>`;
const ICONS = {
  mail: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 7l8 6 8-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  in: `<svg viewBox="0 0 24 24" aria-hidden="true">${IN_PATH}</svg>`,
  cal: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 10h17M8 3v4M16 3v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};
const calPublicURL = () => "https://cal.com/" + CONFIG.CAL_LINK;

/* Carte profil : photo (vers LinkedIn), nom, rôle, texte, puis trois pastilles de contact. */
function profileCard() {
  const W = t.welcome, name = CONFIG.CONTACT_FULL_NAME;
  const photo = `<a class="pf-photo" href="${esc(CONFIG.LINKEDIN_URL)}" target="_blank" rel="noopener" aria-label="${esc(W.photoLink.replace("{name}", name))}">
      <img src="${esc(CONFIG.PHOTO_URL)}" alt="" width="64" height="64" decoding="async"><span class="pf-badge">${ICONS.in}</span></a>`;
  const pill = (href, icon, label, ext) => `<li><a class="pill" href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${icon}<span>${esc(label)}</span></a></li>`;
  return `<div class="profile">
    <div class="pf-top">${photo}<div class="pf-id"><b>${esc(name)}</b><span>${esc(W.role)}</span></div></div>
    <p class="pf-text">${esc(W.intro)}</p>
    <p class="pf-talk">${esc(W.talk)}</p>
    <ul class="pf-links">
      ${pill("mailto:" + CONFIG.CONTACT_EMAIL, ICONS.mail, CONFIG.CONTACT_EMAIL)}
      ${pill(CONFIG.LINKEDIN_URL, ICONS.in, "LinkedIn", true)}
      ${pill(calPublicURL(), ICONS.cal, W.call, true)}
    </ul></div>`;
}

function welcomeScreen() {
  main.innerHTML = `<section class="screen welcome">
    ${MARK}
    <h1 tabindex="-1">${esc(t.welcome.title)}</h1>
    <p class="lead">${esc(t.welcome.sub)}</p>
    ${profileCard()}
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
    onScore(v) { state.answers.demo_score = v; save(); },
    scrollTop
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

/* ---------- Cal.com : calendrier intégré, chargé seulement quand il doit s'afficher ---------- */
const CAL_NS = "20min", CAL_SCRIPT = "https://app.cal.com/embed/embed.js";

function siteTheme() {
  const forced = document.documentElement.dataset.theme;
  if (forced === "light" || forced === "dark") return forced;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/* Le chargeur officiel de Cal.com (file d'attente window.Cal), tel que fourni dans leur code d'intégration,
   à un détail près : onError est branché sur la balise <script> qu'il crée (bloqueur, réseau). */
function calStub() {
  (function (C, A, L) { const p = function (a, ar) { a.q.push(ar); }; const d = C.document; C.Cal = C.Cal || function () { const cal = C.Cal; const ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; const tag = d.createElement("script"); tag.onerror = () => { cal.failed = true; C.dispatchEvent(new Event("alvea-cal-error")); }; d.head.appendChild(tag).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, CAL_SCRIPT, "init");
}

function mountCal(box, info) {
  const fallback = () => {
    if (!box.isConnected || box.dataset.failed) return;
    box.dataset.failed = "1";
    const u = new URL(calPublicURL());
    if (info.nom) u.searchParams.set("name", info.nom);
    if (info.email) u.searchParams.set("email", info.email);
    box.innerHTML = `<p class="small">${esc(t.thanks.calFallback)}</p>
      <a class="btn big" href="${esc(u.href)}" target="_blank" rel="noopener">${ICONS.cal}<span>${esc(t.thanks.calButton)}</span></a>`;
  };
  calStub();
  if (window.Cal.failed) { fallback(); return null; }
  window.addEventListener("alvea-cal-error", fallback, { once: true });
  let ready = false;
  const timer = setTimeout(() => { if (!ready) fallback(); }, 20000);
  const Cal = window.Cal;
  if (!Cal.ns || !Cal.ns[CAL_NS]) Cal("init", CAL_NS, { origin: "https://app.cal.com" });
  const api = Cal.ns[CAL_NS];
  const theme = siteTheme();
  const config = { layout: "month_view", theme, lang, name: info.nom || "", email: info.email || "" };
  if (info.code) config["metadata[code_partage]"] = info.code;
  if (info.utm) config["metadata[utm]"] = info.utm;
  api("inline", { elementOrSelector: box.querySelector(".cal-inline"), calLink: CONFIG.CAL_LINK, config });
  api("ui", { theme, layout: "month_view", hideEventTypeDetails: false,
    cssVarsPerTheme: { light: { "cal-brand": "#0F766E" }, dark: { "cal-brand": "#5EEAD4" } } });
  api("on", { action: "linkReady", callback() {
    ready = true; clearTimeout(timer);
    const l = box.querySelector(".cal-loading"); if (l) l.remove();
  } });
  api("on", { action: "linkFailed", callback() { clearTimeout(timer); fallback(); } });
  let done = false;
  const onBooked = e => {
    const d = (e && e.detail && e.detail.data) || {};
    if (done) return;
    done = true;
    const when = new Date(d.startTime || d.date || Date.now());
    const loc = lang === "fr" ? "fr-BE" : "en-GB";
    const msg = fill(t.thanks.booked, {
      date: when.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long" }),
      time: when.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" }),
      email: info.email || ""
    });
    const p = main.querySelector("#booked");
    if (p) { p.hidden = false; p.innerHTML = `${ICONS.check}<span>${esc(msg)}</span>`; }
  };
  api("on", { action: "bookingSuccessfulV2", callback: onBooked });
  api("on", { action: "bookingSuccessful", callback: onBooked });   // ancien nom de l'événement
  return () => { clearTimeout(timer); window.removeEventListener("alvea-cal-error", fallback); };
}

function thanksScreen() {
  const link = CONFIG.SITE_URL + "?ref=" + code;
  const msg = fill(t.thanks.message, { link });
  const info = thanksInfo || {};
  const T = t.thanks;
  let next = "";
  if (info.appel === CALL_YES) {
    next = `<p class="lead">${esc(T.calStep)}</p>
      <div class="cal-wrap" id="calBox"><p class="cal-loading small">${esc(T.calLoading)}</p><div class="cal-inline"></div></div>
      <p class="notice booked" id="booked" role="status" hidden></p>`;
  } else if (info.appel === CALL_MAIL && info.email) {
    next = `<p class="lead">${esc(fill(T.byEmail, { email: info.email }))}</p>`;
  } else {
    next = `<p class="lead">${esc(T.noCall)}</p>`;
  }
  main.innerHTML = `<section class="screen thanks">
    <div class="head"><span class="done-icon">${ICONS.check}</span>
      <h1 tabindex="-1">${esc(info.prenom ? fill(T.titleName, { name: info.prenom }) : T.title)}</h1></div>
    ${next}
    <div class="share">
      <h2>${esc(T.shareTitle)}</h2>
      <div class="linkbox"><label class="small" for="shareLink">${esc(T.shareText)}</label>
        <input class="text" id="shareLink" readonly value="${esc(link)}"></div>
      <div class="btns">
        <button class="btn" type="button" id="copyBtn">${esc(T.copy)}</button>
        <a class="btn ghost" id="waBtn" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${esc(T.whatsapp)}</a>
        <a class="btn ghost" id="mailBtn" href="mailto:?subject=${encodeURIComponent(T.mailSubject)}&body=${encodeURIComponent(msg)}">${esc(T.email)}</a>
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
      live.textContent = T.copied;
    } catch {
      input.focus(); input.select(); input.setSelectionRange(0, link.length);
      live.textContent = T.copyFallback;
    }
  };
  const calBox = main.querySelector("#calBox");
  return calBox ? mountCal(calBox, info) : null;
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
  "email", "consentement"];
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
    utm: utmString(),
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
  // nom = « Prénom Nom » ; e-mail en minuscules, sans espaces
  const clean = v => String(v || "").replace(/\s+/g, " ").trim();
  p.nom = clean(`${clean(a.prenom)} ${clean(a.nom_famille)}`) || clean(a.nom);
  if (p.email) p.email = p.email.replace(/\s+/g, "").toLowerCase();
  // On n'envoie pas les champs vides
  Object.keys(p).forEach(k => { const v = p[k]; if (v === "" || v === null || v === undefined || (Array.isArray(v) && !v.length)) delete p[k]; });
  return p;
}

function submitMsg(text) {
  const m = main.querySelector("#submitMsg");
  if (!m) return;
  m.hidden = !text; m.textContent = text || "";
}

/* Envoi au webhook Make : 3 essais en tout. Renvoie true si Make a bien reçu. */
async function post(payload) {
  for (let i = 0; i < 3; i++) {
    if (i) await new Promise(r => setTimeout(r, 1200 * i));
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      const r = await fetch(CONFIG.WEBHOOK_URL, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: ctrl.signal
      });
      if (r.ok) return true;
      console.warn("[Alvea] Envoi refusé", r.status);
    } catch (err) {
      console.warn("[Alvea] Envoi échoué", err);
    } finally { clearTimeout(timer); }
  }
  return false;
}

/* Réponses gardées après un échec réseau : renvoyées au chargement suivant. */
async function flushOutbox() {
  const box = ls.get(OUTBOX);
  if (!box || typeof box !== "object" || !box.code_partage) return;
  if (await post(box)) ls.del(OUTBOX);
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
  try {
    if (await post(payload)) { ls.del(OUTBOX); finish(payload); return; }
    ls.set(OUTBOX, payload);
    submitMsg(t.submit.kept);
    nextBtn.textContent = t.submit.retry;
  } finally {
    sending = false; nextBtn.removeAttribute("aria-busy");
  }
}

function finish(payload) {
  const a = state.answers;
  thanksInfo = { appel: payload.appel, prenom: String(a.prenom || "").trim(), nom: payload.nom, email: payload.email,
    code: payload.code_partage, utm: payload.utm };
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

/* Après chaque changement d'écran : tout en haut, titre visible (certains navigateurs font
   défiler vers l'élément qui reçoit le focus malgré preventScroll, d'où le second passage). */
function scrollTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
}

function render(n = state.screen) {
  if (cleanup) { try { cleanup(); } catch { /* écran déjà démonté */ } cleanup = null; }
  const s = SCREENS[n];
  if (n === LAST) state.screen = LAST;
  if (s.id === "profil") prefillCountry();
  if (s.form) formScreen(s);
  else cleanup = ({ accueil: welcomeScreen, curseur: sliderScreen, demo: demoScreen, merci: thanksScreen })[s.id]() || null;
  updateNav();
  const h = main.querySelector("h1,h2");
  if (h && n > 0) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  scrollTop();
  // On prépare la 3D pendant l'écran 7, pour qu'elle soit prête au chapitre 3 de la démo.
  if (s.id === "outils") setTimeout(() => loadThree().catch(() => {}), 1500);
}

/* ---------- langue ---------- */
function applyLang() {
  t = TEXTS[lang];
  document.documentElement.lang = lang;
  setMeta(t.meta);
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
flushOutbox();
