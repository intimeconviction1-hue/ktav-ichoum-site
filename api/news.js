// KTAV ICHOUM — Fil en direct
// Fonction serverless Vercel : agrège les dernières affaires (faits divers / justice
// en Israël) depuis Google Actualités RSS (français) et renvoie du JSON propre.
// Aucune clé requise. Mise en cache 10 min au niveau du CDN Vercel.

const QUERY =
  '(Israël OR israélien OR "Tel-Aviv" OR Jérusalem OR Haïfa) ' +
  '(meurtre OR homicide OR assassinat OR "fait divers" OR fusillade OR poignardé OR abattu OR ' +
  'police OR arrestation OR interpellé OR enquête OR justice OR procès OR condamné OR inculpé OR ' +
  'crime OR gang OR mafia OR trafic OR agression OR disparition OR "règlement de comptes") ' +
  '-Gaza -Hamas -Hezbollah -guerre -otages -roquette -frappe -militaire';

const FEED =
  'https://news.google.com/rss/search?q=' +
  encodeURIComponent(QUERY) +
  '&hl=fr&gl=FR&ceid=FR:fr';

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
    // Google formate souvent « Titre - Source » : on isole la source si absente
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

export default async function handler(req, res) {
  try {
    const r = await fetch(FEED, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KtavIchoumBot/1.0)' },
    });
    if (!r.ok) throw new Error('feed ' + r.status);
    const xml = await r.text();
    const items = parse(xml).slice(0, 15);
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ ok: true, count: items.length, updated: new Date().toISOString(), items });
  } catch (e) {
    res.setHeader('Cache-Control', 's-maxage=60');
    res.status(200).json({ ok: false, error: String(e), items: [] });
  }
}
