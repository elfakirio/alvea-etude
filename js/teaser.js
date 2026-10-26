/* Écran 7 : teaser d'environ 15 s.
   1. un devis papier plein de codes, des « ? » qui flottent ;
   2. le devis se replie, l'arcade 3D apparaît et tourne doucement ;
   3. les dents 36 et 37 s'allument, puis la phrase d'accroche. */
import { loadThree, createMouth, money } from "./demo3d.js";

const ROWS = [
  ["36", "EXT-M", "Extraction", "Extraction", 95],
  ["36", "GOS-1", "Greffe osseuse", "Bone graft", 380],
  ["37", "CPR-T", "Couronne provisoire", "Temporary crown", 130],
  ["36", "IMP-1", "Implant", "Implant", 1100],
  ["36", "PIL-I", "Pilier implantaire", "Implant abutment", 280],
  ["36·37", "EMP-2", "Empreintes", "Impressions", 70],
  ["36", "CCI-1", "Couronne sur implant", "Implant crown", 850],
  ["37", "CCC-1", "Couronne céramique", "Ceramic crown", 750]
];
const QM = [[8, 14, 34], [82, 10, 26], [12, 70, 24], [86, 64, 36], [48, 6, 22], [70, 84, 28], [24, 88, 30]];

export function mountTeaser(host, { t, lang, reduced }) {
  const tz = t.teaser;
  const total = ROWS.reduce((a, r) => a + r[4], 0);   // 3 655 €
  host.innerHTML = `<h2 class="sr-only">${tz.line}</h2>
    <div class="teaser p1" id="tz" role="img" aria-label="${tz.line}">
      <div class="gl" id="gl"><div class="tlabel" id="tl36" hidden>36</div><div class="tlabel" id="tl37" hidden>37</div></div>
      ${QM.map(([x, y, s], i) => `<span class="qm" aria-hidden="true" style="left:${x}%;top:${y}%;font-size:${s}px;animation-delay:${i * 0.35}s">?</span>`).join("")}
      <div class="paper" aria-hidden="true">
        <h4>${tz.quoteTitle}</h4>
        ${ROWS.map(r => `<div class="row"><span>${r[0]} · ${r[1]} · ${lang === "fr" ? r[2] : r[3]}</span><span>${money(r[4], lang)}</span></div>`).join("")}
        <div class="tot"><span>${tz.total}</span><span>${money(total, lang)}</span></div>
      </div>
      <p class="line" aria-hidden="true">${tz.line}</p>
    </div>`;

  const tzEl = host.querySelector("#tz"), gl = host.querySelector("#gl");
  const timers = [];
  let mouth = null, alive = true;
  const phase = n => { tzEl.className = "teaser p" + n; };

  const mountMouth = step => loadThree().then(() => {
    if (!alive) return;
    try { mouth = createMouth(gl, { orbit: true, reduced, step, labels: { l36: host.querySelector("#tl36"), l37: host.querySelector("#tl37") } }); } catch { /* pas de WebGL : le texte suffit */ }
  }).catch(() => {});

  if (reduced) {
    phase(3);
    mountMouth(0);
  } else {
    mountMouth(-1);
    timers.push(setTimeout(() => phase(2), 4500));
    timers.push(setTimeout(() => { if (mouth) mouth.setStep(0); }, 8500));
    timers.push(setTimeout(() => phase(3), 10000));
  }
  return () => {
    alive = false;
    timers.forEach(clearTimeout);
    if (mouth) mouth.dispose();
  };
}
