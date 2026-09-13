module.exports = {
    name: 'support',
    description: 'Affiche les liens communautaires officiels',
    async execute({ sock, m, from }) {
        const text = [
            '📢 *Liens officiels*',
            '━━━━━━━━━━━━━━━━━━━━',
            '👑 KING GENERATOR — https://king-generator-ai.lovable.app',
            '📢 Chaîne WhatsApp — https://whatsapp.com/channel/0029VbCY0ob7YSd0Oc9d650O',
            '✈️ Telegram — https://t.me/king_stark821',
        ].join('\n');
        await sock.sendMessage(from, { text }, { quoted: m });
    },
};
