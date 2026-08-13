/**
 * outils/chrome.mjs — Propage le chrome commun (barre utilitaire, navigation,
 * pied de page, URLs propres, flux RSS) sur toutes les pages HTML du site.
 *
 * Usage :  node outils/chrome.mjs
 *          node outils/chrome.mjs --essai     (n'ecrit rien, affiche seulement)
 *
 * Idempotent : peut etre relance sans effet de bord.
 * Filet de securite : git. En cas de probleme, `git checkout -- .`
 */

import fs from 'node:fs';
import path from 'node:path';

const RACINE = process.cwd();
const ESSAI = process.argv.includes('--essai');

const LIEN_FONTS =
  '<link href="https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@500;600;700&family=Archivo:wght@500;600;700;800;900&family=Inter:wght@400;500;600&family=Newsreader:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">';

const LIEN_RSS =
  '<link rel="alternate" type="application/rss+xml" title="KTAV ICHOUM — Le fil des faits divers israéliens" href="/api/rss">';

const PIED_PROSE =
  "Récits originaux et chroniques judiciaires en français, écrits à partir de sources israéliennes en hébreu. Les synthèses de presse créditent leurs éditeurs d'origine et renvoient vers eux.";

/** Chaque regle : [libelle, fonction (s, fichier) => s] */
const REGLES = [
  // ---------------------------------------------------------------- 1. Fonts
  [
    'lien Google Fonts',
    (s) => {
      if (s.includes('fonts.googleapis.com/css2')) return s;
      if (!s.includes('</head>')) return s;
      return s.replace(
        '</head>',
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
          '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
          LIEN_FONTS +
          '\n</head>'
      );
    }
  ],

  // ------------------------------------------------- 2. Pied de page : accents
  [
    'pied de page (orthographe)',
    (s) =>
      s.replace(
        /<p class="about">[^<]*<\/p>/,
        `<p class="about">${PIED_PROSE}</p>`
      )
  ],

  // ------------------------------------------- 3. Icones sociales mortes (#)
  [
    'icones sociales mortes',
    (s) => {
      const i = s.indexOf('<div class="social">');
      if (i === -1) return s;
      const j = s.indexOf('</div>', s.lastIndexOf('</a>', s.indexOf('</div>', i + 400)));
      const fin = s.indexOf('</div>', s.indexOf('aria-label="X"', i));
      if (fin === -1) return s;
      return s.slice(0, i) + s.slice(fin + '</div>'.length).replace(/^\s*\n/, '\n');
    }
  ],

  // --------------------------------------------- 4. Barre utilitaire : liens morts
  [
    'barre utilitaire',
    (s) =>
      s
        .replace(
          /<span class="edition"><span class="today">[^<]*<\/span>\s*·\s*Tel-Aviv<\/span>/,
          '<span class="edition">Édition de Tel-Aviv<span class="today"></span></span>'
        )
        .replace(
          /<a href="#" class="live">/,
          '<a href="/fil" class="live">'
        )
        .replace(
          /<a href="#">Édition France<\/a><a href="#">Diaspora<\/a>/,
          '<a href="/recits">Récits</a><a href="/archives">Archives</a>'
        )
        .replace(
          /\s*<a href="#" class="btn" style="padding:5px 12px">Connexion<\/a>\n?/,
          '\n'
        )
  ],

  // ------------------------------------------------- 5. Navigation : entree Fil
  [
    'entrée Fil (navigation)',
    (s, f) => {
      if (/<a href="\/fil"[^>]*>Fil<\/a>/.test(s)) return s;
      const actif = f === 'fil.html' ? ' class="hot is-active"' : ' class="hot"';
      return s.replace(
        /(<nav class="nav"[^>]*>)\s*(<a href=")/,
        `$1\n    <a href="/fil"${actif}>Fil</a>$2`
      );
    }
  ],
  [
    'accentuation unique dans la nav',
    (s) =>
      s.replace(
        /<a href="\/crime-organise" class="hot">Crime organisé<\/a>/,
        '<a href="/crime-organise" >Crime organisé</a>'
      )
  ],
  [
    'entrée Fil (menu mobile)',
    (s) => {
      if (/<nav>[^]*?href="\/fil"/.test(s)) return s;
      return s.replace(
        /<nav><a href="(?:index\.html|\/)">Accueil<\/a>/,
        '<nav><a href="/">Accueil</a><a href="/fil">Fil</a>'
      );
    }
  ],
  [
    'entrée Fil (pied de page)',
    (s) => {
      if (s.includes('href="/fil">Fil en continu<')) return s;
      return s.replace(
        /<li><a href="(?:index\.html|\/)">Accueil<\/a><\/li>/,
        '<li><a href="/">Accueil</a></li><li><a href="/fil">Fil en continu</a></li>'
      );
    }
  ],

  // ----------------------------------------------------------- 6. Flux RSS
  [
    'déclaration du flux RSS',
    (s) => {
      if (s.includes('application/rss+xml')) return s;
      if (s.includes('<link rel="canonical"')) {
        return s.replace('<link rel="canonical"', LIEN_RSS + '\n<link rel="canonical"');
      }
      if (s.includes('</head>')) return s.replace('</head>', LIEN_RSS + '\n</head>');
      return s;
    }
  ],
  [
    'lien Flux RSS (pied de page)',
    (s) => {
      if (s.includes('>Flux RSS<')) return s;
      return s.replace(
        /<li><a href="(?:confidentialite\.html|\/confidentialite)">Confidentialité<\/a><\/li>/,
        '<li><a href="/api/rss">Flux RSS</a></li><li><a href="/confidentialite">Confidentialité</a></li>'
      );
    }
  ],

  // ------------------------------------------------------------ 7. URLs propres
  [
    'URLs propres (.html supprimé)',
    (s) =>
      s
        .replace(/href="\.\/([a-z0-9-]+)\.html"/g, 'href="/$1"')
        .replace(/href="([a-z0-9-]+)\.html"/g, 'href="/$1"')
        .replace(/href="\/index"/g, 'href="/"')
  ],
  [
    'canonical sans extension',
    (s) =>
      s
        .replace(
          /(<link rel="canonical" href="https:\/\/ktavichoum\.vercel\.app\/)index\.html">/,
          '$1">'
        )
        .replace(
          /(<link rel="canonical" href="https:\/\/ktavichoum\.vercel\.app\/[a-z0-9-]+)\.html">/,
          '$1">'
        )
        .replace(
          /(<meta property="og:url" content="https:\/\/ktavichoum\.vercel\.app\/[a-z0-9-]*)\.html">/,
          '$1">'
        )
  ]
];

// ---------------------------------------------------------------------------

const fichiers = fs
  .readdirSync(RACINE)
  .filter((f) => f.endsWith('.html'))
  .sort();

let modifies = 0;
const journal = [];

for (const f of fichiers) {
  const p = path.join(RACINE, f);
  const avant = fs.readFileSync(p, 'utf8');
  let s = avant;
  const appliquees = [];

  for (const [libelle, regle] of REGLES) {
    const t = regle(s, f);
    if (t !== s) {
      appliquees.push(libelle);
      s = t;
    }
  }

  if (s !== avant) {
    modifies++;
    journal.push(`${f.padEnd(32)} ${appliquees.join(', ')}`);
    if (!ESSAI) fs.writeFileSync(p, s, 'utf8');
  } else {
    journal.push(`${f.padEnd(32)} —`);
  }
}

console.log(journal.join('\n'));
console.log(
  `\n${modifies} fichier(s) sur ${fichiers.length} ${ESSAI ? 'seraient modifiés' : 'modifiés'}.`
);
if (ESSAI) console.log('Mode essai : aucun fichier écrit.');
