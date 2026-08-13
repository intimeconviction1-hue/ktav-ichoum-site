/**
 * outils/slugs.mjs — A LANCER APRES les `git mv`.
 *
 *  1. Met a jour tous les liens internes vers les anciens slugs.
 *  2. Corrige canonical et og:url des pages renommees.
 *  3. Home : la une passe en <h2>, un <h1> propre a l'accueil est ajoute
 *     (sinon la home et le recit Srour se disputent la meme requete).
 *  4. a-propos : ajoute un <h1> s'il n'y en a pas.
 *  5. article-justice (doublon du recit Srour) : liens rediriges vers le recit.
 *
 * Usage :  node outils/slugs.mjs --essai
 *          node outils/slugs.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const RACINE = process.cwd();
const ESSAI = process.argv.includes('--essai');

/* ancien slug (sans .html)  ->  nouveau slug */
const SLUGS = {
  'article': 'synthese-razi-jerusalem',
  'article-japanika': 'synthese-japanika-grenades',
  'article-police': 'synthese-operation-on-target',
  'article-societe': 'synthese-homicides-societe-arabe-2026',
  'article-enquetes': 'dossier-disparus-mont-meron',
  /* doublon : renvoie vers le recit original */
  'article-justice': 'recit-srour-shuafat'
};

const REGLES = [
  [
    'liens internes',
    (s) => {
      for (const [ancien, nouveau] of Object.entries(SLUGS)) {
        s = s.split(`href="/${ancien}"`).join(`href="/${nouveau}"`);
      }
      return s;
    }
  ],
  [
    'canonical et og:url',
    (s) => {
      for (const [ancien, nouveau] of Object.entries(SLUGS)) {
        s = s
          .split(`ktavichoum.vercel.app/${ancien}"`)
          .join(`ktavichoum.vercel.app/${nouveau}"`);
      }
      return s;
    }
  ],
  [
    'home : h1 propre à l’accueil',
    (s, f) => {
      if (f !== 'index.html') return s;
      if (s.includes('class="h1-accueil"')) return s;
      /* La une devient un h2 ; le h1 de la page designe le media. */
      s = s.replace(/<h1>([\s\S]*?)<\/h1>/, '<h2 class="lead-titre">$1</h2>');
      s = s.replace(
        '<!-- HERO / LA UNE -->',
        `<h1 class="h1-accueil">Ktav Ichoum — crime, police et justice en Israël, en français</h1>

<!-- HERO / LA UNE -->`
      );
      s = s.replace(
        '</head>',
        `<style>
.h1-accueil{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.hero .lead .overlay .lead-titre{font-family:var(--ff-display,inherit);font-weight:900;text-transform:uppercase;letter-spacing:-.01em;line-height:1.02;font-size:clamp(1.9rem,4.4vw,3.4rem);margin:0 0 12px}
</style>
</head>`
      );
      return s;
    }
  ],
  [
    'à propos : ajout du h1',
    (s, f) => {
      if (f !== 'a-propos.html') return s;
      if (/<h1[\s>]/.test(s)) return s;
      const m = s.match(/<span class="eyebrow">[^<]*<\/span>/);
      if (m) return s.replace(m[0], m[0] + '\n  <h1>À propos de Ktav Ichoum</h1>');
      return s.replace(/(<div class="wrap"[^>]*>)/, '$1\n  <h1>À propos de Ktav Ichoum</h1>');
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
    journal.push(`${f.padEnd(38)} ${faites.join(', ')}`);
    if (!ESSAI) fs.writeFileSync(p, s, 'utf8');
  } else {
    journal.push(`${f.padEnd(38)} —`);
  }
}

console.log(journal.join('\n'));
console.log(`\n${modifies} fichier(s) sur ${fichiers.length} ${ESSAI ? 'seraient modifiés' : 'modifiés'}.`);
if (ESSAI) console.log('Mode essai : aucun fichier écrit.');
