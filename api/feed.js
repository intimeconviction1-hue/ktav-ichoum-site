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
  // Times of Israel (403 malgre UA navigateur) et i24 (flux vide) : inexploitables.
  // Aucune source francophone disponible : le fil est traduit, cf. traduire().
];

const WINDOW_HOURS = 24;
const MAX_ITEMS    = 40;
const TIMEOUT_MS   = 7000;

// --- 1. RUBRIQUE ACCEPTÉE (d'après l'URL) ------------------------------------
// Si l'éditeur a rangé l'article dans une rubrique judiciaire, on prend.
const SECTION_OK = /\/(crime|crimes|criminal|crime-in-israel|law|legal|courts?|justice|police|law-and-order|פלילים|פלילי|משפט)(\/|$|\?)/i;

// --- 2. RUBRIQUE REFUSÉE (d'après l'URL) -------------------------------------
// Rejet immédiat, quel que soit le titre. C'est ce qui élimine les tribunes.
const SECTION_KO = /\/(opinions?|opinion|blogs?|columns?|editorial|sport|sports|business|finance|markets|economy|tech|technology|digital|health|food|travel|tourism|culture|art|books|movies|tv|celebs|celebrity|fashion|cars|auto|real-estate|realestate|magazine|weather|judaism|jewish-world|lifestyle|science|environment|world-news|world|usa|us-news|international|abroad|europe|חו"ל|עולם|דעות|ספורט|כלכלה|תרבות|בריאות|אוכל|רכב)(\/|$|\?)/i;

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
const EXCL_ACCIDENT = /תאונ|התהפכ|נהרג בתאונה|טבע למוות|שריפה|נסחפ|חולצ|חילוץ|הצלה|כבאות|מד"א|accident|crash|collision|drown|rescue|fire|road death/i;

// Manifestations et ordre public
const EXCL_MANIF = /הפגנ|מחאה|מפגינים|חסימת כביש|protest|demonstrat|rally|road block/i;

// --- 5. QUARANTAINE MINEURS --------------------------------------------------
// Art. L. 513-4 CJPM, art. 39 bis loi 1881. Filtre volontairement large :
// un faux positif coûte une dépêche, un faux négatif coûte une infraction.
const MINOR_WORDS = new RegExp([
  'קטין|קטינה|קטינים|קטינות|נער|נערה|נערים|נערות|ילד|ילדה|ילדים|ילדות',
  'בן|בת|בנות|בנים|תינוק|תינוקת|תינוקות|פעוט|פעוטה|פעוטות|תלמיד|תלמידה',
  'בית ספר|תיכון|גן ילדים|גנון|מעון|בני נוער|עבריינות נוער|חטיבת ביניים',
  'mineur|mineure|adolescent|adolescente|enfant|nourrisson|bébé|bebe|tout-petit',
  'crèche|creche|garderie|collégien|collegien|lycéen|lyceen|écolier|ecolier',
  'élève|eleve|collège|college|lycée|lycee|école|ecole|maternelle',
  'minor|teen|teenager|juvenile|child|children|toddler|infant|baby|babies',
  'schoolboy|schoolgirl|pupil|high school|kindergarten|daycare|nursery',
].join('|'), 'i');

const AGE_PATTERNS = [
  // ATTENTION : pas de \b sur les motifs hebreux. En JavaScript, \b se fonde
  // sur [A-Za-z0-9_] ; les lettres hebraiques n'en font pas partie, donc \b
  // empeche toute correspondance. Les prefixes (ל, ה, כ, ש, מ, ו) se collent
  // au mot : « לבן 15 », « כבן 32 » — on ne peut donc pas ancrer a gauche.
  /(?:בן|בת|בני|בנות|גיל)\s*ה?\s*-?\s*(\d{1,2})/g,
  /(\d{1,2})\s*ו-\s*\d{1,2}/g,                       // « בנות 8 ו-10 »
  /\b(?:âg|ag)[ée]e?s?\s+de\s+(\d{1,2})\s*ans?\b/gi,
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
      // On examine tous les nombres captures par le motif, pas seulement le premier
      for (let g = 1; g < m.length; g++) {
        const age = parseInt(m[g], 10);
        if (!Number.isNaN(age) && age > 0 && age < 18) return true;
      }
      // Filet de securite : tout nombre de 1 a 17 accole a un mot d'age
      const nums = (m[0].match(/\d{1,2}/g) || []).map(Number);
      if (nums.some((n) => n > 0 && n < 18)) return true;
    }
  }
  return false;
}

