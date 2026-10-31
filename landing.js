/* Landing alveadental.eu : textes FR/EN, liens vers l'étude, animation « assistant ».
   Reprend les réglages, les textes de la démo et la bouche 3D du questionnaire (etude/js). */
import { CONFIG } from "./etude/js/config.js";
import { TEXTS } from "./etude/js/i18n.js";
import { loadThree, createMouth, PRICES, money } from "./etude/js/demo3d.js";

const L = {
  fr: {
    docTitle: "Alvea · Des plans de traitement que vos patients comprennent",
    skip: "Aller au contenu", lang: "Langue",
    navCta: "Participer à l'étude", navCtaShort: "L'étude",
    eyebrow: "Étude en cours auprès des dentistes",
    title: "Des plans de traitement que vos patients comprennent.",
    sub: "Le dentiste dicte son plan, Alvea le transforme en un plan clair, en 3D, que le patient peut revoir chez lui.",
    building: "Alvea se construit en ce moment, avec des dentistes.",
    cta: "Participer à l'étude · 5 min",
    write: "Écrire à Omar",
    demoTag: "Démo · cas fictif",
    demoSummary: "Démonstration animée, sur un cas fictif : le dentiste dicte « 36 fracturée, extraction et greffe. Implant à 8 semaines. Couronne céramique sur la 37, provisoire en attendant. » Alvea en fait un plan en 4 visites, avec la bouche en 3D, puis l'envoie par SMS à la patiente, qui l'ouvre chez elle avec le devis par visite : 605 €, 1 100 €, 350 € et 1 600 €, soit 3 655 €.",
    hello: "Quel plan voulez-vous expliquer ?",
    placeholder: "Dictez votre plan de traitement…",
    think: ["Lecture du plan…", "Organisation des visites…", "Préparation de la vue patient…"],
    send: "Envoyer à la patiente",
    stepsTitle: "Comment ça marcherait",
    s1t: "Vous dictez", s1p: "Avec vos mots, comme à un confrère.",
    s2t: "Vous validez", s2p: "Vous relisez tout, rien ne part sans votre accord.",
    s3t: "Le patient comprend", s3p: "Un lien clair, en 3D, qu'il revoit chez lui.",
    whyTitle: "Pourquoi cette étude",
    whyText: "Avant de construire quoi que ce soit, je veux comprendre comment vous présentez vos plans aujourd'hui, et ce qui fait qu'un patient dit oui. 5 minutes, et une démo à la fin.",
    privacy: "Confidentialité"
  },
  en: {
    docTitle: "Alvea · Treatment plans your patients understand",
    skip: "Skip to content", lang: "Language",
    navCta: "Take part in the study", navCtaShort: "The study",
    eyebrow: "Study under way with dentists",
    title: "Treatment plans your patients understand.",
    sub: "The dentist dictates the plan, Alvea turns it into a clear 3D plan that the patient can review at home.",
    building: "Alvea is being built right now, with dentists.",
    cta: "Take part in the study · 5 min",
    write: "Write to Omar",
    demoTag: "Demo · fictional case",
    demoSummary: "Animated demo of a fictional case: the dentist dictates “36 fractured, extraction and graft. Implant at 8 weeks. Ceramic crown on 37, temporary in the meantime.” Alvea turns it into a 4-visit plan with the mouth in 3D, then texts it to the patient, who opens it at home with the quote per visit: €605, €1,100, €350 and €1,600, a total of €3,655.",
    hello: "Which plan would you like to explain?",
    placeholder: "Dictate your treatment plan…",
    think: ["Reading the plan…", "Organising the visits…", "Preparing the patient view…"],
    send: "Send to the patient",
    stepsTitle: "How it would work",
    s1t: "You dictate", s1p: "In your own words, as you would to a colleague.",
    s2t: "You approve", s2p: "You review everything; nothing goes out without your approval.",
    s3t: "The patient understands", s3p: "A clear 3D link they can review at home.",
    whyTitle: "Why this study",
    whyText: "Before building anything, I want to understand how you present your plans today, and what makes a patient say yes. 5 minutes, with a demo at the end.",
    privacy: "Privacy"
  }
};

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ls = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sans stockage, la page marche quand même */ } }
};
const LANG_KEY = "alvea-lang"; // même clé que le questionnaire : la langue choisie ici le suit
const params = new URLSearchParams(location.search);
let langChosen = params.has("lang");
let lang = params.get("lang") || ls.get(LANG_KEY) || ((navigator.language || "").toLowerCase().startsWith("en") ? "en" : "fr");
if (!L[lang]) lang = "fr";
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- textes et liens ---------- */
const IN_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>`;

function studyHref() {
  const q = new URLSearchParams();
  if (params.get("ref")) q.set("ref", params.get("ref"));
  if (langChosen) q.set("lang", lang);
  const s = q.toString();
  return "etude/" + (s ? "?" + s : "");
}

function applyTexts() {
  const T = L[lang];
  document.documentElement.lang = lang;
  document.title = T.docTitle;
  document.querySelectorAll("[data-t]").forEach(el => { el.textContent = T[el.dataset.t]; });
  $("#langs").setAttribute("aria-label", T.lang);
  document.querySelectorAll("#langs button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  document.querySelectorAll(".study-link").forEach(a => { a.href = studyHref(); });
  $(".priv-link").href = "etude/confidentialite.html" + (lang === "en" ? "?lang=en" : "");
  document.querySelectorAll(".mail-link").forEach(a => { a.href = "mailto:" + CONFIG.CONTACT_EMAIL; });
  $("#fMail").textContent = CONFIG.CONTACT_EMAIL;
  $("#fName").textContent = CONFIG.CONTACT_NAME;
  $("#fIn").innerHTML = CONFIG.LINKEDIN_URL
    ? ` · <a class="in-link" href="${esc(CONFIG.LINKEDIN_URL)}" target="_blank" rel="noopener" aria-label="LinkedIn · ${esc(CONFIG.CONTACT_NAME)}">${IN_ICON}</a>` : "";
}

$("#langs").addEventListener("click", e => {
  const b = e.target.closest("button[data-lang]");
  if (!b || b.dataset.lang === lang) return;
  lang = b.dataset.lang; langChosen = true; ls.set(LANG_KEY, lang);
  applyTexts();
  restartDemo();
});

/* ---------- animation « assistant » ---------- */
const box = $("#assist"), mouthEl = $("#mouth");
let mouth = null, mouthTried = false, inView = false, started = false;
// ?og : fenêtre figée sur l'accueil, pour générer l'image de partage og.png (voir README).
if (params.has("og")) { started = true; document.body.classList.add("og"); }

/* Horloge de l'animation : elle n'avance que si la fenêtre est visible et l'onglet affiché. */
let playing = false, clock = 0, last = 0, gen = 0;
const waiters = [];
function tick(now) {
  requestAnimationFrame(tick);
  const dt = last ? Math.min(now - last, 100) : 0; last = now;
  if (!playing) return;
  clock += dt;
  for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].t <= clock) waiters.splice(i, 1)[0].r();
}
class Stop extends Error {}
function sleep(ms, g) {
  return new Promise((r, j) => waiters.push({ t: clock + ms, r: () => (g === gen ? r() : j(new Stop())) }));
}
function setPlaying() {
  playing = inView && !document.hidden;
  box.classList.toggle("paused", !playing);
}
document.addEventListener("visibilitychange", setPlaying);

function ensureMouth() {
  if (mouthTried) return;
  mouthTried = true;
  const gl = (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl") || c.getContext("experimental-webgl")); } catch { return false; } })();
  if (!gl) { box.classList.add("no3d"); return; }
  loadThree().then(() => {
    try { mouth = createMouth(mouthEl, { orbit: true, reduced, step: reduced ? 4 : 0 }); }
    catch { box.classList.add("no3d"); }
  }).catch(() => box.classList.add("no3d"));
}

const el = id => document.getElementById(id);
const show = (node, on = true) => node.classList.toggle("on", on);

/* Remet la fenêtre à l'état « accueil » et prépare les textes de la langue courante. */
function build() {
  const T = L[lang], D = TEXTS[lang].demo;
  box.className = "assist" + (box.classList.contains("no3d") ? " no3d" : "") + (playing ? "" : " paused");
  el("ph").textContent = T.placeholder;
  el("typed").querySelectorAll(".txt").forEach(n => n.remove());
  el("bUser").textContent = D.c2.quote;
  el("think").innerHTML = T.think.map(s => `<li><i></i>${esc(s)}</li>`).join("");
  el("visits").innerHTML = D.c3.steps.slice(1).map((s, i) =>
    `<li style="--c:var(--v${i + 1})"><b>${esc(s.k)}</b><span>${esc(s.t)}</span></li>`).join("");
  el("sum").textContent = D.c3.stats;
  el("sendBtn").textContent = T.send;
  el("smsFrom").textContent = D.c6.sms;
  el("smsText").textContent = D.c6.bubble;
  el("smsLink").textContent = D.c6.link;
  el("ppTitle").textContent = D.c6.pageTitle;
  const total = PRICES.reduce((a, b) => a + b, 0);
  el("ppBill").innerHTML = D.c5.rows.map((r, i) => `<li><span>${esc(r[0])}</span><b>${esc(money(PRICES[i], lang))}</b></li>`).join("")
    + `<li class="tot"><span>${esc(D.c5.total)}</span><b>${esc(money(total, lang))}</b></li>`;
  ["bUser", "bThink", "answer", "sum", "sendBtn"].forEach(id => { el(id).hidden = true; show(el(id), false); });
  document.querySelectorAll("#visits li, #think li, #ppBill li").forEach(n => n.classList.remove("on", "done"));
  ["lChat", "scrim", "phone", "phPage"].forEach(id => show(el(id), false));
  show(el("lHome")); show(el("composer")); el("composer").classList.remove("docked", "has-text");
  el("send").classList.remove("on"); el("sendBtn").classList.remove("pressed"); el("smsLink").classList.remove("tap");
  el("chatIn").parentElement.scrollTop = 0;
  el("slotCard").appendChild(mouthEl);
  if (mouth) mouth.setStep(0);
}

function reveal(id) { const n = el(id); n.hidden = false; void n.offsetWidth; show(n); scrollChat(); }
function scrollChat() { const c = el("lChat"); c.scrollTo({ top: c.scrollHeight, behavior: reduced ? "auto" : "smooth" }); }

async function cycle(g) {
  const w = ms => sleep(ms, g);
  build();
  // a. accueil
  await w(1600);
  // b. dictée, lettre par lettre
  const quote = TEXTS[lang].demo.c2.quote, typed = el("typed");
  const txt = document.createElement("span"); txt.className = "txt"; typed.appendChild(txt);
  el("composer").classList.add("has-text");
  for (let i = 1; i <= quote.length; i++) { txt.textContent = quote.slice(0, i); await w(quote[i - 1] === " " ? 34 : 26); }
  await w(450);
  el("send").classList.add("on"); await w(350);
  // c. Alvea réfléchit
  txt.remove(); el("composer").classList.remove("has-text"); el("send").classList.remove("on");
  show(el("lHome"), false); el("composer").classList.add("docked"); show(el("lChat"));
  reveal("bUser"); await w(500);
  reveal("bThink");
  const items = el("think").querySelectorAll("li");
  for (const li of items) { li.classList.add("on"); await w(700); li.classList.add("done"); }
  await w(300);
  // d. la réponse
  ensureMouth();
  reveal("answer"); if (mouth) mouth.setStep(0);
  await w(700);
  const visits = el("visits").querySelectorAll("li");
  for (let i = 0; i < visits.length; i++) { visits[i].classList.add("on"); if (mouth) mouth.setStep(i + 1); scrollChat(); await w(950); }
  reveal("sum"); await w(500);
  reveal("sendBtn"); await w(700);
  // e. l'envoi à la patiente
  el("sendBtn").classList.add("pressed"); await w(400);
  show(el("scrim")); show(el("phone")); await w(1500);
  el("smsLink").classList.add("tap"); await w(500);
  el("slotPhone").appendChild(mouthEl); show(el("phPage")); await w(400);
  for (const li of el("ppBill").querySelectorAll("li")) { li.classList.add("on"); await w(320); }
  await w(2600);
  // f. fondu, puis on recommence
  box.classList.add("fade"); await w(650);
}

async function run() {
  const g = ++gen;
  try { for (;;) await cycle(g); } catch (e) { if (!(e instanceof Stop)) throw e; }
}

/* Mouvement réduit : pas d'animation, on montre directement la réponse et la fenêtre patiente. */
function finalState() {
  build();
  show(el("lHome"), false); el("composer").classList.add("docked"); show(el("lChat"));
  ["bUser", "bThink", "answer", "sum", "sendBtn"].forEach(id => { el(id).hidden = false; show(el(id)); });
  document.querySelectorAll("#think li, #visits li, #ppBill li").forEach(n => n.classList.add("on", "done"));
  show(el("scrim")); show(el("phone")); show(el("phPage"));
  el("slotPhone").appendChild(mouthEl);
  if (mouth) mouth.setStep(4);
  el("lChat").scrollTop = el("lChat").scrollHeight;
}

function restartDemo() {
  if (!started) return;
  if (reduced) { finalState(); return; }
  run();
}

new IntersectionObserver(es => {
  inView = es[0].isIntersecting;
  setPlaying();
  if (inView && !started) {
    started = true;
    if (reduced) { ensureMouth(); finalState(); }
    else { run(); setTimeout(ensureMouth, 2500); } // Three.js se charge pendant la dictée
  }
}, { threshold: 0.15 }).observe(box);

applyTexts();
build();
requestAnimationFrame(tick);
