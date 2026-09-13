// ⚠️ CE FICHIER N'ÉTAIT PAS DANS L'ARCHIVE QUE TU M'AS ENVOYÉE — reconstruit.
// Je n'ai pas pu le tester contre une vraie session WhatsApp (pas d'accès réseau
// dans mon environnement, et pas ton compte).
//
// index.js = juste un point d'entrée : charge les commandes, démarre le serveur
// HTTP (sert main.html + /code pour le pairing), branche lib/whatsapp.js
// (connexion) et lib/messageHandler.js (traitement des messages).

const fs = require('fs');
const path = require('path');
const express = require('express');

const { installErrorGuard } = require('./lib/errorGuard');
const { startCleanupLoop } = require('./lib/cleanup');
const { startMessageStoreCleanup } = require('./lib/messageStore');
const { startWhatsApp } = require('./lib/whatsapp');
const { createMessageHandler } = require('./lib/messageHandler');

installErrorGuard();
startCleanupLoop();
startMessageStoreCleanup();

// ---- Chargement dynamique des commandes ----
const commands = new Map();
const commandsDir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsDir)) {
    if (!file.endsWith('.js')) continue;
    try {
        const command = require(path.join(commandsDir, file));
        if (!command?.name || typeof command.execute !== 'function') continue;
        commands.set(command.name, command);
        for (const alias of command.aliases || []) commands.set(alias, command);
    } catch (e) {
        console.error(`❌ Impossible de charger commands/${file} :`, e.message);
    }
}
console.log(`✅ ${commands.size} commande(s)/alias chargé(s) depuis /commands`);

const handleMessage = createMessageHandler(commands);

// ---- Serveur HTTP : sert main.html + l'endpoint /code attendu par le pairing ----
const app = express();
app.use(express.static(__dirname));

let activeSock = null;

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'main.html')));

app.get('/code', async (req, res) => {
    try {
        const number = String(req.query.number || '').replace(/[^0-9]/g, '');
        if (!number) return res.status(400).json({ error: 'Numéro manquant' });
        if (!activeSock) return res.status(503).json({ error: 'Bot pas encore prêt' });
        const code = await activeSock.requestPairingCode(number);
        res.json({ code });
    } catch (e) {
        console.error('❌ Erreur /code :', e.message);
        res.status(500).json({ error: 'Service Unavailable' });
    }
});

// Health check simple pour Render/Railway/Koyeb
app.get('/health', (req, res) => res.status(200).send('ok'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Serveur HTTP sur le port ${PORT}`));

startWhatsApp(handleMessage)
    .then((sock) => { activeSock = sock; })
    .catch((e) => console.error('❌ Erreur démarrage bot :', e.message));
