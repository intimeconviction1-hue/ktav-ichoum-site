// KTAV ICHOUM — Fil en direct
// -----------------------------------------------------------------------------
// Titres de la presse israélienne, repris depuis les flux RSS publiés par les
// éditeurs eux-mêmes. Aucune reformulation, aucun chapô : titre, source, heure,
// lien direct vers l'éditeur.
//
// Principes appliqués :
//   1. Flux natifs des éditeurs (destinés à la syndication) — pas d'agrégateur tiers
//   2. Titres seuls, liens directs vers la source
//   3. Quarantaine automatique de toute dépêche pouvant concerner un mineur
//   4. Éphémère : fenêtre de 24 h, aucun archivage, en-tête noindex
//   5. Attribution explicite côté front
//
// Diagnostic : appeler /api/feed?debug=1 pour voir l'état de chaque source.
// -----------------------------------------------------------------------------

// ⚠️ À VÉRIFIER UNE FOIS AVANT MISE EN LIGNE (voir /api/feed?debug=1).
// Les URL de flux changent au gré des refontes. Gardez celles qui répondent,
// supprimez les autres. Une source morte ne casse rien : elle est ignorée.
const SOURCES = [
  { id: 'toi-fr',      name: 'Times of Israël',  lang: 'fr', url: 'https://fr.timesofisrael.com/feed/' },
  { id: 'ynet',        name: 'Ynet',             lang: 'he', url: 'https://www.ynet.co.il/Integration/StoryRss538.xml' },
  { id: 'israelhayom', name: 'Israel Hayom',     lang: 'he', url: 'https://www.israelhayom.co.il/rss.xml' },
  { id: 'walla',       name: 'Walla',            lang: 'he', url: 'https://rss.walla.co.il/feed/1' },
  { id: 'haaretz',     name: 'Haaretz',          lang: 'he', url: 'https://www.haaretz.co.il/srv/rss---news' },
  { id: 'jpost',       name: 'Jerusalem Post',   lang: 'en', url: 'https://www.jpost.com/rss/rssfeedsisraelnews.aspx' },
];

const WINDOW_HOURS = 24;   // fenêtre de fraîcheur — rien au-delà
const MAX_ITEMS    = 40;   // plafond d'affichage
const TIMEOUT_MS   = 7000;

// --- Pertinence : la dépêche relève-t-elle du judiciaire ? --------------------
const RELEVANT = new RegExp([
  // hébreu
  'רצח|הרג|ירי|דקיר|פשע|פלילי|משטרה|מעצר|נעצר|חשוד|נאשם|כתב אישום|גזר דין',
  'הכרעת דין|בית משפט|שופט|תביעה|פרקליטות|שוד|סחיטה|הלבנת הון|סמים|נשק|גופה',
  // français
  'meurtre|homicide|assassinat|fusillade|poignard|abattu|police|arrestation|interpell',
  'enquête|enquete|justice|procès|proces|condamn|inculp|tribunal|juge|crime|gang|mafia',
  'trafic|agression|disparition|règlement de comptes|reglement de comptes',
  // anglais
  'murder|homicide|shooting|stabbing|police|arrest|suspect|indictment|verdict|court',
  'sentenc|convict|crime|gang|mafia|trafficking|assault',
].join('|'), 'i');

// --- Exclusions : guerre, géopolitique, militaire ------------------------------
const EXCLUDED = new RegExp([
  'עזה|חמאס|חיזבאללה|מלחמה|חטופ|טילים|רקטות|צה"ל|פיגוע|מחבל',
  'gaza|hamas|hezbollah|hostage|missile|rocket|idf|airstrike|militar|terror',
  'otage|roquette|frappe|militaire|terroris',
].join('|'), 'i');

// --- QUARANTAINE MINEURS -----------------------------------------------------
// Toute dépêche susceptible de concerner un mineur est écartée du fil, sans
// intervention humaine. Art. L. 513-4 CJPM et art. 39 bis loi 1881.
// Le filtre est volontairement large : un faux positif coûte une dépêche,
// un faux négatif coûte une infraction.
const MINOR_WORDS = new RegExp([
  // hébreu
  'קטין|קטינה|קטינים|נער|נערה|נערים|נערות|ילד|ילדה|ילדים|תלמיד|תלמידה',
  'בית ספר|תיכון|גן ילדים|בני נוער|עבריינות נוער',
  // français
  'mineur|mineure|adolescent|adolescente|enfant|collégien|collegien|lycéen|lyceen',
  'écolier|ecolier|élève|eleve|collège|college|lycée|lycee|école|ecole',
  // anglais
  'minor|teen|teenager|juvenile|schoolboy|schoolgirl|pupil|high school|kindergarten',
].join('|'), 'i');

// Âges : « בן 17 », « âgé de 16 ans », « 15-year-old », « aged 17 »…
const AGE_PATTERNS = [
  /\b(?:בן|בת)\s*(\d{1,2})\b/g,
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
        'User-Agent': 'KtavIchoumBot/2.0 (+https://ktavichoum.vercel.app)',
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

  // Le fil ne doit jamais être indexé : il est éphémère et non éditorialisé.
  res.setHeader('X-Robots-Tag', 'noindex, noarchive, nosnippet');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const results = await Promise.all(SOURCES.map(fetchSource));

    const seen = new Set();
    const items = [];
    const stats = { recus: 0, horsFenetre: 0, horsSujet: 0, exclus: 0, quarantaineMineurs: 0, doublons: 0 };

    for (const { src, items: raw } of results) {
      for (const it of raw) {
        stats.recus++;

        const t = new Date(it.pubDate).getTime();
        if (Number.isNaN(t) || t < cutoff) { stats.horsFenetre++; continue; }
        if (!RELEVANT.test(it.title))      { stats.horsSujet++; continue; }
        if (EXCLUDED.test(it.title))       { stats.exclus++; continue; }

        // Quarantaine mineurs — non négociable, aucune exception.
        if (mentionsMinor(it.title))       { stats.quarantaineMineurs++; continue; }

        const key = it.title.replace(/\W+/g, '').slice(0, 50).toLowerCase();
        if (seen.has(key)) { stats.doublons++; continue; }
        seen.add(key);

        items.push({
          title: it.title,           // titre de l'éditeur, non reformulé
          link: it.link,             // lien direct vers l'éditeur
          source: src.name,          // nom fiable, issu de notre configuration
          lang: src.lang,
          pubDate: new Date(t).toISOString(),
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
          ok: r.ok, reason: r.reason, brut: r.items.length,
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
