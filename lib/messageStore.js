// Cache mémoire des messages récents (par messageId) pour .antidelete, .antiedit et .vv/.vv2.
//
// ⚠️ Volontairement en mémoire (Map), pas en fichier/DB : ces messages sont éphémères
// par nature (le but est juste de "rattraper" un message supprimé/édité/vue-unique
// pendant que le bot tourne). Ça se vide au redémarrage, ce qui est acceptable ici —
// contrairement aux réglages (config/admin/premium/groupSettings), qui eux DOIVENT
// survivre à un redémarrage.
//
// Nettoyage automatique toutes les 20 min pour éviter une fuite mémoire sur un
// groupe très actif.

const store = new Map(); // messageId -> { message, from, sender, timestamp, isViewOnce }

const MAX_AGE_MS = 60 * 60 * 1000; // 1h

function saveMessage(key, entry) {
    if (!key) return;
    store.set(key, { ...entry, timestamp: Date.now() });
}

function getMessage(key) {
    return store.get(key) || null;
}

function startMessageStoreCleanup() {
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of store) {
            if (now - entry.timestamp > MAX_AGE_MS) store.delete(key);
        }
    }, 20 * 60 * 1000);
}

module.exports = { saveMessage, getMessage, startMessageStoreCleanup };
