import fs from 'node:fs';
import path from 'node:path';

const RACINE = process.cwd();
const ESSAI = process.argv.includes('--essai');

const SLUGS = {
  'article': 'synthese-razi-jerusalem',
  'article-japanika': 'synthese-japanika-grenades',
  'article-police': 'synthese-operation-on-target',
  'article-societe': 'synthese-homicides-societe-arabe-2026',
  'article-enquetes': 'dossier-disparus-mont-meron',
  'article-justice': 'recit-srour-shuafat'
};

const REGLES = [
  ['liens internes', (s) => {
    for (const [a, n] of Object.entries(SLUGS)) s = s.split('href="/' + a + '"').join('href="/' + n + '"');
    return s;
  }],
  ['canonical et og:url', (s) => {
    for (const [a, n] of Object.entries(SLUGS)) s = s.split('ktavichoum.vercel.app/' + a + '"').join('ktavichoum.vercel.app/' + n + '"');
    return s;
  }],
  ['home : h1 propre a l accueil', (s, f) => {
    if (f !== 'index.html') return s;
    if (s.includes('class="h1-accueil"')) return s;
    s = s.replace(/<h1>([\s\S]*?)<\/h1>/, '<h2 class="lead-titre">$1</h2>');
    s = s.replace('<!-- HERO / LA UNE -->', '<h1 class="h1-accueil">Ktav Ichoum \u2014 crime, police et justice en Isra\u00ebl, en fran\u00e7ais</h1>\n\n<!-- HERO / LA UNE -->');
    s = s.replace('</head>', '<style>\n.h1-accueil{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}\n.hero .lead .overlay .lead-titre{font-family:var(--ff-display,inherit);font-weight:900;text-transform:uppercase;letter-spacing:-.01em;line-height:1.02;font-size:clamp(1.9rem,4.4vw,3.4rem);margin:0 0 12px}\n</style>\n</head>');
    return s;
  }],
  ['a propos : ajout du h1', (s, f) => {
    if (f !== 'a-propos.html') return s;
    if (/<h1[\s>]/.test(s)) return s;
    const m = s.match(/<span class="eyebrow">[^<]*<\/span>/);
    if (m) return s.replace(m[0], m[0] + '\n  <h1>\u00c0 propos de Ktav Ichoum</h1>');
    return s.replace(/(<div class="wrap"[^>]*>)/, '$1\n  <h1>\u00c0 propos de Ktav Ichoum</h1>');
  }]
];

const fichiers = fs.readdirSync(RACINE).filter((f) => f.endsWith('.html')).sort();
let modifies = 0;
const journal = [];
for (const f of fichiers) {
  const p = path.join(RACINE, f);
  const avant = fs.readFileSync(p, 'utf8');
  let s = avant;
  const faites = [];
  for (const [lib, regle] of REGLES) {
    const t = regle(s, f);
    if (t !== s) { faites.push(lib); s = t; }
  }
  if (s !== avant) {
    modifies++;
    journal.push(f.padEnd(38) + ' ' + faites.join(', '));
    if (!ESSAI) fs.writeFileSync(p, s, 'utf8');
  } else {
    journal.push(f.padEnd(38) + ' -');
  }
}
console.log(journal.join('\n'));
console.log('\n' + modifies + ' fichier(s) sur ' + fichiers.length + (ESSAI ? ' seraient modifies.' : ' modifies.'));