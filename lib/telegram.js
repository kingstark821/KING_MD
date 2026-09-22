const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const { startWhatsApp, normalizeNumber } = require('./whatsapp');

function createTelegramBot(onMessage) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.error('❌ TELEGRAM_BOT_TOKEN manquant. Ajoute-le dans les variables d’environnement du serveur.');
        return null;
    }

    const bot = new TelegramBot(token, { polling: true });
    const sessions = new Map();
    const pending = new Map();
    const lastPairAt = new Map();

    const sessionRoot = path.join(__dirname, '..', 'session');
    if (fs.existsSync(sessionRoot)) {
        for (const entry of fs.readdirSync(sessionRoot, { withFileTypes: true })) {
            if (!entry.isDirectory() || !/^\d+$/.test(entry.name)) continue;
            startWhatsApp(onMessage, entry.name)
                .then((sock) => sessions.set(entry.name, sock))
                .catch((e) => console.error(`❌ Impossible de restaurer ${entry.name}:`, e.message));
        }
    }

    bot.setMyCommands([
        { command: 'start', description: 'Démarrer KING-MD' },
        { command: 'pair', description: 'Obtenir un Pair Code WhatsApp' },
        { command: 'status', description: 'Voir l’état du service' },
        { command: 'help', description: 'Afficher l’aide' },
    ]).catch(() => {});

    bot.onText(/^\/start(?:@\w+)?$/i, async (msg) => {
        await bot.sendMessage(msg.chat.id,
            '👑 *KING-MD*\n\nBienvenue. Ce bot Telegram sert d’interface pour connecter ton numéro WhatsApp à KING-MD.\n\nUtilise :\n`/pair 509XXXXXXXX`\n\nLe numéro doit être écrit avec l’indicatif pays, sans le `+`.',
            { parse_mode: 'Markdown' }
        );
    });

    bot.onText(/^\/help(?:@\w+)?$/i, async (msg) => {
        await bot.sendMessage(msg.chat.id,
            '👑 *KING-MD — Aide*\n\n`/pair 509XXXXXXXX` — demande un Pair Code WhatsApp.\n`/status` — vérifie que le service Telegram répond.\n\nN’envoie jamais ton code de connexion à quelqu’un d’autre.',
            { parse_mode: 'Markdown' }
        );
    });

    bot.onText(/^\/status(?:@\w+)?$/i, async (msg) => {
        await bot.sendMessage(msg.chat.id, '🟢 KING-MD est opérationnel.');
    });

    bot.onText(/^\/pair(?:@\w+)?(?:\s+(.+))?$/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const number = normalizeNumber(match?.[1] || '');

        if (!number || number.length < 8 || number.length > 15) {
            return bot.sendMessage(chatId, '❌ Numéro invalide. Exemple : `/pair 509XXXXXXXX`', { parse_mode: 'Markdown' });
        }

        const now = Date.now();
        const previous = lastPairAt.get(chatId) || 0;
        if (now - previous < 60000) {
            const seconds = Math.ceil((60000 - (now - previous)) / 1000);
            return bot.sendMessage(chatId, `⏳ Attends encore ${seconds}s avant de demander un nouveau code.`);
        }
        if (pending.has(number)) {
            return bot.sendMessage(chatId, '⏳ Une demande de Pair Code est déjà en cours pour ce numéro.');
        }

        pending.set(number, true);
        try {
            await bot.sendMessage(chatId, '⏳ Préparation de ton Pair Code WhatsApp…');

            let sock = sessions.get(number);
            if (!sock || sock.__pairingReady == null) {
                sock = await startWhatsApp(onMessage, number);
                sessions.set(number, sock);
            }

            // IMPORTANT: requestPairingCode() cannot be called immediately
            // after makeWASocket(). Wait until Baileys reports that the
            // socket is connecting/ready for authentication.
            if (sock.__pairingReady) {
                await sock.__pairingReady;
            }

            if (sock.authState?.creds?.registered) {
                throw new Error('Cette session WhatsApp est déjà connectée.');
            }

            const code = await sock.requestPairingCode(number);
            const formatted = String(code).replace(/(.{4})/g, '$1-').replace(/-$/, '');

            lastPairAt.set(chatId, Date.now());

            await bot.sendMessage(chatId,
                `🔐 *PAIR CODE KING-MD*\n\nTon code :\n\`${formatted}\`\n\nOuvre WhatsApp → Appareils connectés → Connecter un appareil → utiliser le code de liaison, puis saisis ce code.\n\n⚠️ Ne partage pas ce code.`,
                { parse_mode: 'Markdown' }
            );
        } catch (e) {
            // Never keep a broken socket in memory after a failed pairing attempt.
            sessions.delete(number);
            console.error(`❌ Pairing Telegram (${number}):`, e.stack || e.message);
            await bot.sendMessage(chatId, `❌ Impossible de générer le Pair Code pour le moment.

Détail : ${e.message || 'erreur inconnue'}

Tu peux réessayer maintenant.`);
        } finally {
            pending.delete(number);
        }
    });

    bot.on('polling_error', (error) => {
        console.error('❌ Telegram polling:', error.message);
    });

    console.log('🤖 Bot Telegram KING-MD démarré.');
    return bot;
}

module.exports = { createTelegramBot };
