const { checkGroupPermissions } = require('../lib/groupHelpers');
const { setToggle, isToggled } = require('../lib/groupSettings');

// ⚠️ Ce toggle contrôle le comportement, mais la détection de suppression réelle
// se fait dans index.js (événement messages.upsert avec un protocolMessage de type
// REVOKE) en s'appuyant sur lib/messageStore.js. Non testé en conditions réelles.
module.exports = {
    name: 'antidelete',
    description: 'Renvoie les messages supprimés dans le groupe : .antidelete on / .antidelete off',
    async execute({ sock, m, from, args }) {
        const perm = await checkGroupPermissions(sock, m, from);
        if (!perm.ok) return sock.sendMessage(from, { text: perm.reason }, { quoted: m });

        const state = args[0]?.toLowerCase();
        if (state !== 'on' && state !== 'off') {
            const current = isToggled(from, 'antidelete');
            return sock.sendMessage(from, { text: `ℹ️ Anti-suppression actuellement : ${current ? 'activé' : 'désactivé'}` }, { quoted: m });
        }
        setToggle(from, 'antidelete', state === 'on');
        await sock.sendMessage(from, { text: `✅ Anti-suppression ${state === 'on' ? 'activé' : 'désactivé'}.` }, { quoted: m });
    },
};
