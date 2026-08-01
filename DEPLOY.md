# Déploiement — KTAV ICHOUM

Site **statique** (HTML/CSS/JS, sans serveur). Il se déploie en quelques minutes sur n'importe quel hébergeur de sites statiques. Trois routes, de la plus rapide à la plus durable.

---

## Route 1 — Netlify Drop (le plus rapide, ~2 min, sans Git)

1. Aller sur **https://app.netlify.com/drop**
2. Glisser-déposer le **dossier** du site (ou décompresser `ktav-ichoum-site.zip` et déposer son contenu).
3. Netlify publie immédiatement une URL du type `https://nom-aléatoire.netlify.app`.
4. Créer un compte (gratuit) pour conserver le site, le renommer, et brancher un domaine.

> `netlify.toml` et `_redirects` sont déjà inclus (cache des assets + page 404).

---

## Route 2 — GitHub + Netlify/Vercel (recommandé : déploiement continu)

Chaque `git push` redéploie automatiquement.

```bash
# dans le dossier du site
git init && git add -A && git commit -m "KTAV ICHOUM — site v1"
# créer un repo vide sur github.com puis :
git remote add origin https://github.com/<ton-compte>/ktav-ichoum.git
git branch -M main && git push -u origin main
```

Ensuite, sur **Netlify** ou **Vercel** : *Add new site → Import from Git → sélectionner le repo*.
- Build command : *(vide)*
- Publish directory : `.` (racine)

`vercel.json` (URLs propres + cache) est déjà présent pour Vercel.

---

## Route 3 — Vercel CLI (déploiement en une commande)

```bash
npm i -g vercel
vercel            # préproduction
vercel --prod     # production
```

---

## Autres hébergeurs compatibles (mêmes fichiers)

- **Cloudflare Pages** : connecter le repo, build vide, output `/`. (CDN + protection incluses.)
- **GitHub Pages** : activer *Settings → Pages → Deploy from branch `main` / dossier `/`*. Pour un domaine perso, ajouter un fichier `CNAME` contenant le domaine.

---

## Nom de domaine

1. Acheter le domaine (OVH, Gandi, Namecheap, Cloudflare Registrar…). Suggestions : `ktavichoum.com`, `ktav-ichoum.com`, `ktavichoum.fr`.
2. Dans l'hébergeur (Netlify/Vercel) : *Domain settings → Add custom domain*.
3. Configurer le DNS chez le registrar :
   - Enregistrement **A** `@` → l'IP fournie par l'hébergeur, **ou**
   - Enregistrement **CNAME** `www` → la cible fournie (ex. `cname.vercel-dns.com` / `<site>.netlify.app`).
4. Le **HTTPS** (certificat) est automatique et gratuit (Let's Encrypt) une fois le DNS propagé.

---

## Après la mise en ligne (checklist)

- [ ] Remplacer l'URL dans `robots.txt` et `sitemap.xml` par le domaine réel.
- [ ] Vérifier le site sur **PageSpeed Insights** (Core Web Vitals).
- [ ] Déclarer le site dans **Google Search Console** + soumettre `sitemap.xml`.
- [ ] Brancher l'analytics (GA4 / Plausible).
- [ ] Renseigner les pages légales (Mentions légales, Confidentialité, CGU, Charte éthique).

> Rappel : le contenu actuel est une **revue de presse** (résumés factuels + liens vers les sources). Pour de la publication à grande échelle, prévoir le CMS et le pipeline de traduction/validation décrits dans le cahier des charges.
