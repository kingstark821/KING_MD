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
        browser: Browsers.macOS('Chrome'),
        printQRInTerminal: false,
        markOnlineOnConnect: false,
        syncFullHistory: false,
        connectTimeoutMs: 60000,
    });

    // Pairing code must be requested only after Baileys has started
    // the connection. Expose a small readiness promise for Telegram.
    let resolvePairingReady;
    let rejectPairingReady;
    const pairingReady = new Promise((resolve, reject) => {
        resolvePairingReady = resolve;
        rejectPairingReady = reject;
    });
    let pairingReadyDone = false;
    const pairingTimeout = setTimeout(() => {
        if (!pairingReadyDone) {
            pairingReadyDone = true;
            rejectPairingReady(new Error('WhatsApp socket did not become ready for pairing within 20 seconds.'));
        }
    }, 20000);
    sock.__pairingReady = pairingReady;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (!state.creds.registered && (connection === 'connecting' || qr) && !pairingReadyDone) {
            pairingReadyDone = true;
            clearTimeout(pairingTimeout);
            resolvePairingReady();
        }

        if (connection === 'open') {
            console.log(`🟢 WhatsApp connecté : ${number}`);
            sendConnectionConfirmation(sock).catch((e) => console.error(e.message));
        }
        if (connection === 'close') {
            if (!state.creds.registered && !pairingReadyDone) {
                pairingReadyDone = true;
                clearTimeout(pairingTimeout);
                rejectPairingReady(new Error('WhatsApp connection closed before pairing was ready.'));
            }
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
