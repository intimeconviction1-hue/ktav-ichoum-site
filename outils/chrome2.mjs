/**
 * outils/chrome2.mjs — Second lot de corrections.
 *
 *  1. Boutons de partage : X, WhatsApp et « Copier » deviennent fonctionnels,
 *     construits sur le canonical de la page.
 *  2. Pagination decorative (‹ 1 2 3 ›) : supprimee. Elle promet une profondeur
 *     qui n'existe pas et envoie le robot vers du vide.
 *  3. Hashtags morts : supprimes. Trois recits ne justifient pas un systeme de tags.
 *  4. Placeholder « … » residuel dans la barre utilitaire des rubriques.
 *
 * Usage :  node outils/chrome2.mjs --essai
 *          node outils/chrome2.mjs
 *
 * Idempotent. Filet de securite : git checkout -- .
 */

import fs from 'node:fs';
import path from 'node:path';

const RACINE = process.cwd();
const ESSAI = process.argv.includes('--essai');
const SITE = 'https://ktavichoum.vercel.app';

/* Script de partage, injecte une seule fois par page concernee. */
const SCRIPT_PARTAGE = `<script>
/* Partage — construit sur le canonical de la page, sans dependance externe. */
(function(){
  var lien = document.querySelector('link[rel="canonical"]');
  var url  = lien ? lien.href : location.href;
  var titre = (document.querySelector('h1') || {}).textContent || document.title;
  var cibles = {
    X: 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(titre) + '&url=' + encodeURIComponent(url),
    WhatsApp: 'https://wa.me/?text=' + encodeURIComponent(titre + ' — ' + url)
  };
  document.querySelectorAll('.share a[data-partage]').forEach(function(a){
    var r = a.getAttribute('data-partage');
    if (cibles[r]) { a.href = cibles[r]; a.target = '_blank'; a.rel = 'noopener'; return; }
    a.href = url;
    a.addEventListener('click', function(e){
      e.preventDefault();
      var fini = function(){
        var t = a.getAttribute('aria-label');
        a.setAttribute('aria-label', 'Lien copié');
        setTimeout(function(){ a.setAttribute('aria-label', t); }, 1800);
      };
      if (navigator.clipboard) { navigator.clipboard.writeText(url).then(fini, function(){}); }
    });
  });
})();
</script>
`;

const REGLES = [
  // -------------------------------------------------- 1. Partage fonctionnel
  [
    'boutons de partage',
    (s) => {
      const m = s.match(/<link rel="canonical" href="([^"]+)"/);
      if (!m) return s;
      const url = m[1];
      const h1 = s.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
      const titre = h1 ? h1[1].replace(/<[^>]+>/g, '').trim() : '';
      const x =
        'https://twitter.com/intent/tweet?text=' +
        encodeURIComponent(titre) +
        '&amp;url=' +
        encodeURIComponent(url);
      const wa = 'https://wa.me/?text=' + encodeURIComponent(titre + ' — ' + url);
      return s
        .replace(
          /<a href="#" aria-label="X">/g,
          `<a href="${x}" target="_blank" rel="noopener" data-partage="X" aria-label="Partager sur X">`
        )
        .replace(
          /<a href="#" aria-label="WhatsApp">/g,
          `<a href="${wa}" target="_blank" rel="noopener" data-partage="WhatsApp" aria-label="Partager sur WhatsApp">`
        )
        .replace(
          /<a href="#" aria-label="Copier">/g,
          `<a href="${url}" data-partage="copier" aria-label="Copier le lien">`
        );
    }
  ],
  [
    'script de partage',
    (s) => {
      if (!s.includes('data-partage=')) return s;
      if (s.includes("querySelectorAll('.share a[data-partage]')")) return s;
      return s.replace('</body>', SCRIPT_PARTAGE + '</body>');
    }
  ],

  // ------------------------------------------------ 2. Pagination decorative
  [
    'pagination décorative',
    (s) => s.replace(/\s*<nav class="pager"[^>]*>[\s\S]*?<\/nav>\s*/g, '\n\n  ')
  ],

  // ------------------------------------------------------ 3. Hashtags morts
  [
    'hashtags morts',
    (s) => s.replace(/\s*<div class="tags-row">[\s\S]*?<\/div>\s*/g, '\n\n      ')
  ],

  // -------------------------------------- 4. Placeholder de la barre utilitaire
  [
    'placeholder de date',
    (s) =>
      s.replace(
        /<span class="edition"><span class="today">…<\/span><\/span>/g,
        '<span class="edition">Édition de Tel-Aviv<span class="today"></span></span>'
      )
  ],
  [
    'script de date',
    (s) => {
      if (!s.includes('class="today"')) return s;
      if (s.includes("querySelector('.util .today')")) return s;
      return s.replace(
        '<script src="./assets/app.js?v=20260812"></script>',
        `<script>
(function(){var e=document.querySelector('.util .today');if(!e)return;
 try{e.textContent=' · '+new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});}catch(x){}})();
</script>
<script src="./assets/app.js?v=20260812"></script>`
      );
    }
  ]
];

const fichiers = fs.readdirSync(RACINE).filter((f) => f.endsWith('.html')).sort();
let modifies = 0;
const journal = [];

for (const f of fichiers) {
  const p = path.join(RACINE, f);
  const avant = fs.readFileSync(p, 'utf8');
  let s = avant;
  const faites = [];
  for (const [libelle, regle] of REGLES) {
    const t = regle(s, f);
    if (t !== s) { faites.push(libelle); s = t; }
  }
  if (s !== avant) {
    modifies++;
    journal.push(`${f.padEnd(32)} ${faites.join(', ')}`);
    if (!ESSAI) fs.writeFileSync(p, s, 'utf8');
  } else {
    journal.push(`${f.padEnd(32)} —`);
  }
}

console.log(journal.join('\n'));
console.log(`\n${modifies} fichier(s) sur ${fichiers.length} ${ESSAI ? 'seraient modifiés' : 'modifiés'}.`);
if (ESSAI) console.log('Mode essai : aucun fichier écrit.');
