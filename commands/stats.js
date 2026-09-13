const { getStats } = require('../lib/commandStats');

module.exports = {
    name: 'stats',
    description: 'Nombre de commandes exécutées depuis le dernier redémarrage',
    async execute({ sock, m, from }) {
        const { count, startedAt } = getStats();
        const uptimeMin = Math.floor((Date.now() - startedAt) / 60000);
        await sock.sendMessage(
            from,
            { text: `📊 *Stats*\n━━━━━━━━━━━━━━━━━━━━\nCommandes exécutées (depuis le dernier redémarrage) : ${count}\nDepuis : ${uptimeMin} min` },
            { quoted: m }
        );
    },
};
