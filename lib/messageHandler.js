// Tout ce qui concerne le CONTENU d'un message une fois reçu : extraction du texte,
// détection antidelete/antiedit, dispatch vers la bonne commande. La connexion
// Baileys elle-même vit dans lib/whatsapp.js — ce fichier ne s'occupe que de "que
// faire d'un message une fois qu'il arrive".
const { saveMessage, getMessage } = require('./messageStore');
const { getConfig } = require('./config');
const { getSettings } = require('./botSettings');
const { isOwner, isPremium } = require('./permissions');
const { isToggled } = require('./groupSettings');
const { increment: incrementCommandStats } = require('./commandStats');

function extractText(message) {
    return (
        message?.conversation ||
        message?.extendedTextMessage?.text ||
        message?.imageMessage?.caption ||
        message?.videoMessage?.caption ||
        ''
    );
}

// commands : Map<string, {name, execute}> déjà chargée par index.js
function createMessageHandler(commands) {
    return async function handleMessage(sock, m) {
        if (!m.message) return;
        const from = m.key.remoteJid;
        if (!from) return;

        // Déballe les messages "éphémères"/"vue-unique" pour la détection normale des commandes
        const innerMessage =
            m.message.ephemeralMessage?.message ||
            m.message.viewOnceMessageV2?.message ||
            m.message.viewOnceMessage?.message ||
            m.message;

        // ---- .antidelete : détection d'une suppression (protocolMessage type REVOKE) ----
        // ⚠️ Non vérifié en conditions réelles — le type exact peut varier selon la
        // version de Baileys. Si ça ne se déclenche pas, log
        // `JSON.stringify(innerMessage.protocolMessage)` pour voir la vraie valeur.
        if (innerMessage.protocolMessage?.type === 0 /* REVOKE */) {
            const deletedId = innerMessage.protocolMessage.key?.id;
            const cached = deletedId && getMessage(deletedId);
            if (cached && isToggled(from, 'antidelete')) {
                await sock.sendMessage(from, {
                    text: `🗑️ *Message supprimé par* ${cached.sender}:\n${extractText(cached.message) || '(média)'}`,
                }).catch(() => {});
            }
            return;
        }

        // Cache le message (texte + éventuel média vue-unique) pour antidelete/antiedit/.vv
        saveMessage(m.key.id, { message: m.message, from, sender: m.key.participant || from });

        const text = extractText(innerMessage).trim();
        const { prefix } = getConfig();
        if (!text.startsWith(prefix)) return;

        const [cmdName, ...args] = text.slice(prefix.length).trim().split(/\s+/);
        const command = commands.get(cmdName.toLowerCase());
        if (!command) return;

        const senderJid = m.key.participant || from;
        const settings = getSettings();
        if (settings.mode === 'private' && !isOwner(senderJid) && !isPremium(senderJid)) return;

        incrementCommandStats();
        await command.execute({ sock, m, from, args, sender: senderJid });
    };
}

module.exports = { createMessageHandler, extractText };
