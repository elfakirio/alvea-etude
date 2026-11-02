/* Champ « Pays » : liste mondiale (ISO 3166-1 alpha-2), noms donnés par le navigateur (Intl.DisplayNames),
   pré-remplie sans réseau (fuseau horaire, puis région de la langue du navigateur).
   La valeur envoyée est toujours le nom français du pays, pour garder Airtable homogène. */

const CODES = ("AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT " +
  "MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW " +
  "SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG " +
  "UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW").split(" ");
export const TOP = ["BE", "FR", "LU", "CH", "NL"];
export const OTHER = "other";
const OTHER_FR = "Autre";

const TZ = {
  "Europe/Brussels": "BE", "Europe/Paris": "FR", "Europe/Luxembourg": "LU", "Europe/Zurich": "CH", "Europe/Amsterdam": "NL",
  "Europe/Berlin": "DE", "Europe/Madrid": "ES", "Europe/Rome": "IT", "Europe/Lisbon": "PT", "Europe/London": "GB",
  "Europe/Dublin": "IE", "Europe/Vienna": "AT", "Europe/Warsaw": "PL", "Europe/Stockholm": "SE", "Europe/Copenhagen": "DK",
  "Europe/Oslo": "NO", "Europe/Helsinki": "FI", "Europe/Athens": "GR", "Europe/Monaco": "MC", "Europe/Prague": "CZ",
  "Europe/Budapest": "HU", "Europe/Bucharest": "RO", "Europe/Sofia": "BG", "Europe/Istanbul": "TR",
  "Africa/Casablanca": "MA", "Africa/Algiers": "DZ", "Africa/Tunis": "TN", "Africa/Dakar": "SN", "Africa/Abidjan": "CI",
  "America/Montreal": "CA", "America/Toronto": "CA", "America/Vancouver": "CA", "America/New_York": "US",
  "America/Chicago": "US", "America/Denver": "US", "America/Los_Angeles": "US", "Asia/Beirut": "LB", "Asia/Dubai": "AE"
};

const namers = {};
function namer(lang) {
  if (!(lang in namers)) {
    try { namers[lang] = new Intl.DisplayNames([lang], { type: "region", fallback: "code" }); } catch { namers[lang] = null; }
  }
  return namers[lang];
}
export function countryName(code, lang) {
  if (code === OTHER) return lang === "fr" ? OTHER_FR : "Other";
  const n = namer(lang);
  return (n && n.of(code)) || code;
}
/* Valeur envoyée au webhook : le nom en français. */
export const frenchName = code => (code === OTHER ? OTHER_FR : countryName(code, "fr"));

/* Retrouve le code d'une ancienne réponse enregistrée en texte (« Belgique »…). */
export function codeFromFrench(name) {
  if (!name) return "";
  if (name === OTHER_FR) return OTHER;
  return CODES.find(c => countryName(c, "fr") === name) || "";
}

export function guessCountry() {
  try {
    const c = TZ[Intl.DateTimeFormat().resolvedOptions().timeZone];
    if (c) return c;
  } catch { /* fuseau inconnu */ }
  const m = /[-_]([a-z]{2})\b/i.exec(navigator.language || "");
  const c = m && m[1].toUpperCase();
  return c && CODES.includes(c) ? c : "";
}

const fold = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’']/g, " ");

/* Liste ordonnée pour une langue : les 5 pays proches d'abord, puis le reste par ordre alphabétique. */
const lists = {};
function listFor(lang) {
  if (!lists[lang]) {
    const all = CODES.filter(c => countryName(c, lang) !== c).map(c => ({ c, n: countryName(c, lang) }));
    const rest = all.filter(x => !TOP.includes(x.c)).sort((a, b) => a.n.localeCompare(b.n, lang));
    lists[lang] = [...TOP.map(c => ({ c, n: countryName(c, lang) })), ...rest].map(x => ({ ...x, f: fold(x.n), top: TOP.includes(x.c) }));
  }
  return lists[lang];
}

