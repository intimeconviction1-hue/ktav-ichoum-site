# KTAV ICHOUM — Maquette de site (prototype déployable)

Média francophone : faits divers israéliens, enquêtes criminelles (true crime), justice, police, cold cases.

Ceci est une **maquette front-end statique** (HTML/CSS/JS, sans framework, sans dépendance) qui matérialise la charte, la structure et les composants clés. Le contenu est **fictif** (démonstration). Elle sert de base concrète pour le développement de la plateforme complète décrit dans le cahier des charges.

## Contenu

```
index.html          Page d'accueil (Une, actus, enquête du jour, vidéos, podcast, rubriques, cold cases, newsletter)
rubrique.html       Page de catégorie (filtres, grille, pagination)
article.html        Template article (chapô, sommaire, encadrés, citation, galerie, partage, liés, commentaires)
404.html            Page d'erreur
assets/styles.css   Design system complet (tokens, dark/light, responsive)
assets/app.js       Interactions (thème, menu mobile, recherche, newsletter, barre de lecture)
robots.txt / sitemap.xml / netlify.toml   Fichiers de déploiement / SEO
standalone/         Mêmes pages en versions autonomes (CSS+JS intégrés dans chaque fichier)
```

## Tester en local

Ouvrir `index.html` dans un navigateur, ou servir le dossier :

```bash
npx serve .        # ou : python3 -m http.server 8000
```

## Déployer (site statique)

- **Netlify** : glisser-déposer le dossier sur app.netlify.com/drop (le `netlify.toml` est inclus).
- **Vercel** : `vercel` à la racine, ou import du repo Git.
- **GitHub Pages** : pousser le dossier, activer Pages sur la branche `main`.
- **Cloudflare Pages** : connecter le repo, build command vide, output `/`.

## Charte (rappel)

| Rôle | Valeur |
|---|---|
| Fond (dark) | `#0B0B0D` |
| Bordeaux « dossier » (primaire) | `#8A1220` |
| Rouge alerte / breaking | `#E11D2E` |
| Or premium (accent rare) | `#C9A227` |
| Crème dossier | `#F4F1EA` |
| Display | Archivo (700–900) |
| Lecture / articles | Newsreader (serif) |
| Interface | Inter |

## Suite (cf. cahier des charges)

Cette maquette couvre le front vitrine. La plateforme cible ajoute : CMS/back-office, espace membre & paywall, recherche, monétisation (AdSense/direct/abonnements), newsletter automatisée, fonctionnalités IA, et une stack Next.js + CMS headless. Voir le document « Cahier des charges ».
