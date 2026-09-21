module.exports = {
    name: 'pair',
    description: 'Indique comment obtenir un Pair Code via Telegram',
    async execute({ sock, m, from }) {
        await sock.sendMessage(
            from,
            { text: '🤖 Pour obtenir ton Pair Code WhatsApp, ouvre le bot Telegram @the_kingStark_Bot et utilise :\n\n/pair 509XXXXXXXX\n\nÉcris ton numéro avec l’indicatif pays, sans le +.' },
            { quoted: m }
        );
    },
};
