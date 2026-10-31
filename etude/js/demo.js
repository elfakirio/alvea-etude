/* Écran 8 : la démo en 8 chapitres (0 à 7), une idée par écran, pensée d'abord pour le téléphone.
   La barre du bas (Retour / bouton principal) reste celle de l'application : app.js appelle
   back() et next() et affiche label(). Seul le chapitre 3 monte la bouche 3D. */
import { loadThree, createMouth, money, PRICES, ROWS } from "./demo3d.js";

export const LAST_CHAPTER = 7;
const STEPS = 5;   // chapitre 3 : constat + 4 visites

const ICON = {
  mic: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  down: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v15m-6-6 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>`
};

export function mountDemo(host, { t, lang, reduced, answers, opt, esc, pos, onChange, onScore }) {
  const d = t.demo;
  let ch = pos.ch || 0, step = pos.step || 0, mouth = null, alive = true;

  const header = () => {
    const tag = ch === 5 ? d.fictiveAmounts : d.fictive;
    return `<div class="ch-head"><span>${esc(d.chapter.replace("{n}", ch))} · ${esc(d.names[ch])}</span><span class="tag">${esc(tag)}</span></div>
      <div class="ch-bar" aria-hidden="true"><i style="width:${Math.round(ch / LAST_CHAPTER * 100)}%"></i></div>`;
  };

  const body = {
    0() {
      const c = d.c0;
      return `<p class="kicker brand">${c.kicker}</p><h2 tabindex="-1">${esc(c.title)}</h2><p class="lead">${esc(c.text)}</p>
        <ol class="how">${c.steps.map((s, i) => `<li><b>${i + 1}</b><span>${esc(s)}</span></li>`).join("")}</ol>
        <p class="small">${esc(c.small)}</p>`;
    },
    1() {
      const c = d.c1, total = ROWS.reduce((a, r) => a + r[4], 0);
      return `<h2 tabindex="-1">${esc(c.title)}</h2>
        <div class="paper">
          <h4>${esc(c.quoteTitle)}</h4>
          ${ROWS.map(r => `<div class="row"><span>${r[0]} · ${r[1]} · ${lang === "fr" ? r[2] : r[3]}</span><span>${money(r[4], lang)}</span></div>`).join("")}
          <div class="tot"><span>${esc(c.total)}</span><span>${money(total, lang)}</span></div>
        </div>
        <ul class="pills">${c.questions.map(q => `<li>${esc(q)}</li>`).join("")}</ul>
        <p class="lead">${esc(c.text)}</p>`;
    },
    2() {
      const c = d.c2;
      return `<h2 tabindex="-1">${esc(c.title)}</h2>
        <figure class="dictee"><span class="mic">${ICON.mic}</span><blockquote>${lang === "fr" ? `« ${esc(c.quote)} »` : `“${esc(c.quote)}”`}</blockquote></figure>
        <span class="arrow">${ICON.down}</span>
        <p class="kicker brand center">${esc(c.kicker)}</p>
        <div class="grid4">${c.stats.map(([n, l]) => `<div><b>${n}</b><span>${esc(l)}</span></div>`).join("")}</div>
        <p class="lead">${esc(c.text)}</p>`;
    },
    3() {
      const c = d.c3;
      return `<div class="plan-head"><p class="from">${esc(c.from)}</p><h2 tabindex="-1">${esc(c.title)}</h2><p class="small">${esc(c.stats)}</p></div>
        <div class="mouth-box" id="mbox">
          <div class="tlabel" id="l36" hidden>36</div><div class="tlabel" id="l37" hidden>37</div>
          <p class="nogl" id="nogl" hidden>${esc(c.noWebgl)}</p>
          <span class="hint3d">${esc(c.hint)}</span>
        </div>
        <div class="dots" aria-hidden="true">${Array.from({ length: STEPS }, () => "<i></i>").join("")}</div>
        <div class="step-card" id="stepCard" aria-live="polite"></div>`;
    },
    4() {
      const c = d.c4;
      const wait = ([h, p]) => `<li class="wait"><b>${esc(h)}</b><span>${esc(p)}</span></li>`;
      return `<h2 tabindex="-1">${esc(c.title)}</h2>
        <ol class="frise">${c.visits.map((v, i) => `<li class="visit${i === 3 ? " end" : ""}"><span class="dot"></span>${esc(v)}</li>${c.waits[i] ? wait(c.waits[i]) : ""}`).join("")}</ol>`;
    },
    5() {
      const c = d.c5;
      return `<h2 tabindex="-1">${esc(c.title)}</h2>
        <div class="bill">${c.rows.map(([v, w, what], i) => `<div class="bl"><div><b>${esc(v)}</b>${w ? ` <span class="when">· ${esc(w)}</span>` : ""}<span class="what">${esc(what)}</span></div><span class="amt">${money(PRICES[i], lang)}</span></div>`).join("")}
          <div class="bl total"><b>${esc(c.total)}</b><span class="amt">${money(PRICES.reduce((a, b) => a + b, 0), lang)}</span></div></div>
        <p class="lead">${esc(c.text)}</p>`;
    },
    6() {
      const c = d.c6;
      return `<h2 tabindex="-1">${esc(c.title)}</h2>
        <div class="sms"><p class="sms-head">${esc(c.sms)}</p>
          <div class="sms-bubble"><p>${esc(c.bubble)} <span class="fake-link">${esc(c.link)}</span></p>
            <div class="preview"><span class="thumb" aria-hidden="true"></span><span><small>${esc(c.previewSite)}</small><b>${esc(c.previewTitle)}</b></span></div></div></div>
        <p class="arrow-line"><span class="arrow">${ICON.down}</span>${esc(c.arrow)}</p>
        <div class="browser"><div class="bar"><span class="lock">${ICON.lock}</span>${esc(c.link)}</div>
          <div class="page"><b>${esc(c.pageTitle)}</b><span>${esc(c.pageSub)}</span></div></div>
        <p class="lead">${esc(c.text)}</p>`;
    },
    7() {
      const c = d.c7, v = answers.demo_score;
      const r = answers.raison_principale === "Autre" && answers.raison_autre ? answers.raison_autre : (answers.raison_principale ? opt(answers.raison_principale) : "");
      return `<h2 tabindex="-1">${esc(c.title)}</h2>
        <ul class="checks">${c.checks.map(x => `<li><span>${ICON.check}</span>${esc(x)}</li>`).join("")}</ul>
        <div class="field score" data-field="demo_score">
          ${r ? `<p class="small cited">${esc(c.cited.replace("{r}", r))}</p>` : ""}
          <p class="q" id="scoreQ">${esc(c.q)}</p>
          <div class="score-row" role="group" aria-labelledby="scoreQ">${[1, 2, 3, 4, 5].map(n =>
            `<button type="button" data-score="${n}" aria-pressed="${v === n}"${n === 1 ? ` aria-label="1, ${esc(c.low)}"` : n === 5 ? ` aria-label="5, ${esc(c.high)}"` : ""}>${n}</button>`).join("")}</div>
          <div class="score-ends" aria-hidden="true"><span>${esc(c.low)}</span><span>${esc(c.high)}</span></div>
          <p class="err" id="e_demo_score" aria-live="polite"></p>
        </div>`;
    }
  };

  function paintStep() {
    const c = d.c3, s = c.steps[step];
    host.querySelectorAll(".dots i").forEach((el, i) => { el.className = i === step ? "on" : i < step ? "past" : ""; });
    host.querySelector("#stepCard").innerHTML = `<p class="k">${esc(s.k)}</p><p>${esc(s.t)}</p>${s.w ? `<p class="then"><b>${esc(c.then)} :</b> ${esc(s.w)}</p>` : ""}`;
    if (mouth) mouth.setStep(step);
  }

  function mountMouth() {
    const box = host.querySelector("#mbox");
    loadThree().then(() => {
      if (!alive || ch !== 3 || !box.isConnected) return;
      try {
        mouth = createMouth(box, { interactive: true, reduced, step, labels: { l36: host.querySelector("#l36"), l37: host.querySelector("#l37") } });
      } catch { host.querySelector("#nogl").hidden = false; }
    }).catch(() => { if (alive && box.isConnected) host.querySelector("#nogl").hidden = false; });
  }

  function render(focus) {
    if (mouth) { mouth.dispose(); mouth = null; }
    host.innerHTML = `${header()}<div class="ch ch${ch}">${body[ch]()}</div>`;
    if (ch === 3) { paintStep(); mountMouth(); }
    if (ch === 7) host.querySelectorAll("[data-score]").forEach(b => b.onclick = () => {
      onScore(Number(b.dataset.score));
      host.querySelectorAll("[data-score]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      host.querySelector("#e_demo_score").textContent = "";
      host.querySelector(".score").classList.remove("invalid");
    });
    // Le chapitre 2 prépare la 3D, pour qu'elle soit prête au chapitre 3.
    if (ch === 2) loadThree().catch(() => {});
    onChange({ ch, step });
    if (focus) {
      window.scrollTo(0, 0);
      const h = host.querySelector("h2");
      if (h) h.focus({ preventScroll: true });
    }
  }

  render(false);

  return {
    label() {
      if (ch === 3) return step < STEPS - 1 ? d.c3.nextVisit.replace("{n}", step + 1) : d.c3.last;
      return d.next[ch];
    },
    /* true : géré dans la démo ; false : l'application passe à l'écran précédent */
    back() {
      if (ch === 3 && step > 0) { step--; paintStep(); onChange({ ch, step }); return true; }
      if (ch === 0) return false;
      ch--; step = ch === 3 ? STEPS - 1 : 0;
      render(true);
      return true;
    },
    /* true : géré dans la démo ; false : l'application passe à l'écran suivant */
    next() {
      if (ch === 3 && step < STEPS - 1) { step++; paintStep(); onChange({ ch, step }); return true; }
      if (ch === LAST_CHAPTER) {
        if (typeof answers.demo_score === "number") return false;
        const e = host.querySelector("#e_demo_score");
        e.textContent = d.c7.err;
        host.querySelector(".score").classList.add("invalid");
        host.querySelector("[data-score]").focus();
        return true;
      }
      ch++; step = 0;
      render(true);
      return true;
    },
    dispose() { alive = false; if (mouth) mouth.dispose(); }
  };
}
