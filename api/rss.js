/**
 * /api/rss — Flux RSS sortant de KTAV ICHOUM.
 *
 * Republie le fil des faits divers israeliens traduit en francais.
 * Ne duplique pas la logique de collecte : s'appuie sur /api/feed.
 *
 * Regime juridique : titre traduit + lien vers l'editeur d'origine, rien d'autre.
 * Aucun chapo, aucun extrait, aucune image. Le flux est un index, pas une reprise.
 */

const SITE = 'https://ktavichoum.vercel.app';

const RUBRIQUES = {
  'crime-organise': 'Crime organisé',
  'justice': 'Justice',
  'police': 'Police',
  'enquetes': 'Enquêtes',
  'societe': 'Société',
  'faits-divers': 'Faits divers'
};

function xmlEscape(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // Caracteres de controle interdits en XML 1.0
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

function rfc822(d) {
  const t = new Date(d);
  return isNaN(t.getTime()) ? new Date().toUTCString() : t.toUTCString();
}

/* Un titre reste en hebreu = la traduction a echoue : on ne le publie pas. */
function publiable(x) {
  return x && x.title && x.link && !/[\u0590-\u05FF]/.test(x.title);
}

export default async function handler(req, res) {
  const theme = (req.query && req.query.theme) || '';
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host;

  let items = [];
  try {
    const r = await fetch(`${proto}://${host}/api/feed`, {
      headers: { 'user-agent': 'ktav-ichoum-rss' }
    });
    const data = await r.json();
    items = Array.isArray(data && data.fr) ? data.fr.filter(publiable) : [];
  } catch (e) {
    items = [];
  }

  if (theme && RUBRIQUES[theme]) {
    items = items.filter((x) => x.theme === theme);
  }
  items = items.slice(0, 50);

  const suffixe = theme && RUBRIQUES[theme] ? ` — ${RUBRIQUES[theme]}` : '';
  const selfUrl = `${SITE}/api/rss${theme ? `?theme=${encodeURIComponent(theme)}` : ''}`;
  const dernier = items.length ? rfc822(items[0].pubDate) : new Date().toUTCString();

  const entries = items
    .map((it) => {
      const rubrique = RUBRIQUES[it.theme] || '';
      const editeur = it.source || 'presse israélienne';
      return [
        '    <item>',
        `      <title>${xmlEscape(it.title)}</title>`,
        `      <link>${xmlEscape(it.link)}</link>`,
        `      <guid isPermaLink="true">${xmlEscape(it.link)}</guid>`,
        `      <pubDate>${rfc822(it.pubDate)}</pubDate>`,
        rubrique ? `      <category>${xmlEscape(rubrique)}</category>` : '',
        `      <description>${xmlEscape(
          `Titre traduit de l'hébreu. Article publié par ${editeur} — lire chez l'éditeur d'origine.`
        )}</description>`,
        '    </item>'
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>KTAV ICHOUM — Le fil des faits divers israéliens${xmlEscape(suffixe)}</title>
    <link>${SITE}/fil</link>
    <atom:link href="${xmlEscape(selfUrl)}" rel="self" type="application/rss+xml"/>
    <description>Les titres de la presse criminelle et judiciaire israélienne, traduits de l'hébreu en français. Chaque lien renvoie à son éditeur d'origine ; Ktav Ichoum n'est pas l'auteur de ces articles.</description>
    <language>fr</language>
    <copyright>Titres traduits par Ktav Ichoum (FACILE PAPIERS SAS). Les articles liés appartiennent à leurs éditeurs respectifs.</copyright>
    <managingEditor>contact@facilepapiers.fr (David Castel)</managingEditor>
    <lastBuildDate>${dernier}</lastBuildDate>
    <ttl>30</ttl>
${entries}
  </channel>
</rss>`;

  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
  res.status(200).send(xml);
}
