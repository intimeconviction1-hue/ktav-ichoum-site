// KTAV ICHOUM — Agrégateur multi-sources (phase 3)
// Interroge la presse criminelle israélienne via Google Actualités.
// La presse israélienne (hébreu) est FRAÎCHE chaque jour : on la traduit
// automatiquement en français et on la fusionne dans le fil principal.
//   fr[] : fil principal en français (dépêches FR + presse israélienne traduite),
//          classé par thème, trié du plus récent au plus ancien.
//   il[] : presse israélienne en langue source (titres hébreux + média).
// Aucune clé requise. Cache CDN 10 min.

const FR_QUERY =
  '(Israël OR israélien OR "Tel-Aviv" OR Jérusalem OR Haïfa) ' +
  '(meurtre OR homicide OR assassinat OR "fait divers" OR fusillade OR poignardé OR abattu OR ' +
  'police OR arrestation OR interpellé OR enquête OR justice OR procès OR condamné OR inculpé OR ' +
  'crime OR gang OR mafia OR trafic OR agression OR disparition OR "règlement de comptes") ' +
  '-Gaza -Hamas -Hezbollah -guerre -otages -roquette -frappe -militaire';

// Requête en hébreu : fait remonter Ynet, Mako, Haaretz, Walla, Maariv, Kan, etc.
const IL_QUERY =
  '(רצח OR ירי OR פשע OR משטרה OR מעצר OR "כתב אישום" OR נאשם OR שוד OR סמים OR אלימות OR חשוד OR גופה OR דקירה) ' +
  'ישראל -עזה -חמאס -חיזבאללה -מלחמה';

function feedUrl(q, lang, ceid) {
  return 'https://news.google.com/rss/search?q=' + encodeURIComponent(q) +
    '&hl=' + lang + '&gl=IL&ceid=' + ceid;
}

function decode(s = '') {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '').trim();
}

function parse(xml) {
  const items = [];
  const blocks = xml.split('<item>').slice(1);
  for (const b of blocks) {
    const chunk = b.split('</item>')[0];
    const g = (re) => { const m = chunk.match(re); return m ? m[1] : ''; };
    let title = decode(g(/<title>([\s\S]*?)<\/title>/));
    const link = decode(g(/<link>([\s\S]*?)<\/link>/));
    const pubDate = g(/<pubDate>([\s\S]*?)<\/pubDate>/).trim();
    let source = decode(g(/<source[^>]*>([\s\S]*?)<\/source>/));
    if (!source && title.includes(' - ')) {
      const parts = title.split(' - ');
      source = parts[parts.length - 1];
      title = parts.slice(0, -1).join(' - ');
    } else if (source && title.endsWith(' - ' + source)) {
      title = title.slice(0, -(source.length + 3));
    }
    if (title && link) items.push({ title, link, source, pubDate });
  }
  return items;
}

// Classement par thème (mots-clés FR). Premier motif trouvé = thème.
const THEMES = [
  ['crime-organise', /crime organis|mafia|gang|clan|grenade|r[eè]glement de comptes|parrain|racket|extorsion|fusillade|abattu|balle|kalach|voiture pi[eé]g|explos|assassin|r[eé]seau|trafic|drogue|blanchiment/i],
  ['justice',        /proc[eè]s|condamn|verdict|cour supr[eê]me|inculp|tribunal|prison|peine|justice|magistrat|juge|accus[eé]|d[eé]tention|extrad|mis en examen|r[eé]clusion|jug[eé]/i],
  ['enquetes',       /disparition|disparu|enqu[eê]te|non [eé]lucid|cold case|recherche|corps retrouv|myst[eè]re|introuvable/i],
  ['societe',        /communaut[eé] arabe|arabe|b[eé]douin|statistiques|victimes|soci[eé]t[eé]|pr[eé]vention|ambassade|manifest|record|homicides|alerte|violence/i],
  ['faits-divers',   /meurtre|homicide|poignard|agression|tu[eé]|couteau|viol|corps|cadavre|mort|bless/i],
  ['police',         /police|arrestation|interpell|coup de filet|saisie|shin bet|gardes?-fronti[eè]re|op[eé]ration|perquisit|d[eé]mantel/i],
];
function classify(title) {
  for (const [name, re] of THEMES) if (re.test(title)) return name;
  return 'faits-divers';
}

async function fetchFeed(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 7000);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KtavIchoumBot/1.0)' },
    });
    if (!r.ok) return [];
    return parse(await r.text());
  } catch (e) { return []; }
  finally { clearTimeout(t); }
}

// Traduction hébreu -> français via l'endpoint gratuit de Google Traduction.
// Si ça échoue, on garde le titre hébreu (le fil reste alimenté).
async function translateHe(text) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4500);
  try {
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=iw&tl=fr&dt=t&q='
      + encodeURIComponent(text);
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return null;
    const data = await r.json();
    if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
    const out = data[0].map((s) => (s && s[0]) ? s[0] : '').join('').trim();
    return out || null;
  } catch (e) { return null; }
  finally { clearTimeout(t); }
}

export default async function handler(req, res) {
  try {
    const byDate = (a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0);

    const [frRaw, ilRaw] = await Promise.all([
      fetchFeed(feedUrl(FR_QUERY, 'fr', 'FR:fr')),
      fetchFeed(feedUrl(IL_QUERY, 'iw', 'IL:iw')),
    ]);

    // Presse israélienne, la plus fraîche d'abord (titres hébreux conservés).
    const ilSorted = ilRaw.sort(byDate);
    const il = ilSorted.slice(0, 20);

    // On traduit les 28 dépêches israéliennes les plus fraîches en français,
    // pour les injecter dans le fil principal.
    const ilTop = ilSorted.slice(0, 28);
    const ilTranslated = await Promise.all(ilTop.map(async (it) => {
      const fr = await translateHe(it.title);
      const title = fr || it.title;
      return { title, link: it.link, source: it.source, pubDate: it.pubDate, theme: classify(title) };
    }));

    // Dépêches francophones classiques.
    const frClassic = frRaw.map((it) => ({ ...it, theme: classify(it.title) }));

    // Fusion FR classiques + presse israélienne traduite, dédoublonnage, tri par date.
    const seen = new Set();
    const merged = [];
    for (const it of [...ilTranslated, ...frClassic]) {
      const k = (it.title || '').slice(0, 55).toLowerCase();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      merged.push(it);
    }
    merged.sort(byDate);

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({
      ok: true,
      updated: new Date().toISOString(),
      counts: { fr: merged.length, il: il.length },
      fr: merged.slice(0, 45),
      il,
    });
  } catch (e) {
    res.setHeader('Cache-Control', 's-maxage=60');
    res.status(200).json({ ok: false, error: String(e), fr: [], il: [] });
  }
}
