# KING-MD

KING-MD est un bot WhatsApp contrôlé par une interface Telegram pour générer les Pair Codes.

## Utilisation Telegram

1. Configure `TELEGRAM_BOT_TOKEN` dans les variables d’environnement du serveur.
2. Démarre le projet avec `npm install` puis `npm start`.
3. Ouvre `@the_KingMD_Bot` sur Telegram.
4. Utilise `/pair 509XXXXXXXX` avec ton numéro WhatsApp, sans `+`.
5. Le Pair Code est envoyé uniquement dans le chat Telegram qui a fait la demande.

## Sécurité

- Ne mets jamais le token Telegram dans le code source.
- Ne commit jamais `.env`.
- Ne partage jamais un Pair Code ou une session WhatsApp.
- Le dossier `session/` contient des identifiants sensibles.

## Limitation du déploiement

Les sessions WhatsApp sont stockées dans `session/`. Sur un hébergeur avec système de fichiers éphémère, une nouvelle instance/redéploiement peut supprimer ces sessions et nécessiter un nouveau pairing.
