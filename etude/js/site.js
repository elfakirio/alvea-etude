/* Partagé par la landing et le questionnaire : choix de la langue et source de visite (UTM).
   Rien ne sort du navigateur : pas de cookie, pas de service externe. */

export const LANG_KEY = "alvea-lang";   // même clé partout : la langue choisie suit le visiteur
const UTM_KEY = "alvea-utm";

export const ls = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sans stockage, la page marche quand même */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* idem */ } }
};

/* ?lang= prime sur tout, puis le choix mémorisé (bouton FR/EN), puis la première langue du navigateur. */
export function pickLang(available = ["fr", "en"]) {
  const q = new URLSearchParams(location.search).get("lang");
  if (available.includes(q)) return q;
  const saved = ls.get(LANG_KEY);
  if (available.includes(saved)) return saved;
  const first = (navigator.languages && navigator.languages[0]) || navigator.language || "";
  return first.toLowerCase().startsWith("fr") ? "fr" : "en";
}

/* Titre, description et balises og:, dans la langue de la page. */
export function setMeta({ title, description, ogTitle, ogDescription }) {
  if (title) document.title = title;
  const put = (sel, v) => { const m = document.querySelector(sel); if (m && v) m.setAttribute("content", v); };
  put('meta[name="description"]', description);
  put('meta[property="og:title"]', ogTitle);
  put('meta[property="og:description"]', ogDescription);
}

/* UTM : lues dans l'URL au premier chargement, gardées pour toute la visite (sessionStorage). */
export function captureUtm() {
  const q = new URLSearchParams(location.search);
  const u = { source: q.get("utm_source"), medium: q.get("utm_medium"), campaign: q.get("utm_campaign") };
  if (!u.source && !u.medium && !u.campaign) return;
  try { sessionStorage.setItem(UTM_KEY, JSON.stringify(u)); } catch { /* sans stockage, on perd seulement la source */ }
}

/* « source / medium / campaign », « - » pour une valeur absente ; vide s'il n'y a aucune UTM. */
export function utmString() {
  let u = null;
  try { u = JSON.parse(sessionStorage.getItem(UTM_KEY)); } catch { /* idem */ }
  if (!u || (!u.source && !u.medium && !u.campaign)) return "";
  const clean = v => String(v || "").trim().slice(0, 100) || "-";
  return [u.source, u.medium, u.campaign].map(clean).join(" / ");
}
