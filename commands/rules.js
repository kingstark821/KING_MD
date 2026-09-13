const { getGroup } = require('../lib/groupSettings');
const { isGroup } = require('../lib/groupHelpers');

module.exports = {
    name: 'rules',
    description: 'Affiche le règlement du groupe',
    async execute({ sock, m, from }) {
        if (!isGroup(from)) {
            return sock.sendMessage(from, { text: '⚠️ Cette commande ne marche que dans un groupe.' }, { quoted: m });
        }
        const rules = getGroup(from).rules;
        if (!rules) {
            return sock.sendMessage(from, { text: "ℹ️ Aucun règlement défini. Un admin peut en ajouter un avec .setrules <texte>" }, { quoted: m });
        }
        await sock.sendMessage(from, { text: `📜 *Règlement du groupe*\n━━━━━━━━━━━━━━━━━━━━\n${rules}` }, { quoted: m });
    },
};
