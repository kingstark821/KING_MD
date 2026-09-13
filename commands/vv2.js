const { bufferFromMessage, findViewOnceMedia } = require('../lib/media');
const { isOwner } = require('../lib/permissions');

// Comme .vv, mais envoie le média en message privé à l'owner plutôt que dans le chat
// (utile dans un groupe pour ne pas réexposer publiquement le contenu).
// ⚠️ Même remarque que .vv : non testé contre une vraie session WhatsApp.
module.exports = {
    name: 'vv2',
    description: '.vv mais envoie le média vue-unique en privé au owner (owner uniquement)',
    async execute({ sock, m, from }) {
        const senderJid = m.key.participant || from;
        if (!isOwner(senderJid)) {
            return sock.sendMessage(from, { text: '⛔ Réservé au propriétaire du bot.' }, { quoted: m });
        }

        const media = findViewOnceMedia(m);
        if (!media) {
            return sock.sendMessage(
                from,
                { text: '⚠️ Réponds à un message "vue unique" (photo/vidéo/audio) avec .vv2' },
                { quoted: m }
            );
        }

        try {
            const buffer = await bufferFromMessage(media.message, media.type);
            const payload =
                media.type === 'image'
                    ? { image: buffer, caption: media.message.caption || '' }
                    : media.type === 'video'
                    ? { video: buffer, caption: media.message.caption || '' }
                    : { audio: buffer, mimetype: media.message.mimetype || 'audio/mp4' };
            await sock.sendMessage(senderJid, payload);
            if (from !== senderJid) {
                await sock.sendMessage(from, { text: '✅ Envoyé en privé.' }, { quoted: m });
            }
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Impossible de récupérer ce média : ${error.message}` }, { quoted: m });
        }
    },
};
