const { isOwner } = require('../lib/permissions');

module.exports = {
    name: 'report',
    description: 'Signale un problème/bug au propriétaire du bot : .report <message>',
    async execute({ sock, m, from, args }) {
        const text = args.join(' ');
        if (!text) return sock.sendMessage(from, { text: '⚠️ Décris le problème : .report <message>' }, { quoted: m });

        const senderJid = m.key.participant || from;
        const ownerNumbers = (process.env.OWNER_NUMBER || '').split(',').filter(Boolean);
        if (!ownerNumbers.length) {
            return sock.sendMessage(from, { text: "❌ Aucun OWNER_NUMBER configuré, impossible de transmettre le signalement." }, { quoted: m });
        }

        const reportText = [
            '🚨 *Nouveau signalement*',
            `De : ${senderJid}`,
            `Chat : ${from}`,
            '━━━━━━━━━━━━━━━━━━━━',
            text,
        ].join('\n');

        for (const number of ownerNumbers) {
            if (isOwner(`${number}@s.whatsapp.net`)) {
                await sock.sendMessage(`${number}@s.whatsapp.net`, { text: reportText }).catch(() => {});
            }
        }

        await sock.sendMessage(from, { text: '✅ Signalement transmis au propriétaire.' }, { quoted: m });
    },
};
