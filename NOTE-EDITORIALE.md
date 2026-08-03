# KTAV ICHOUM — Note éditoriale

**Version 1 — 3 août 2026** · Document de référence. Remplace le « cahier des charges » jamais rédigé.
Budget de production arrêté : **10 heures par semaine.**

---

## 1. Positionnement

**Le récit judiciaire israélien en français, établi à partir des sources hébraïques.**

Ktav Ichoum ne relaie pas l'actualité criminelle israélienne : il la raconte. La matière première — verdicts, actes d'accusation, comptes rendus d'audience, presse judiciaire israélienne — existe presque exclusivement en hébreu et n'est jamais traduite pour un lectorat francophone. C'est là, et nulle part ailleurs, qu'est l'avantage.

Trois principes qui en découlent :

- **On travaille sur des décisions rendues**, pas sur des enquêtes en cours. Un jugement est une source, une rumeur n'en est pas une.
- **Le Récit est le produit ; le fil est un service.** Times of Israël FR, i24 FR et JForum couvrent déjà l'actualité. Ce qui distingue Ktav Ichoum, c'est le récit long établi sur sources hébraïques — pas le fil. Le fil donne au site un pouls quotidien et une raison de revenir ; il ne porte pas la valeur.
- **La formule « revue de presse » est abandonnée.** Elle est juridiquement inexacte (art. L. 122-5 CPI) et éditorialement fausse. Mention retenue partout : *synthèses et récits originaux en français, sourcés*.

**Le fil en direct est conservé, sous cinq conditions de forme :**

1. **Flux RSS natifs des éditeurs** (Ynet, Haaretz, Israel Hayom, Walla, Times of Israël), et non Google Actualités — accès licite, stable, et liens pointant vers l'article réel.
2. **Titres seuls.** Titre, source, horodatage, lien. Aucun chapô, aucune reformulation, aucune traduction éditorialisée : le fil reste dans l'exception du lien hypertexte.
3. **Quarantaine mineurs automatique.** Toute dépêche mentionnant un mineur — par le vocabulaire ou par l'âge — est écartée sans intervention humaine.
4. **Éphémère.** Fenêtre de 24 heures, aucun archivage, en-tête `noindex, noarchive, nosnippet`. Rien ne persiste, donc rien ne crée de dette de déréférencement.
5. **Attribution explicite** sous le fil : « Titres de la presse israélienne, liens vers les éditeurs. Ktav Ichoum n'en est pas l'auteur. »

**Le fil ne consomme pas le budget de production.** Une fois refondu, il tourne seul. Toute reprise du chantier — nouvelle source, classement, mise en page — se prélève sur la réserve d'une heure, jamais sur les six heures d'écriture.

---

## 2. Trois formats

**Le Récit** — 8 000 à 12 000 signes · 1 par semaine · ~6 h
Une affaire jugée, racontée du fait initial au prononcé. Sourcée sur le jugement et sur au moins deux médias israéliens. Structure de dossier : les faits, l'enquête, l'audience, la décision, ce que l'affaire dit du pays. C'est le format signature — le seul que personne d'autre ne produit.

**La Brève annotée** — 2 000 à 3 000 signes · 2 par semaine · ~45 min pièce
Une décision, un chiffre, une réforme. Traduite, datée, remise en contexte. Pas de dépêche brute : la valeur ajoutée est l'annotation, pas l'information.

**Le Dossier** — série de 3 à 5 volets · 1 par trimestre
Cold case ou grande affaire d'archives. Se construit par accumulation de Récits déjà publiés, ne mobilise donc pas de budget propre. Format destiné au podcast et, à terme, au livre.

---

## 3. Cadence

| | Volume | Temps |
|---|---|---|
| Récit hebdomadaire | 1 | 6 h |
| Brèves annotées | 2 | 1 h 30 |
| Veille (presse judiciaire israélienne) | — | 1 h |
| Conformité, déréférencement, administration | — | 30 min |
| Réserve | — | 1 h |
| **Total** | | **10 h** |

**Publication le vendredi.** Un jour fixe, tenu. Une cadence irrégulière tue une audience plus sûrement qu'une cadence lente.

**Palier de décision :** aucun investissement d'infrastructure — CMS, paywall, espace membre, nom de domaine, régie publicitaire — avant **douze Récits publiés**, soit trois mois. Si la cadence ne tient pas sur douze semaines, elle ne tiendra pas davantage avec un CMS.

