const { checkGroupPermissions } = require('../lib/groupHelpers');
const { getGroup, updateGroup } = require('../lib/groupSettings');

module.exports = {
    name: 'setrules',
    description: "Définit le règlement du groupe : .setrules <texte>",
    async execute({ sock, m, from, args }) {
        const perm = await checkGroupPermissions(sock, m, from);
        if (!perm.ok) return sock.sendMessage(from, { text: perm.reason }, { quoted: m });

        const text = args.join(' ');
        if (!text) return sock.sendMessage(from, { text: '⚠️ Écris le règlement : .setrules <texte>' }, { quoted: m });

        updateGroup(from, { ...getGroup(from), rules: text });
        await sock.sendMessage(from, { text: '✅ Règlement enregistré. Tape .rules pour le voir.' }, { quoted: m });
    },
};
