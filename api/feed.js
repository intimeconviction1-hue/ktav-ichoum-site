// KTAV ICHOUM — Fil en direct (v3)
// -----------------------------------------------------------------------------
// Titres de la presse israélienne, repris depuis les flux RSS publiés par les
// éditeurs eux-mêmes. Aucune reformulation : titre, source, heure, lien direct.
//
//   1. Flux natifs des éditeurs — pas d'agrégateur tiers
//   2. Titres seuls, liens directs vers la source
//   3. Quarantaine automatique de toute dépêche pouvant concerner un mineur
//   4. Éphémère : fenêtre de 24 h, aucun archivage, en-tête noindex
//   5. Attribution explicite côté front
//
// v3 : le tri repose d'abord sur la RUBRIQUE DE L'ÉDITEUR (lisible dans l'URL),
//      et seulement à défaut sur les mots-clés. Un éditeur qui range un article
//      dans /crime/ sait mieux que nous de quoi il parle.
//
// Diagnostic : /api/feed?debug=1
// -----------------------------------------------------------------------------

const SOURCES = [
  { id: 'ynet',        name: 'Ynet',           lang: 'he', url: 'https://www.ynet.co.il/Integration/StoryRss538.xml' },
  { id: 'israelhayom', name: 'Israel Hayom',   lang: 'he', url: 'https://www.israelhayom.co.il/rss.xml' },
  { id: 'walla',       name: 'Walla',          lang: 'he', url: 'https://rss.walla.co.il/feed/1' },
  { id: 'jpost',       name: 'Jerusalem Post', lang: 'en', url: 'https://www.jpost.com/rss/rssfeedsisraelnews.aspx' },
  // Retirés : Times of Israël et Haaretz renvoient HTTP 403 (robots bloqués).
  // Ce n'est pas une erreur d'URL : leurs serveurs refusent l'accès automatisé.
];

const WINDOW_HOURS = 24;
const MAX_ITEMS    = 40;
const TIMEOUT_MS   = 7000;

// --- 1. RUBRIQUE ACCEPTÉE (d'après l'URL) ------------------------------------
// Si l'éditeur a rangé l'article dans une rubrique judiciaire, on prend.
const SECTION_OK = /\/(crime|crimes|criminal|crime-in-israel|law|legal|courts?|justice|police|law-and-order|פלילים|פלילי|משפט)(\/|$|\?)/i;

// --- 2. RUBRIQUE REFUSÉE (d'après l'URL) -------------------------------------
// Rejet immédiat, quel que soit le titre. C'est ce qui élimine les tribunes.
const SECTION_KO = /\/(opinions?|opinion|blogs?|columns?|editorial|sport|sports|business|finance|markets|economy|tech|technology|digital|health|food|travel|tourism|culture|art|books|movies|tv|celebs|celebrity|fashion|cars|auto|real-estate|realestate|magazine|weather|judaism|jewish-world|lifestyle|science|environment|דעות|ספורט|כלכלה|תרבות|בריאות|אוכל|רכב)(\/|$|\?)/i;

// --- 3. Pertinence par mots-clés (secours, si la rubrique est muette) --------
const RELEVANT = new RegExp([
  'רצח|נרצח|ירי|נורה|דקיר|פשע|פלילי|משטרה|נעצר|מעצר|חשוד|נאשם|כתב אישום|גזר דין',
  'הכרעת דין|בית משפט|תביעה|פרקליטות|שוד|סחיטה|הלבנת הון|סמים|נשק|גופה|אלימות',
  'meurtre|homicide|assassinat|fusillade|poignard|abattu|police|arrestation|interpell',
  'enquête|enquete|procès|proces|condamn|inculp|tribunal|crime|gang|mafia|trafic',
  'murder|homicide|shooting|stabbing|police|arrest|suspect|indictment|verdict',
  'sentenc|convict|crime|gang|mafia|trafficking|assault|manslaughter',
].join('|'), 'i');

