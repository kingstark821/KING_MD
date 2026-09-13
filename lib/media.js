const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function bufferFromMessage(message, type) {
    const stream = await downloadContentFromMessage(message, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

// Récupère le message cité (réponse) ou le message lui-même s'il contient un média
function getMediaMessage(m) {
    const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quoted?.imageMessage) return { message: quoted.imageMessage, type: 'image' };
    if (quoted?.videoMessage) return { message: quoted.videoMessage, type: 'video' };
    if (m.message.imageMessage) return { message: m.message.imageMessage, type: 'image' };
    if (m.message.videoMessage) return { message: m.message.videoMessage, type: 'video' };
    return null;
}

// Un message "vue unique" arrive enveloppé dans viewOnceMessage / viewOnceMessageV2 /
// viewOnceMessageV2Extension selon la version de WhatsApp/Baileys. Cette fonction
// déballe l'enveloppe pour retrouver le média réel à l'intérieur.
// ⚠️ Non testé contre une vraie session WhatsApp (pas d'accès réseau dans cet
// environnement) — à vérifier en conditions réelles, la structure exacte peut varier
// selon la version de @whiskeysockets/baileys installée.
function unwrapViewOnce(message) {
    if (!message) return null;
    const wrapper =
        message.viewOnceMessageV2Extension?.message ||
        message.viewOnceMessageV2?.message ||
        message.viewOnceMessage?.message ||
        message;
    if (wrapper.imageMessage) return { message: wrapper.imageMessage, type: 'image' };
    if (wrapper.videoMessage) return { message: wrapper.videoMessage, type: 'video' };
    if (wrapper.audioMessage) return { message: wrapper.audioMessage, type: 'audio' };
    return null;
}

// Cherche un média (vue unique ou non) dans le message cité, sinon dans le message lui-même.
function findViewOnceMedia(m) {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    return unwrapViewOnce(quoted) || unwrapViewOnce(m.message);
}

module.exports = { bufferFromMessage, getMediaMessage, unwrapViewOnce, findViewOnceMedia };
