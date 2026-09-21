const fs = require('fs');
const path = require('path');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason,
    Browsers,
} = require('@whiskeysockets/baileys');

const { sendConnectionConfirmation } = require('./connectionMessage');
const { restoreSession } = require('./sessionString');

function normalizeNumber(number) {
    return String(number || '').replace(/\D/g, '');
}

function getSessionDir(number = process.env.SESSION_NUMBER || 'default') {
    const safe = normalizeNumber(number) || 'default';
    return path.join(__dirname, '..', 'session', safe);
}

function restoreSessionIfNeeded(number) {
    const sessionDir = getSessionDir(number);
    if (process.env.SESSION_ID && number === (process.env.SESSION_NUMBER || 'default') && !fs.existsSync(path.join(sessionDir, 'creds.json'))) {
        restoreSession(sessionDir, process.env.SESSION_ID);
    }
    return sessionDir;
}

async function startWhatsApp(onMessage, number = process.env.SESSION_NUMBER || 'default') {
    number = normalizeNumber(number) || 'default';
    const sessionDir = restoreSessionIfNeeded(number);
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        browser: Browsers.macOS('KING-MD'),
        printQRInTerminal: false,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log(`🟢 WhatsApp connecté : ${number}`);
            sendConnectionConfirmation(sock).catch((e) => console.error(e.message));
        }
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const loggedOut = statusCode === DisconnectReason.loggedOut;
            console.log(`🔴 WhatsApp fermé (${number}) — code ${statusCode}. Reconnexion : ${!loggedOut}`);
            if (!loggedOut) {
                setTimeout(() => startWhatsApp(onMessage, number).catch((e) => console.error(`Erreur reconnexion ${number}:`, e.message)), 3000);
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        for (const m of messages) {
            try {
                await onMessage(sock, m);
            } catch (e) {
                console.error(`❌ Erreur traitement message (${number}):`, e.message);
            }
        }
    });

    return sock;
}

module.exports = { startWhatsApp, getSessionDir, normalizeNumber };