// --- 4. Exclusions thématiques ----------------------------------------------
// Guerre et géopolitique
const EXCL_GUERRE = /עזה|חמאס|חיזבאללה|מלחמה|חטופ|טילים|רקטות|צה"ל|פיגוע|מחבל|gaza|hamas|hezbollah|hostage|missile|rocket|idf|airstrike|militar|terror|otage|roquette|frappe|militaire|terroris|unrwa/i;

// Contentieux administratif et constitutionnel : ce n'est pas du judiciaire pénal
const EXCL_ADMIN = /בג"?ץ|בגץ|עתירה|עותרים|high court of justice|petition|petitioners|knesset|קואליציה|coalition|תקציב|budget/i;

// Accidents : un mort n'est pas un crime
const EXCL_ACCIDENT = /תאונ|התהפכ|נהרג בתאונה|טבע|שריפה|accident|crash|collision|drown|fire|road death/i;

// Manifestations et ordre public
const EXCL_MANIF = /הפגנ|מחאה|מפגינים|חסימת כביש|protest|demonstrat|rally|road block/i;

// --- 5. QUARANTAINE MINEURS --------------------------------------------------
// Art. L. 513-4 CJPM, art. 39 bis loi 1881. Filtre volontairement large :
// un faux positif coûte une dépêche, un faux négatif coûte une infraction.
const MINOR_WORDS = new RegExp([
  'קטין|קטינה|קטינים|קטינות|נער|נערה|נערים|נערות|ילד|ילדה|ילדים|תלמיד|תלמידה',
  'בית ספר|תיכון|גן ילדים|בני נוער|עבריינות נוער',
  'mineur|mineure|adolescent|adolescente|enfant|collégien|collegien|lycéen|lyceen',
  'écolier|ecolier|élève|eleve|collège|college|lycée|lycee|école|ecole',
  'minor|teen|teenager|juvenile|schoolboy|schoolgirl|pupil|high school|kindergarten',
].join('|'), 'i');

const AGE_PATTERNS = [
  /\b(?:בן|בת)\s*(?:ה-)?\s*(\d{1,2})\b/g,
  /\b(?:âg|ag)[ée]e?\s+de\s+(\d{1,2})\s*ans?\b/gi,
  /\b(\d{1,2})\s*ans?\b/g,
  /\b(\d{1,2})[-\s]year[-\s]old\b/gi,
  /\baged?\s+(\d{1,2})\b/gi,
];

function mentionsMinor(text) {
  if (MINOR_WORDS.test(text)) return true;
  for (const re of AGE_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const age = parseInt(m[1], 10);
      if (!Number.isNaN(age) && age > 0 && age < 18) return true;
    }
  }
  return false;
}

// --- Parsing RSS + Atom ------------------------------------------------------
function decode(s = '') {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parse(xml) {
  const out = [];
  const isAtom = /<feed[\s>]/i.test(xml) && /<entry[\s>]/i.test(xml);
  const blocks = isAtom
    ? xml.split(/<entry[\s>]/i).slice(1).map((b) => b.split(/<\/entry>/i)[0])
    : xml.split(/<item[\s>]/i).slice(1).map((b) => b.split(/<\/item>/i)[0]);

  for (const chunk of blocks) {
    const grab = (re) => { const m = chunk.match(re); return m ? m[1] : ''; };
    const title = decode(grab(/<title[^>]*>([\s\S]*?)<\/title>/i));

    let link = decode(grab(/<link[^>]*>([\s\S]*?)<\/link>/i));
    if (!link) link = decode(grab(/<link[^>]*href=["']([^"']+)["']/i));
    if (!link) link = decode(grab(/<guid[^>]*>([\s\S]*?)<\/guid>/i));

    const date =
      grab(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
      grab(/<updated[^>]*>([\s\S]*?)<\/updated>/i) ||
      grab(/<published[^>]*>([\s\S]*?)<\/published>/i) ||
      grab(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i);

    if (title && /^https?:\/\//i.test(link)) {
      out.push({ title, link, pubDate: (date || '').trim() });
    }
  }
  return out;
}

async function fetchSource(src) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(src.url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'KtavIchoumBot/3.0 (+https://ktavichoum.vercel.app)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
    });
    if (!r.ok) return { src, ok: false, reason: 'HTTP ' + r.status, items: [] };
    const items = parse(await r.text());
    return { src, ok: true, reason: items.length ? 'ok' : 'flux vide', items };
  } catch (e) {
    return { src, ok: false, reason: e.name === 'AbortError' ? 'timeout' : String(e.message || e), items: [] };
  } finally {
    clearTimeout(timer);
  }
}

