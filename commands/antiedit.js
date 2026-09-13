const { checkGroupPermissions } = require('../lib/groupHelpers');
const { setToggle, isToggled } = require('../lib/groupSettings');

// ⚠️ Comme .antidelete : ce toggle ne fait que régler le comportement, la détection
// des messages édités se fait dans index.js. WhatsApp/Baileys représentent un
// message édité de façons qui varient selon la version — non vérifié en conditions
// réelles ici, à tester après déploiement.
module.exports = {
    name: 'antiedit',
    description: "Signale l'original d'un message édité dans le groupe : .antiedit on / .antiedit off",
    async execute({ sock, m, from, args }) {
        const perm = await checkGroupPermissions(sock, m, from);
        if (!perm.ok) return sock.sendMessage(from, { text: perm.reason }, { quoted: m });

        const state = args[0]?.toLowerCase();
        if (state !== 'on' && state !== 'off') {
            const current = isToggled(from, 'antiedit');
            return sock.sendMessage(from, { text: `ℹ️ Anti-édition actuellement : ${current ? 'activé' : 'désactivé'}` }, { quoted: m });
        }
        setToggle(from, 'antiedit', state === 'on');
        await sock.sendMessage(from, { text: `✅ Anti-édition ${state === 'on' ? 'activé' : 'désactivé'}.` }, { quoted: m });
    },
};
