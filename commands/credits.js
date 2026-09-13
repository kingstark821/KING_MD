const { getSettings } = require('../lib/botSettings');

module.exports = {
    name: 'credits',
    description: 'Affiche les crédits du bot',
    async execute({ sock, m, from }) {
        const s = getSettings();
        const text = [
            '👑 *KING-MD*',
            '━━━━━━━━━━━━━━━━━━━━',
            `Nom : ${s.botName}`,
            `Créé par : ${s.ownerName}`,
            '⚡ Propulsé par KING BRAND',
        ].join('\n');
        await sock.sendMessage(from, { text }, { quoted: m });
    },
};