// --- Handler -----------------------------------------------------------------
export default async function handler(req, res) {
  const debug = req?.query?.debug === '1';
  const cutoff = Date.now() - WINDOW_HOURS * 3600 * 1000;

  res.setHeader('X-Robots-Tag', 'noindex, noarchive, nosnippet');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const results = await Promise.all(SOURCES.map(fetchSource));

    const seen = new Set();
    const items = [];
    const stats = {
      recus: 0, horsFenetre: 0, rubriqueRefusee: 0, horsSujet: 0,
      guerre: 0, admin: 0, accident: 0, manifestation: 0,
      quarantaineMineurs: 0, doublons: 0,
    };
    const parSource = {};

    for (const { src, items: raw } of results) {
      parSource[src.id] = { brut: raw.length, retenus: 0 };

      for (const it of raw) {
        stats.recus++;

        const t = new Date(it.pubDate).getTime();
        if (Number.isNaN(t) || t < cutoff) { stats.horsFenetre++; continue; }

        // Rubrique refusée par l'éditeur → rejet immédiat, titre non examiné
        if (SECTION_KO.test(it.link)) { stats.rubriqueRefusee++; continue; }

        // Rubrique judiciaire de l'éditeur → admis d'office ; sinon, mots-clés
        const parRubrique = SECTION_OK.test(it.link);
        if (!parRubrique && !RELEVANT.test(it.title)) { stats.horsSujet++; continue; }

        if (EXCL_GUERRE.test(it.title))   { stats.guerre++; continue; }
        if (EXCL_ADMIN.test(it.title))    { stats.admin++; continue; }
        if (EXCL_ACCIDENT.test(it.title)) { stats.accident++; continue; }
        if (EXCL_MANIF.test(it.title))    { stats.manifestation++; continue; }

        // Quarantaine mineurs — aucune exception
        if (mentionsMinor(it.title)) { stats.quarantaineMineurs++; continue; }

        const key = it.title.replace(/\W+/g, '').slice(0, 50).toLowerCase();
        if (seen.has(key)) { stats.doublons++; continue; }
        seen.add(key);

        parSource[src.id].retenus++;
        items.push({
          title: it.title,
          link: it.link,
          source: src.name,
          lang: src.lang,
          pubDate: new Date(t).toISOString(),
          viaRubrique: parRubrique,   // true = classé judiciaire par l'éditeur
        });
      }
    }

    items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    const payload = {
      ok: true,
      updated: new Date().toISOString(),
      fenetre: WINDOW_HOURS + 'h',
      attribution: "Titres de la presse israélienne, liens vers les éditeurs. Ktav Ichoum n'en est pas l'auteur.",
      count: Math.min(items.length, MAX_ITEMS),
      items: items.slice(0, MAX_ITEMS),
    };

    if (debug) {
      payload.debug = {
        stats,
        sources: results.map((r) => ({
          id: r.src.id, name: r.src.name, url: r.src.url,
          ok: r.ok, reason: r.reason,
          brut: parSource[r.src.id]?.brut ?? 0,
          retenus: parSource[r.src.id]?.retenus ?? 0,
        })),
      };
    }

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    res.status(200).json(payload);
  } catch (e) {
    res.setHeader('Cache-Control', 's-maxage=60');
    res.status(200).json({ ok: false, error: String(e), items: [] });
  }
}
