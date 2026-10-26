/* Écran 2 : les cartes d'avis apparaissent une à une (~2 s), puis la phrase de conclusion.
   Cartes sobres aux couleurs Alvea : aucune imitation d'une plateforme d'avis. */
import { REVIEWS } from "./i18n.js";

let seen = false;   // déjà vu une fois : on affiche tout d'un coup au retour

const STAR = cls => `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="${cls}" d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" stroke-linejoin="round"/></svg>`;

export function mountReviews(host, { t, lang, reduced }) {
  const r = t.reviews;
  host.innerHTML = `<p class="small" style="margin:-12px 0 16px">${r.note}</p><div class="rv-stack"></div><p class="conclusion" hidden></p>`;
  const stack = host.querySelector(".rv-stack"), concl = host.querySelector(".conclusion");
  concl.textContent = r.conclusion;

  const card = (rv, anim) => {
    const el = document.createElement("article");
    el.className = "rv" + (anim ? " anim" : "");
    const meta = r.meta.replace("{y}", rv.year) + (lang === "fr" ? "" : " · " + r.translated);
    el.innerHTML = `<div class="st" role="img" aria-label="${r.stars.replace("{n}", rv.stars)}">${[1, 2, 3, 4, 5].map(n => STAR(n <= rv.stars ? "f" : "e")).join("")}</div>
      <blockquote lang="${lang === "fr" ? "fr" : "en"}">«\u00a0${lang === "fr" ? rv.fr : rv.en}\u00a0»</blockquote><span class="m">${meta}</span>`;
    if (lang !== "fr") el.querySelector("blockquote").textContent = `“${rv.en}”`;
    stack.appendChild(el);
    // Sur téléphone, la nouvelle carte peut tomber sous la ligne de flottaison : on la ramène doucement.
    if (anim) {
      const b = el.getBoundingClientRect(), limit = innerHeight - 96;
      if (b.bottom > limit) scrollBy({ top: b.bottom - limit, behavior: "smooth" });
    }
  };

  if (reduced || seen) {
    REVIEWS.forEach(rv => card(rv, false));
    concl.hidden = false;
    return null;
  }

  const timers = [];
  REVIEWS.forEach((rv, i) => timers.push(setTimeout(() => card(rv, true), 300 + i * 2000)));
  timers.push(setTimeout(() => {
    concl.hidden = false; concl.classList.add("anim"); seen = true;
    const b = concl.getBoundingClientRect(), limit = innerHeight - 96;
    if (b.bottom > limit) scrollBy({ top: b.bottom - limit, behavior: "smooth" });
  }, 300 + REVIEWS.length * 2000 + 600));
  return () => timers.forEach(clearTimeout);
}