const CHEVRON = `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* HTML du champ ; la logique est branchée ensuite par mountCountry. */
export function countryFieldHTML({ k, label, code, lang, esc, ui, optTag, errP }) {
  return `<div class="field" data-field="${k}"><label class="q" for="i_${k}" id="l_${k}">${label} ${optTag}</label>
    <div class="combo">
      <input class="text" type="text" id="i_${k}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="lb_${k}"
        aria-describedby="e_${k}" autocomplete="off" spellcheck="false" placeholder="${esc(ui.countryPh)}" value="${esc(code ? countryName(code, lang) : "")}">
      <button type="button" class="combo-btn" tabindex="-1" aria-label="${esc(ui.countryList)}">${CHEVRON}</button>
      <ul class="combo-list" id="lb_${k}" role="listbox" aria-labelledby="l_${k}" hidden></ul>
    </div>${errP}</div>`;
}

/* onPick(code) : code ISO, OTHER, ou "" quand le champ est vidé. */
export function mountCountry(root, { k, lang, esc, ui, getCode, onPick }) {
  const input = root.querySelector("#i_" + k), list = root.querySelector("#lb_" + k), btn = root.querySelector(".combo-btn");
  if (!input) return;
  const all = listFor(lang);
  let shown = [], active = -1;

  function paint(filter) {
    const q = fold(filter || "").trim();
    // D'abord les noms qui commencent par la saisie, puis ceux dont un mot commence par elle, puis le reste
    let items = all;
    if (q) {
      const starts = all.filter(x => x.f.startsWith(q));
      const words = all.filter(x => !starts.includes(x) && /[\s-]/.test(x.f) && x.f.split(/[\s-]+/).some(w => w.startsWith(q)));
      items = [...starts, ...words];
      if (items.length < 6) items = [...items, ...all.filter(x => !items.includes(x) && x.f.includes(q))];
    }
    shown = [...items, { c: OTHER, n: countryName(OTHER, lang), top: false }];
    const cur = getCode();
    list.innerHTML = shown.map((x, i) => {
      const sep = !q && i === TOP.length ? " sep" : "", last = x.c === OTHER ? " other" : "";
      return `<li role="option" id="o_${k}_${x.c}" data-c="${x.c}" class="${(sep + last).trim()}" aria-selected="${x.c === cur}">${esc(x.n)}</li>`;
    }).join("") + (q && !items.length ? `<li class="none" aria-hidden="true">${esc(ui.countryNone)}</li>` : "");
    setActive(q ? 0 : Math.max(0, shown.findIndex(x => x.c === cur)), !q);
  }
  function setActive(i, center) {
    const opts = list.querySelectorAll('[role="option"]');
    opts.forEach(o => o.classList.remove("active"));
    active = Math.max(-1, Math.min(i, opts.length - 1));
    const o = opts[active];
    if (o) {
      o.classList.add("active");
      input.setAttribute("aria-activedescendant", o.id);
      const top = o.offsetTop, h = list.clientHeight;
      if (center) list.scrollTop = top - h / 2 + o.offsetHeight / 2;
      else if (top < list.scrollTop) list.scrollTop = top;
      else if (top + o.offsetHeight > list.scrollTop + h) list.scrollTop = top + o.offsetHeight - h;
    } else input.removeAttribute("aria-activedescendant");
  }
  const isOpen = () => !list.hidden;
  function open(filter) { list.hidden = false; input.setAttribute("aria-expanded", "true"); paint(filter); }
  function close() { list.hidden = true; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); }
  function pick(code) {
    input.value = code ? countryName(code, lang) : "";
    close();
    onPick(code);
  }
  /* En quittant le champ : un nom tapé en entier est accepté, sinon on revient à la valeur choisie. */
  function settle() {
    const v = fold(input.value).trim();
    if (!v) { if (getCode()) onPick(""); return; }
    const exact = all.find(x => x.f === v) || (fold(countryName(OTHER, lang)) === v ? { c: OTHER } : null);
    if (exact) { if (exact.c !== getCode()) onPick(exact.c); input.value = countryName(exact.c, lang); }
    else input.value = getCode() ? countryName(getCode(), lang) : "";
  }

  input.addEventListener("input", () => open(input.value));
  input.addEventListener("click", () => { if (!isOpen()) open(""); });
  input.addEventListener("keydown", e => {
    const n = list.querySelectorAll('[role="option"]').length;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen()) { open(""); return; }
      setActive(e.key === "ArrowDown" ? Math.min(active + 1, n - 1) : Math.max(active - 1, 0));
    } else if (e.key === "Enter") {
      if (isOpen() && active >= 0) { e.preventDefault(); pick(shown[active].c); }
    } else if (e.key === "Escape") {
      if (isOpen()) { e.preventDefault(); close(); input.value = getCode() ? countryName(getCode(), lang) : ""; }
    } else if (e.key === "Home" || e.key === "End") {
      if (isOpen() && !input.value) { e.preventDefault(); setActive(e.key === "Home" ? 0 : n - 1); }
    } else if (e.key === "Tab") {
      if (isOpen() && input.value && active >= 0) pick(shown[active].c); else close();
    }
  });
  input.addEventListener("blur", () => setTimeout(() => {
    if (document.activeElement === input) return;
    close(); settle();
  }, 120));
  // mousedown : le champ garde le focus pendant le choix
  list.addEventListener("mousedown", e => e.preventDefault());
  list.addEventListener("click", e => { const o = e.target.closest('[role="option"]'); if (o) { pick(o.dataset.c); input.focus(); } });
  btn.addEventListener("mousedown", e => e.preventDefault());
  btn.addEventListener("click", () => { if (isOpen()) close(); else { input.focus(); open(""); } });
}
