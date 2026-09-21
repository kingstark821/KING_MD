// KING-MD — point d’entrée du bot WhatsApp + interface Telegram Pair Code
const fs = require('fs');
const path = require('path');
const express = require('express');

const { installErrorGuard } = require('./lib/errorGuard');
const { startCleanupLoop } = require('./lib/cleanup');
const { startMessageStoreCleanup } = require('./lib/messageStore');
const { startWhatsApp } = require('./lib/whatsapp');
const { createMessageHandler } = require('./lib/messageHandler');
const { createTelegramBot } = require('./lib/telegram');

installErrorGuard();
startCleanupLoop();
startMessageStoreCleanup();

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
console.log(`✅ ${commands.size} commande(s)/alias chargé(s)`);

const handleMessage = createMessageHandler(commands);

// Petit serveur HTTP pour Render/Koyeb et le health check.
const app = express();
app.get('/health', (req, res) => res.status(200).json({ ok: true, service: 'KING-MD Telegram Pair Code' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Health server sur le port ${PORT}`));

// Telegram devient l’interface de Pair Code.
createTelegramBot(handleMessage);

// Si SESSION_NUMBER est configuré, on conserve aussi le mode WhatsApp direct
// pour compatibilité avec une ancienne session unique.
if (process.env.SESSION_NUMBER) {
    startWhatsApp(handleMessage, process.env.SESSION_NUMBER)
        .catch((e) => console.error('❌ Erreur session WhatsApp directe :', e.message));
}
