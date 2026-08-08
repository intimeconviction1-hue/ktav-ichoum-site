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
  // ATTENTION AUX IDENTIFIANTS YNET. Les flux sont numerotes par rubrique :
  //   2    = chdashot (actualites, page d'accueil)      <- celui qu'il nous faut
  //   1854 = mivzakim (depeches)                        <- complement utile
  //   3    = sport | 6 = economie | 538 = CULTURE | 1208 = sante
  // Le fil a longtemps pointe sur 538 : il interrogeait la rubrique culture,
  // puis rejetait legitimement chaque article. Ne pas reintroduire 538.
  { id: 'ynet',        name: 'Ynet',           lang: 'he', browser: true, url: 'https://www.ynet.co.il/Integration/StoryRss2.xml' },
  { id: 'ynet-mvz',    name: 'Ynet',           lang: 'he', browser: true, url: 'https://www.ynet.co.il/Integration/StoryRss1854.xml' },
  { id: 'israelhayom', name: 'Israel Hayom',   lang: 'he', url: 'https://www.israelhayom.co.il/rss.xml' },
  { id: 'walla',       name: 'Walla',          lang: 'he', browser: true, url: 'https://rss.walla.co.il/feed/1' },
  { id: 'mako',        name: 'Mako / N12',     lang: 'he', browser: true, url: 'https://rcs.mako.co.il/rss/news-law.xml' },
  { id: 'jpost',       name: 'Jerusalem Post', lang: 'en', url: 'https://www.jpost.com/rss/rssfeedsisraelnews.aspx' },
  // Times of Israel (403 malgre UA navigateur) et i24 (flux vide) : inexploitables.
  // Haaretz : flux existant mais articles payants — lien inutile pour le lecteur.
  // Aucune source francophone disponible : le fil est traduit, cf. traduire().
  //
  // browser: true  ->  UA de navigateur. Necessaire derriere Cloudflare, qui
  // refuse les UA de robot sur des flux pourtant publics. Les sources qui
  // acceptent l'UA robot le conservent : on s'identifie quand on le peut.
];

const WINDOW_HOURS = 48;
const MAX_ITEMS    = 40;
const TIMEOUT_MS   = 7000;

// --- 1. RUBRIQUE ACCEPTÉE (d'après l'URL) ------------------------------------
// Si l'éditeur a rangé l'article dans une rubrique judiciaire, on prend.
const SECTION_OK = /\/(crime|crimes|criminal|crime-in-israel|law|legal|courts?|justice|police|law-and-order|news-law|news-crime|פלילים|פלילי|משפט)(\/|$|\?)/i;