// --- 6. Rubrique du site (pour l'affichage par thème) ------------------------
function theme(title, link) {
  const s = title + ' ' + link;
  if (/מאפיה|פשיעה מאורגנת|ארגון פשיעה|חיסול|סחיטה|הלבנת הון|mafia|organized crime|crime family|extortion|money launder/i.test(s)) return 'crime-organise';
  if (/גזר דין|הכרעת דין|כתב אישום|בית משפט|הורשע|זוכה|נדון ל|פרקליטות|verdict|sentenc|convict|acquit|indict|court|prosecut|trial/i.test(s)) return 'justice';
  if (/משטרה|נעצר|מעצר|שוטר|להב 433|ימ"ר|police|arrest|detain|officer|lahav/i.test(s)) return 'police';
  if (/חקירה|תעלומה|נעדר|תיק סגור|enquête|investigation|cold case|missing|mystery/i.test(s)) return 'enquetes';
  if (/אלימות במשפחה|התעללות|הטרדה|abuse|domestic|harassment|neglect/i.test(s)) return 'societe';
  return 'faits-divers';
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
        // Certains editeurs (Cloudflare) refusent les UA de robot sur des flux
        // pourtant publics. On presente alors un UA de navigateur standard.
        'User-Agent': src.browser
          ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
          : 'KtavIchoumBot/4.0 (+https://ktavichoum.vercel.app)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        'Accept-Language': 'fr,he,en;q=0.8',
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


// --- Traduction des titres en francais ---------------------------------------
// Necessite la variable d'environnement ANTHROPIC_API_KEY dans Vercel.
// Sans cle, le fil fonctionne : les titres restent dans leur langue d'origine.
async function traduire(items) {
  const key = process.env.ANTHROPIC_API_KEY;
  const aTraduire = items.filter((x) => x.lang !== 'fr');
  if (key && /[^\x20-\x7E]/.test(key)) {
    return { traduits: 0, raison: 'ANTHROPIC_API_KEY contient un caractere non-ASCII (souvent un tiret long — introduit par un correcteur automatique). Ressaisir la cle dans Vercel.' };
  }
  if (!key || !aTraduire.length) return { traduits: 0, raison: key ? 'rien a traduire' : 'ANTHROPIC_API_KEY absente' };

  try {
    const liste = aTraduire.map((x, i) => `${i}. ${x.title}`).join('\n');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: "Tu traduis en francais des titres de presse judiciaire israelienne. Registre sobre, factuel, sans sensationnalisme. Conserve le vocabulaire de la presomption d'innocence (suspecte, mis en cause, presume). Ne traduis pas les noms propres. Reponds UNIQUEMENT par un tableau JSON de chaines, dans l'ordre, sans preambule ni balises de code.",
        messages: [{ role: 'user', content: liste }],
      }),
    });
    if (!r.ok) return { traduits: 0, raison: 'API HTTP ' + r.status };

    const data = await r.json();
    const brut = (data.content || []).map((b) => b.text || '').join('').replace(/```json|```/g, '').trim();
    const tab = JSON.parse(brut);
    if (!Array.isArray(tab)) return { traduits: 0, raison: 'reponse inattendue' };

    let n = 0;
    aTraduire.forEach((x, i) => {
      if (typeof tab[i] === 'string' && tab[i].trim()) {
        x.titleOrig = x.title;
        x.title = tab[i].trim();
        n++;
      }
    });
    return { traduits: n, raison: 'ok' };
  } catch (e) {
    return { traduits: 0, raison: String(e.message || e) };
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
          theme: theme(it.title, it.link),
          pubDate: new Date(t).toISOString(),
          viaRubrique: parRubrique,   // true = classé judiciaire par l'éditeur
        });
      }
    }

    items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    // Traduction en francais des titres hebreux et anglais retenus
    const trad = await traduire(items.slice(0, MAX_ITEMS));

    const payload = {
      ok: true,
      updated: new Date().toISOString(),
      fenetre: WINDOW_HOURS + 'h',
      attribution: "Titres de la presse israélienne, liens vers les éditeurs. Ktav Ichoum n'en est pas l'auteur.",
      count: Math.min(items.length, MAX_ITEMS),
      // Format attendu par le front : fr = liste principale, il = presse hébraïque
      fr: items.slice(0, MAX_ITEMS),
      il: items.filter((x) => x.lang === 'he').slice(0, 15),
      items: items.slice(0, MAX_ITEMS),   // alias
    };

    if (debug) {
      payload.debug = {
        stats,
        traduction: trad,
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
    res.status(200).json({ ok: false, error: String(e), fr: [], il: [], items: [] });
  }
}
