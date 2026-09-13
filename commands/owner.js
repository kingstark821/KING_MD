module.exports = {
    name: 'owner',
    description: 'Affiche le contact du propriétaire du bot',
    async execute({ sock, m, from }) {
        const text = [
            '👑 *Contact du propriétaire*',
            '━━━━━━━━━━━━━━━━━━━━',
            '✈️ Telegram : https://t.me/king_stark821',
        ].join('\n');
        await sock.sendMessage(from, { text }, { quoted: m });
    },
};
