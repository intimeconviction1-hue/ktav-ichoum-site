# Mettre la newsletter en service

Le formulaire appelle `POST /api/subscribe`. Il ne confirme l'inscription que
si un contact a été créé dans le segment Resend choisi. Sans configuration,
l'API renvoie une erreur explicite et n'enregistre aucune adresse.

1. Dans Resend, créer un segment `Ktav Ichoum` et une clé API autorisée à gérer
   les contacts. Ne jamais ajouter la clé au dépôt.
2. Dans le projet Vercel qui sert `ktavichoum.vercel.app`, définir les variables
   d'environnement `RESEND_API_KEY` et `RESEND_SEGMENT_ID` (ID du segment),
   pour Production et Preview selon le besoin.
3. Redéployer après la configuration, puis tester une adresse contrôlée par la
   rédaction et vérifier sa présence dans le segment avant de communiquer sur
   la lettre. Ne pas tester avec l'adresse d'un tiers.
4. Préparer le premier envoi et son lien de désinscription dans Resend Broadcasts.

Une adresse déjà présente ne doit pas être réactivée automatiquement : l'API
renvoie une réponse distincte pour les doublons. Le code ne programme aucun
envoi automatique ; la périodicité affichée est donc « à leur parution ».
