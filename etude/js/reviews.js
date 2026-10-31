/* Écran 3 : des paires d'avis (négatif / positif) par thème, que le dentiste touche pour dire
   « celui-ci, je l'ai déjà croisé ». Tout s'affiche d'un coup, sans conclusion.
   Cartes sobres aux couleurs Alvea : aucune imitation d'une plateforme d'avis. */
import { REVIEW_PAIRS } from "./i18n.js";

const STAR = cls => `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="${cls}" d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" stroke-linejoin="round"/></svg>`;
const THUMB = up => `<svg class="th${up ? " up" : ""}" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v11H3V10zM7 10l4-8c1.7 0 2.8 1.3 2.5 3L13 9h6.2c1.3 0 2.2 1.2 1.9 2.4l-1.8 7.4c-.3 1.3-1.4 2.2-2.7 2.2H7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
const CHECK = `<svg class="ck" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function reviewsHTML(f, { a, t, lang, esc }) {
  const r = t.reviews, picked = a.avis_reconnus || [];
  const card = (theme, kind, rv) => {
    const id = `${theme}_${kind}`, on = picked.includes(id);
    const text = lang === "fr" ? rv.fr : (rv.en || rv.fr);
    const quote = lang === "fr" ? `« ${text} »` : `“${text}”`;
    return `<button type="button" class="rv ${kind}" data-rv="${id}" aria-pressed="${on}">
      <span class="rv-top">${THUMB(kind === "pos")}<span class="sr-only">${kind === "pos" ? r.pos : r.neg}, </span>
        <span class="st" role="img" aria-label="${r.stars.replace("{n}", rv.stars)}">${[1, 2, 3, 4, 5].map(n => STAR(n <= rv.stars ? "f" : "e")).join("")}</span>${CHECK}</span>
      <span class="rv-q" lang="${lang === "fr" || !rv.en ? "fr" : "en"}">${esc(quote)}</span></button>`;
  };
  const groups = REVIEW_PAIRS.map(p => `<div class="rv-theme" role="group" aria-labelledby="th_${p.theme}">
      <h3 id="th_${p.theme}">${esc(r.themes[p.theme])}</h3>
      <div class="rv-pair">${card(p.theme, "neg", p.neg)}${p.pos.fr ? card(p.theme, "pos", p.pos) : ""}</div></div>`).join("");
  return `<div class="field" data-field="${f.k}">
    <h3 class="sr-only">${esc(t.q.avis_reconnus)}</h3>
    <div class="rv-grid">${groups}</div>
    <button type="button" class="chip none" id="rvNone" aria-pressed="${!!a.avis_aucun}">${esc(r.none)}</button></div>`;
}

/* Gère un clic dans l'écran ; renvoie true si le clic concernait une carte ou « Aucun ». */
export function onReviewClick(e, a, root) {
  const card = e.target.closest("[data-rv]"), none = e.target.closest("#rvNone");
  if (!card && !none) return false;
  if (none) {
    a.avis_reconnus = [];
    a.avis_aucun = true;
  } else {
    const id = card.dataset.rv, set = new Set(a.avis_reconnus || []);
    set.has(id) ? set.delete(id) : set.add(id);
    a.avis_reconnus = [...set];
    a.avis_aucun = false;
  }
  root.querySelectorAll("[data-rv]").forEach(b => b.setAttribute("aria-pressed", String((a.avis_reconnus || []).includes(b.dataset.rv))));
  root.querySelector("#rvNone").setAttribute("aria-pressed", String(!!a.avis_aucun));
  return true;
}