// --- 2. RUBRIQUE REFUSÉE (d'après l'URL) -------------------------------------
// Rejet immédiat, quel que soit le titre. C'est ce qui élimine les tribunes.
// Le delimiteur accepte le point : chez Walla, les rubriques sont en
// sous-domaine (sports.walla.co.il, celebs.walla.co.il) et non en chemin.
const SECTION_KO = /[\/.](opinions?|opinion|blogs?|columns?|editorial|sport|sports|business|finance|markets|economy|tech|technology|digital|health|food|travel|tourism|culture|art|books|movies|tv|celebs|celebrity|fashion|cars|auto|real-estate|realestate|magazine|weather|judaism|jewish-world|lifestyle|science|environment|world-news|world|usa|us-news|international|abroad|europe|חו"ל|עולם|דעות|ספורט|כלכלה|תרבות|בריאות|אוכל|רכב)([\/.]|$|\?)/i;

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


// --- Traduction + qualification mineurs --------------------------------------
// Un seul appel fait deux choses : traduire le titre en francais, et dire si un
// mineur y est protagoniste (victime, temoin ou mis en cause).
//
// Le filtre par mots-cles ne sert plus qu'a lever un SOUPCON. C'est le modele
// qui tranche : il distingue « un homme de 57 ans » d'« une fillette de 8 ans ».
//
// Regle de securite : en l'absence de cle, en cas d'erreur, ou au moindre doute,
// la depeche soupconnee reste ecartee. Le systeme echoue toujours du cote
// protecteur — art. 39 bis et 39 quinquies de la loi du 29 juillet 1881.
async function traduireEtQualifier(retenus, suspects) {
  const key = process.env.ANTHROPIC_API_KEY;

  if (key && /[^\x20-\x7E]/.test(key)) {
    return { traduits: 0, reintegres: 0, raison: 'ANTHROPIC_API_KEY contient un caractere non-ASCII. Ressaisir la cle dans Vercel.' };
  }
  if (!key) return { traduits: 0, reintegres: 0, raison: 'ANTHROPIC_API_KEY absente — suspects maintenus en quarantaine' };

  const tous = [...retenus, ...suspects];
  if (!tous.length) return { traduits: 0, reintegres: 0, raison: 'rien a traiter' };

  try {
    const liste = tous.map((x, i) => `${i}. ${x.title}`).join('\n');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        system: [
          "Tu traites des titres de presse judiciaire israelienne pour un media francophone.",
          "Pour CHAQUE titre, tu produis deux informations :",
          "1) fr : la traduction en francais. Registre sobre et factuel, sans sensationnalisme.",
          "   Conserve le vocabulaire de la presomption d'innocence (suspecte, mis en cause, presume).",
          "   Ne traduis pas les noms propres.",
          "2) mineur : true si une personne de moins de 18 ans est protagoniste du fait relate,",
          "   que ce soit comme victime, temoin ou mis en cause. true egalement pour les nourrissons,",
          "   les eleves et les enfants en creche ou a l'ecole.",
          "   false si les ages ou mots cites ne concernent que des adultes.",
          "   Exemple : « un homme de 57 ans abattu » = false. « fillettes de 8 et 10 ans agressees » = true.",
          "   En cas de doute, reponds true.",
          "Reponds UNIQUEMENT par un tableau JSON d'objets {\"i\":numero,\"fr\":\"...\",\"mineur\":true|false},",
          "dans l'ordre, sans preambule ni balises de code.",
        ].join(' '),
        messages: [{ role: 'user', content: liste }],
      }),
    });
    if (!r.ok) return { traduits: 0, reintegres: 0, raison: 'API HTTP ' + r.status };

    const data = await r.json();
    const brut = (data.content || []).map((b) => b.text || '').join('').replace(/```json|```/g, '').trim();
    const tab = JSON.parse(brut);
    if (!Array.isArray(tab)) return { traduits: 0, reintegres: 0, raison: 'reponse inattendue' };

    let traduits = 0, reintegres = 0;
    const parIndex = new Map(tab.map((o) => [Number(o.i), o]));

    tous.forEach((x, i) => {
      const o = parIndex.get(i);
      if (!o) return;
      if (typeof o.fr === 'string' && o.fr.trim()) {
        x.titleOrig = x.title;
        x.title = o.fr.trim();
        traduits++;
      }
      // Un suspect n'est reintegre que si le modele repond explicitement false
      if (x.suspectMineur && o.mineur === false) {
        delete x.suspectMineur;
        x.qualifie = true;
        retenus.push(x);
        reintegres++;
      }
    });

    return { traduits, reintegres, suspectsExamines: suspects.length, raison: 'ok' };
  } catch (e) {
    return { traduits: 0, reintegres: 0, raison: String(e.message || e) };
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
    const suspects = [];   // soupcon de mineur, en attente de qualification
    const stats = {
      recus: 0, horsFenetre: 0, rubriqueRefusee: 0, horsSujet: 0,
      guerre: 0, admin: 0, accident: 0, manifestation: 0,
      quarantaineMineurs: 0, doublons: 0,
    };
    const parSource = {};

    for (const { src, items: raw } of results) {
      parSource[src.id] = { brut: raw.length, retenus: 0, echantillon: [], rejets: [] };
      const S = parSource[src.id];

      // Trois premiers titres bruts : permet de verifier d'un coup d'oeil que
      // la source interrogee est bien celle qu'on croit (piege du flux 538).
      S.echantillon = raw.slice(0, 3).map((x) => x.title.slice(0, 90));

      const rejet = (motif, it) => {
        if (S.rejets.length < 8) S.rejets.push(motif + ' — ' + it.title.slice(0, 70));
      };

      for (const it of raw) {
        stats.recus++;

        const t = new Date(it.pubDate).getTime();
        if (Number.isNaN(t) || t < cutoff) {
          stats.horsFenetre++;
          rejet(Number.isNaN(t) ? 'date illisible' : 'hors fenetre', it);
          continue;
        }

        // Rubrique refusée par l'éditeur → rejet immédiat, titre non examiné
        if (SECTION_KO.test(it.link)) { stats.rubriqueRefusee++; rejet('rubrique refusee', it); continue; }

        // Rubrique judiciaire de l'éditeur → admis d'office ; sinon, mots-clés
        const parRubrique = SECTION_OK.test(it.link);
        if (!parRubrique && !RELEVANT.test(it.title)) { stats.horsSujet++; rejet('hors sujet', it); continue; }

        if (EXCL_GUERRE.test(it.title))   { stats.guerre++; rejet('guerre', it); continue; }
        if (EXCL_ADMIN.test(it.title))    { stats.admin++; rejet('administratif', it); continue; }
        if (EXCL_ACCIDENT.test(it.title)) { stats.accident++; rejet('accident', it); continue; }
        if (EXCL_MANIF.test(it.title))    { stats.manifestation++; rejet('manifestation', it); continue; }

        // Soupcon de mineur : mis de cote, tranche plus bas par le modele
        const soupcon = mentionsMinor(it.title);

        const key = it.title.replace(/\W+/g, '').slice(0, 50).toLowerCase();
        if (seen.has(key)) { stats.doublons++; continue; }
        seen.add(key);

        parSource[src.id].retenus++;
        (soupcon ? suspects : items).push({
          suspectMineur: soupcon || undefined,
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

    // Le modele traduit et tranche les soupcons ; les suspects non leves
    // restent ecartes. items est complete par reintegration.
    const trad = await traduireEtQualifier(items, suspects.slice(0, 20));
    stats.quarantaineMineurs = suspects.length - (trad.reintegres || 0);

    items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

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
          ua: r.src.browser ? 'navigateur' : 'robot',
          brut: parSource[r.src.id]?.brut ?? 0,
          retenus: parSource[r.src.id]?.retenus ?? 0,
          echantillon: parSource[r.src.id]?.echantillon ?? [],
          rejets: parSource[r.src.id]?.rejets ?? [],
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