---

## 4. Mentions légales obligatoires

À mettre en ligne **avant toute publication**. Défaut de mentions : 1 an d'emprisonnement et 75 000 € (art. 6 VI LCEN).

**Page « Mentions légales »** — art. 6 III LCEN
- Éditeur : dénomination sociale, forme juridique, siège, RCS, capital
- **Directeur de la publication** nommément désigné
- Hébergeur : dénomination, adresse, téléphone
- Contact rédaction

**Page « Confidentialité »** — RGPD
- Finalités, base légale, durées de conservation
- Droits d'accès, rectification, effacement, opposition ; adresse dédiée
- Droit de réclamation auprès de la CNIL
- Mention du traitement de données relatives aux infractions (art. 10 RGPD), fondé sur l'exception journalistique (art. 80 loi Informatique et Libertés)

**Page « Charte éthique »** — ce n'est pas un ornement : c'est la pièce qui fonde l'exception journalistique. Elle doit énoncer le travail sur décisions rendues, le sourcing systématique, le contradictoire, le droit de réponse.

**Corrections techniques préalables :** suppression des images `loremflickr` (aucune licence vérifiée) ; auto-hébergement des trois polices Google ; suppression du dossier `.git` parasite du répertoire déployé.

---

## 5. Procédure mineurs et déréférencement

C'est le point d'exposition principal de la ligne éditoriale. Il se traite par une règle et une procédure.

**La règle — mineurs.** Aucun élément permettant d'identifier un mineur poursuivi, jugé ou victime n'est publié : ni nom, ni initiales, ni photographie, ni commune de résidence, ni établissement scolaire, ni combinaison de détails rendant l'identification possible (art. L. 513-4 CJPM ; art. 39 bis loi 1881). L'âge seul est admis. Cette règle vaut aussi pour les personnes mineures **au moment des faits**, quel que soit leur âge au jugement. Aucune exception, aucun arbitrage au cas par cas.

Dans le fil en direct, cette règle est appliquée par filtre automatique : toute dépêche mentionnant un mineur, ou un âge inférieur à 18 ans, est écartée avant affichage. Le filtre est délibérément large — un faux positif coûte une dépêche, un faux négatif coûte une infraction. Il n'est jamais assoupli pour gagner en volume.

**Trois autres interdits permanents :** publier un acte d'accusation avant sa lecture en audience publique (art. 38 loi 1881) ; diffuser l'image d'une personne menottée ou identifiée comme mise en cause avant condamnation (art. 35 quater) ; présenter comme coupable une personne non condamnée (art. 9-1 c. civ.). Le vocabulaire de la présomption — *suspecté, mis en cause, présumé* — est obligatoire jusqu'au prononcé.

**La procédure — déréférencement.** Adresse dédiée publiée en pied de page. Réponse motivée sous un mois (art. 12 RGPD). Toute demande, acceptée ou refusée, est consignée dans un registre avec sa motivation.

Anonymisation **de droit**, sans examen d'opportunité :
- relaxe, acquittement, non-lieu, classement sans suite
- personne mineure au moment des faits
- personne citée sans être mise en cause (témoin, proche, voisin)

Anonymisation **après examen**, au regard de l'ancienneté des faits, de la peine exécutée, de la notoriété de la personne et de l'intérêt informationnel subsistant. Le critère directeur est celui dégagé par la CJUE (*GC e.a. c/ CNIL*, C-136/17) : les données pénales appellent une protection renforcée, et le temps écoulé érode l'intérêt du public.

**Méthode :** on anonymise, on ne supprime pas. Le nom est remplacé, une note de mise à jour datée est ajoutée en pied d'article, la page passe en `noindex` si nécessaire. L'article demeure ; la personne en sort. Ce qui protège à la fois le sujet et l'archive.

---

## Ce qui est décidé

1. Le fil en direct est refondu selon les cinq conditions de la section 1 ; la mention « revue de presse » disparaît du site.
2. Les trois pages légales et la charte éthique sont en ligne avant le premier article.
3. Un Récit par semaine, le vendredi, à partir du premier vendredi utile.
4. Aucun investissement d'infrastructure avant douze Récits publiés.
5. Aucun autre projet n'est ouvert avant ces douze Récits.
